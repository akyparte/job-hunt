require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodemailer = require("nodemailer");

const CONTACTS_FILE = path.join(__dirname, "contacts.json");
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");
const PROGRESS_FILE = path.join(__dirname, "progress.json");

const RESUME_PATH = path.resolve(
  __dirname,
  process.env.RESUME_PATH || "./resume.pdf"
);

const WAIT_TIME = 15 * 1000;

const SUBJECT =
  "Full Stack Developer | Node.js Backend Developer | Immediate Joiner";

const contacts = JSON.parse(
  fs.readFileSync(CONTACTS_FILE, "utf8")
);

const accounts = JSON.parse(
  fs.readFileSync(ACCOUNTS_FILE, "utf8")
);

let progress = JSON.parse(
  fs.readFileSync(PROGRESS_FILE, "utf8")
);

progress.nextContactIndex ??= 0;
progress.nextAccountIndex ??= 0;
progress.accountStats ??= {};
progress.sent ??= [];
progress.failed ??= [];
progress.skipped ??= [];

function saveProgress() {
  fs.writeFileSync(
    PROGRESS_FILE,
    JSON.stringify(progress, null, 2)
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getAccountStats(account) {
  const currentDate = today();

  if (!progress.accountStats[account.email]) {
    progress.accountStats[account.email] = {
      date: currentDate,
      sentToday: 0
    };

    saveProgress();

    return progress.accountStats[account.email];
  }

  const stats = progress.accountStats[account.email];

  // New day → reset today's counter
  if (stats.date !== currentDate) {
    stats.date = currentDate;
    stats.sentToday = 0;

    saveProgress();
  }

  return stats;
}

function createBody(name) {
  return `Hi ${name},

I’m a Full Stack Developer with 3.7+ years of overall experience, with a strong focus on Node.js backend development and full-stack application development.

I’m currently an Immediate Joiner and actively looking for a suitable opportunity where I can contribute my skills and experience.

Please have a look at my resume and let me know if there are any relevant openings.

Thank you for your time!

Best regards,
Akshay Parte
7021289701`;
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function chooseAccount() {
  console.log("\nAvailable accounts:\n");

  accounts.forEach((account, index) => {
    const stats = getAccountStats(account);

    console.log(
      `${index + 1}. ${account.email} | ` +
      `${stats.sentToday}/${account.dailyLimit} today`
    );
  });

  while (true) {
    const answer = await ask(
      "\nSelect account: "
    );

    const index = Number(answer) - 1;

    if (
      Number.isInteger(index) &&
      accounts[index]
    ) {
      return {
        account: accounts[index],
        index
      };
    }

    console.log("Invalid account.");
  }
}

function createTransporter(account, password) {
  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: account.email,
      pass: password
    }
  });
}

function printProgress(account) {
  const stats = getAccountStats(account);

  console.log("\n=================================");
  console.log("             PROGRESS");
  console.log("=================================");

  console.log(
    `Total contacts : ${contacts.length}`
  );

  console.log(
    `Overall sent   : ${progress.sent.length}`
  );

  console.log(
    `Failed         : ${progress.failed.length}`
  );

  console.log(
    `Skipped        : ${progress.skipped.length}`
  );

  console.log(
    `Remaining      : ${
      contacts.length -
      progress.nextContactIndex
    }`
  );

  console.log("---------------------------------");

  console.log(
    `Account        : ${account.email}`
  );

  console.log(
    `Today          : ${stats.sentToday}/${account.dailyLimit}`
  );

  console.log(
    `Date           : ${stats.date}`
  );

  console.log("---------------------------------");

  console.log(
    `Next contact   : #${
      progress.nextContactIndex + 1
    }`
  );

  console.log("=================================\n");
}

async function sendContact(
  transporter,
  account,
  contact,
  contactIndex
) {
  const info = await transporter.sendMail({
    from: account.email,

    to: contact.email,

    subject: SUBJECT,

    text: createBody(contact.name),

    attachments: [
      {
        filename: path.basename(RESUME_PATH),
        path: RESUME_PATH
      }
    ]
  });

  const stats = getAccountStats(account);

  stats.sentToday++;

  progress.sent.push({
    contactIndex,

    name: contact.name,

    email: contact.email,

    from: account.email,

    messageId: info.messageId,

    sentAt: new Date().toISOString()
  });

  progress.nextContactIndex =
    contactIndex + 1;

  saveProgress();

  return info;
}

