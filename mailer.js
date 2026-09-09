require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodemailer = require("nodemailer");

const AccountManager =
  require("./account-manager");

const CONTACTS_FILE =
  path.join(__dirname, "contacts.json");

const ACCOUNTS_FILE =
  path.join(__dirname, "accounts.json");

const PROGRESS_FILE =
  path.join(__dirname, "progress.json");

const RESUME_PATH =
  path.resolve(
    __dirname,
    process.env.RESUME_PATH ||
      "./resume.pdf"
  );

const WAIT_SECONDS =
  Number(
    process.env.WAIT_SECONDS || 25
  );

const contacts =
  JSON.parse(
    fs.readFileSync(
      CONTACTS_FILE,
      "utf8"
    )
  );

const accounts =
  JSON.parse(
    fs.readFileSync(
      ACCOUNTS_FILE,
      "utf8"
    )
  );

let progress =
  JSON.parse(
    fs.readFileSync(
      PROGRESS_FILE,
      "utf8"
    )
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
    JSON.stringify(
      progress,
      null,
      2
    )
  );
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const rl =
    readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

  return new Promise(resolve => {
    rl.question(
      question,
      answer => {
        rl.close();
        resolve(
          answer.trim()
        );
      }
    );
  });
}

function printAccountStatus(
  accountManager
) {
  console.log(
    "\nACCOUNT STATUS"
  );

  console.log(
    "---------------------------------"
  );

  for (
    const account of accounts
  ) {
    const status =
      accountManager.getStatus(
        account
      );

    console.log(
      `${status.email} | ` +
      `${status.sentToday}/` +
      `${status.dailyLimit} today`
    );
  }

  console.log(
    "---------------------------------\n"
  );
}

function printOverallProgress() {
  console.log(
    `Overall sent : ${progress.sent.length}`
  );

  console.log(
    `Failed       : ${progress.failed.length}`
  );

  console.log(
    `Skipped      : ${progress.skipped.length}`
  );

  console.log(
    `Remaining    : ${
      contacts.length -
      progress.nextContactIndex
    }`
  );
}

async function selectAccount(
  accountManager
) {
  console.log(
    "\nAvailable accounts:\n"
  );

  accounts.forEach(
    (account, index) => {
      const status =
        accountManager.getStatus(
          account
        );

      console.log(
        `${index + 1}. ` +
        `${account.email} | ` +
        `${status.sentToday}/` +
        `${status.dailyLimit} today`
      );
    }
  );

  while (true) {
    const answer =
      await ask(
        "\nSelect account: "
      );

    const index =
      Number(answer) - 1;

    if (
      Number.isInteger(index) &&
      accounts[index]
    ) {
      return accounts[index];
    }

    console.log(
      "Invalid account."
    );
  }
}