async function main() {
  console.log("\n=================================");
  console.log("             HR MAILER");
  console.log("=================================\n");

  if (!contacts.length) {
    console.log("No contacts found.");
    return;
  }

  if (!accounts.length) {
    console.log("No sending accounts found.");
    return;
  }

  if (!fs.existsSync(RESUME_PATH)) {
    throw new Error(
      `Resume not found: ${RESUME_PATH}`
    );
  }

  if (
    progress.nextContactIndex >=
    contacts.length
  ) {
    console.log(
      "All contacts have already been processed."
    );

    return;
  }

  const selected =
    await chooseAccount();

  const account =
    selected.account;

  const accountIndex =
    selected.index;

  const stats =
    getAccountStats(account);

  if (
    stats.sentToday >=
    account.dailyLimit
  ) {
    console.log(
      `\n${account.email} has reached ` +
      `its configured daily limit.`
    );

    console.log(
      `Sent today: ${stats.sentToday}`
    );

    return;
  }

  const password =
    await ask(
      `Enter App Password for ${account.email}: `
    );

  const transporter =
    createTransporter(
      account,
      password
    );

  // Verify authentication before starting.
  try {
    await transporter.verify();

    console.log(
      "\n✓ Gmail authentication successful."
    );
  } catch (error) {
    console.error(
      "\n✗ Gmail authentication failed:"
    );

    console.error(
      error.message
    );

    return;
  }

  printProgress(account);

  /*
   * Process contacts sequentially.
   * Each email requires explicit confirmation.
   */
  for (
    let i = progress.nextContactIndex;
    i < contacts.length;
    i++
  ) {
    const stats =
      getAccountStats(account);

    if (
      stats.sentToday >=
      account.dailyLimit
    ) {
      saveProgress();

      console.log(
        "\nDaily configured limit reached."
      );

      console.log(
        `Account: ${account.email}`
      );

      console.log(
        `Sent today: ${stats.sentToday}`
      );

      console.log(
        `Next contact: #${
          progress.nextContactIndex + 1
        }`
      );

      return;
    }

    const contact = contacts[i];

    console.log("\n---------------------------------");

    console.log(
      `Contact ${i + 1}/${contacts.length}`
    );

    console.log("---------------------------------");

    console.log(
      `Name    : ${contact.name}`
    );

    console.log(
      `Email   : ${contact.email}`
    );

    console.log(
      `From    : ${account.email}`
    );

    console.log(
      `Subject : ${SUBJECT}`
    );

    console.log("\nBODY:\n");

    console.log(
      createBody(contact.name)
    );

    console.log(
      `\nAttachment: ${
        path.basename(RESUME_PATH)
      }`
    );

    const answer =
      await ask(
        "\n[y] Send  [s] Skip  [q] Quit: "
      );

    if (
      answer.toLowerCase() === "q"
    ) {
      saveProgress();

      console.log(
        "\nStopped. Progress saved."
      );

      return;
    }

    if (
      answer.toLowerCase() === "s"
    ) {
      progress.skipped.push({
        contactIndex: i,
        name: contact.name,
        email: contact.email,
        skippedAt:
          new Date().toISOString()
      });

      progress.nextContactIndex =
        i + 1;

      saveProgress();

      console.log("Skipped.");

      continue;
    }

    if (
      answer.toLowerCase() !== "y"
    ) {
      console.log(
        "Invalid option."
      );

      i--;

      continue;
    }

    try {
      console.log("\nSending...");

      const info =
        await sendContact(
          transporter,
          account,
          contact,
          i
        );

      console.log(
        "\n✓ Email sent."
      );

      console.log(
        `Message ID: ${info.messageId}`
      );

      printProgress(account);

      /*
       * Wait 15 seconds before the next
       * manually approved send.
       */
      if (
        i < contacts.length - 1
      ) {
        console.log(
          "Waiting 15 seconds..."
        );

        for (
          let seconds = 15;
          seconds > 0;
          seconds--
        ) {
          process.stdout.write(
            `\rNext contact in ${seconds}s`
          );

          await wait(1000);
        }

        console.log("\n");
      }

    } catch (error) {
      console.error(
        "\n✗ Email failed."
      );

      console.error(
        error.message
      );

      progress.failed.push({
        contactIndex: i,

        name: contact.name,

        email: contact.email,

        from: account.email,

        error: error.message,

        failedAt:
          new Date().toISOString()
      });

      saveProgress();

      console.log(
        "\nFailure saved to progress.json."
      );

      const retry =
        await ask(
          "[r] Retry  [s] Skip  [q] Quit: "
        );

      if (
        retry.toLowerCase() === "q"
      ) {
        saveProgress();

        return;
      }

      if (
        retry.toLowerCase() === "s"
      ) {
        progress.skipped.push({
          contactIndex: i,
          name: contact.name,
          email: contact.email,
          skippedAt:
            new Date().toISOString()
        });

        progress.nextContactIndex =
          i + 1;

        saveProgress();
      } else {
        i--;
      }
    }
  }

  console.log(
    "\n✓ All contacts processed."
  );
}

main().catch(error => {
  console.error(
    "\nERROR:",
    error.message
  );

  process.exit(1);
});