async function main() {
  console.log(
    "\n================================="
  );

  console.log(
    "             HR MAILER"
  );

  console.log(
    "=================================\n"
  );

  if (!contacts.length) {
    console.log(
      "contacts.json is empty."
    );

    return;
  }

  if (!accounts.length) {
    console.log(
      "accounts.json is empty."
    );

    return;
  }

  if (
    !fs.existsSync(
      RESUME_PATH
    )
  ) {
    throw new Error(
      `Resume not found: ${RESUME_PATH}`
    );
  }

  const accountManager =
    new AccountManager(
      accounts,
      progress,
      saveProgress
    );

  console.log(
    `Date: ${getToday()}`
  );

  console.log(
    `Total contacts: ${contacts.length}`
  );

  printOverallProgress();

  printAccountStatus(
    accountManager
  );

  const account =
    await selectAccount(
      accountManager
    );

  const status =
    accountManager.getStatus(
      account
    );

  if (
    status.sentToday >=
    status.dailyLimit
  ) {
    console.log(
      `\n${account.email} has ` +
      `already reached today's ` +
      `configured limit.`
    );

    return;
  }

  const password =
    await ask(
      `\nEnter App Password for ` +
      `${account.email}: `
    );

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: account.email,
        pass: password
      }
    });

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

  for (
    let i =
      progress.nextContactIndex;

    i < contacts.length;

    i++
  ) {
    const currentStatus =
      accountManager.getStatus(
        account
      );

    if (
      currentStatus.sentToday >=
      currentStatus.dailyLimit
    ) {
      saveProgress();

      console.log(
        "\nDaily configured limit reached."
      );

      return;
    }

    const contact =
      contacts[i];

    console.log(
      "\n---------------------------------"
    );

    console.log(
      `Contact ${i + 1}/${contacts.length}`
    );

    console.log(
      "---------------------------------"
    );

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
      `Subject : ` +
      `Full Stack Developer | ` +
      `Node.js Backend Developer | ` +
      `Immediate Joiner`
    );

    console.log(
      "\nBODY:\n"
    );

    console.log(
      createBody(
        contact.name
      )
    );

    console.log(
      `\nAttachment: ` +
      `${path.basename(
        RESUME_PATH
      )}`
    );

    const answer =
      await ask(
        "\n[y] Send  [s] Skip  [q] Quit: "
      );

    if (
      answer.toLowerCase() ===
      "q"
    ) {
      saveProgress();

      console.log(
        "\nStopped. Progress saved."
      );

      return;
    }

    if (
      answer.toLowerCase() ===
      "s"
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

      console.log(
        "Skipped."
      );

      continue;
    }

    if (
      answer.toLowerCase() !==
      "y"
    ) {
      console.log(
        "Invalid option."
      );

      i--;

      continue;
    }

    try {
      console.log(
        "\nSending..."
      );

      const info =
        await transporter.sendMail({
          from: account.email,

          to: contact.email,

          subject:
            "Full Stack Developer | " +
            "Node.js Backend Developer | " +
            "Immediate Joiner",

          text:
            createBody(
              contact.name
            ),

          attachments: [
            {
              filename:
                path.basename(
                  RESUME_PATH
                ),

              path:
                RESUME_PATH
            }
          ]
        });

      accountManager.incrementSent(
        account
      );

      progress.sent.push({
        contactIndex: i,
        name: contact.name,
        email: contact.email,
        from: account.email,
        messageId:
          info.messageId,
        sentAt:
          new Date().toISOString()
      });

      progress.nextContactIndex =
        i + 1;

      saveProgress();

      console.log(
        "\n✓ Email sent."
      );

      console.log(
        `Message ID: ${info.messageId}`
      );

      printOverallProgress();

      const updatedStatus =
        accountManager.getStatus(
          account
        );

      console.log(
        `\n${account.email}: ` +
        `${updatedStatus.sentToday}/` +
        `${updatedStatus.dailyLimit} today`
      );

      if (
        i < contacts.length - 1 &&
        updatedStatus.sentToday <
          updatedStatus.dailyLimit
      ) {
        console.log(
          `\nWaiting ${WAIT_SECONDS} ` +
          `seconds...`
        );

        for (
          let seconds =
            WAIT_SECONDS;
          seconds > 0;
          seconds--
        ) {
          process.stdout.write(
            `\rNext email in ` +
            `${seconds}s`
          );

          await wait(1000);
        }

        console.log(
          "\n"
        );
      }

    } catch (error) {
      /*
       * IMPORTANT:
       * Do not automatically retry a Gmail
       * sending error.
       */

      console.error(
        "\n✗ Gmail/email sending error:"
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

      console.log(
        "Script stopped."
      );

      return;
    }
  }

  console.log(
    "\n================================="
  );

  console.log(
    "All contacts processed."
  );

  console.log(
    "================================="
  );
}

main().catch(error => {
  console.error(
    "\nFATAL ERROR:"
  );

  console.error(
    error.message
  );

  process.exit(1);
});