require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodemailer = require("nodemailer");

const CONTACTS_FILE =
  path.resolve(
    __dirname,
    process.env.CONTACTS_FILE || "./contacts.json"
  );

const PROGRESS_FILE =
  path.resolve(
    __dirname,
    process.env.PROGRESS_FILE || "./progress.json"
  );

// -----------------------------------------
// ENV CONFIGURATION
// -----------------------------------------

const GMAIL_USER = process.env.GMAIL_USER;

const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 300);

const WAIT_SECONDS = Number(process.env.WAIT_SECONDS || 30);

const RESUME_PATH = path.resolve(
  __dirname,
  process.env.RESUME_PATH || "./resume.pdf",
);

// -----------------------------------------
// ENV VALIDATION
// -----------------------------------------

if (!GMAIL_USER) {
  throw new Error("GMAIL_USER is missing from .env");
}

if (!GMAIL_APP_PASSWORD) {
  throw new Error("GMAIL_APP_PASSWORD is missing from .env");
}

if (!Number.isInteger(DAILY_LIMIT) || DAILY_LIMIT <= 0) {
  throw new Error("DAILY_LIMIT must be a positive number");
}

if (!Number.isInteger(WAIT_SECONDS) || WAIT_SECONDS < 0) {
  throw new Error("WAIT_SECONDS must be 0 or greater");
}

// -----------------------------------------
// FILE PATHS
// -----------------------------------------

const contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf8"));

let progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));

// -----------------------------------------
// INITIALIZE PROGRESS
// -----------------------------------------

progress.nextContactIndex ??= 0;

progress.account ??= {
  email: "",
  date: "",
  sentToday: 0,
  dailyLimit: 0,
};

progress.sent ??= [];
progress.failed ??= [];
progress.skipped ??= [];

// -----------------------------------------
// SAVE PROGRESS
// -----------------------------------------

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// -----------------------------------------
// DATE
// -----------------------------------------

function getToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// -----------------------------------------
// INPUT
// -----------------------------------------

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();

      resolve(answer.trim());
    });
  });
}

// -----------------------------------------
// DAILY COUNTER RESET
// -----------------------------------------

function prepareAccountStats(email, dailyLimit) {
  const today = getToday();

  // If this is a new account/session
  // or the stored account is different.
  if (progress.account.email !== email) {
    progress.account = {
      email,
      date: today,
      sentToday: 0,
      dailyLimit,
    };

    saveProgress();

    return;
  }

  // Update configured daily limit.
  progress.account.dailyLimit = dailyLimit;

  // New day → reset today's count.
  if (progress.account.date !== today) {
    progress.account.date = today;

    progress.account.sentToday = 0;

    saveProgress();
  }
}

// -----------------------------------------
// EMAIL BODY
// -----------------------------------------

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

// -----------------------------------------
// WAIT
// -----------------------------------------

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// -----------------------------------------
// PRINT STATUS
// -----------------------------------------

function printOverallProgress() {
  console.log(`Overall sent : ${progress.sent.length}`);

  console.log(`Failed       : ${progress.failed.length}`);

  console.log(`Skipped      : ${progress.skipped.length}`);

  console.log(
    `Remaining    : ${Math.max(
      contacts.length - progress.nextContactIndex,
      0,
    )}`,
  );
}

function printAccountStatus() {
  const sentToday = progress.account.sentToday;

  const dailyLimit = progress.account.dailyLimit;

  console.log("\nACCOUNT STATUS");

  console.log("---------------------------------");

  console.log(`Account   : ${progress.account.email}`);

  console.log(`Date      : ${progress.account.date}`);

  console.log(`Sent today: ${sentToday}/${dailyLimit}`);

  console.log(`Remaining : ${Math.max(dailyLimit - sentToday, 0)}`);

  console.log("---------------------------------\n");
}

// -----------------------------------------
// MAIN
// -----------------------------------------

async function main() {
  console.log("\n=================================");

  console.log("             HR MAILER");

  console.log("=================================\n");

  // -----------------------------------------
  // BASIC VALIDATION
  // -----------------------------------------

  if (!contacts.length) {
    console.log("contacts.json is empty.");

    return;
  }

  if (!fs.existsSync(RESUME_PATH)) {
    throw new Error(`Resume not found: ${RESUME_PATH}`);
  }

  // -----------------------------------------
  // ACCOUNT FROM ENV
  // -----------------------------------------

  const email = GMAIL_USER;

  const dailyLimit = DAILY_LIMIT;

  const waitSeconds = WAIT_SECONDS;

  console.log(`Account: ${email}`);

  console.log(`Daily limit: ${dailyLimit}`);

  console.log(`Wait: ${waitSeconds} seconds`);

  console.log(`Total contacts: ${contacts.length}`);

  // -----------------------------------------
  // PREPARE ACCOUNT STATS
  // -----------------------------------------

  prepareAccountStats(email, dailyLimit);

  // -----------------------------------------
  // DISPLAY CURRENT PROGRESS
  // -----------------------------------------

  console.log(`\nDate: ${getToday()}`);

  printOverallProgress();

  printAccountStatus();

  // -----------------------------------------
  // DAILY LIMIT CHECK
  // -----------------------------------------

  if (progress.account.sentToday >= dailyLimit) {
    console.log("\nDaily limit already reached.");

    return;
  }

  // -----------------------------------------
  // CREATE GMAIL TRANSPORTER
  // -----------------------------------------

  const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  // -----------------------------------------
  // VERIFY GMAIL
  // -----------------------------------------

  try {
    await transporter.verify();

    console.log("\n✓ Gmail authentication successful.");
  } catch (error) {
    console.error("\n✗ Gmail authentication failed:");

    console.error(error.message);

    return;
  }

  // -----------------------------------------
  // SEND LOOP
  // -----------------------------------------

  for (let i = progress.nextContactIndex; i < contacts.length; i++) {
    // Make sure the date is still current.
    prepareAccountStats(email, dailyLimit);

    // -----------------------------------------
    // DAILY LIMIT
    // -----------------------------------------

    if (progress.account.sentToday >= dailyLimit) {
      saveProgress();

      console.log("\n=================================");

      console.log("Daily limit reached.");

      console.log(`Sent today: ${progress.account.sentToday}/${dailyLimit}`);

      console.log("Progress saved.");

      console.log("=================================");

      return;
    }

    // -----------------------------------------
    // CONTACT
    // -----------------------------------------

    const contact = contacts[i];

    console.log("\n---------------------------------");

    console.log(`Contact ${i + 1}/${contacts.length}`);

    console.log("---------------------------------");

    console.log(`Name    : ${contact.name}`);

    console.log(`Email   : ${contact.email}`);

    console.log(`From    : ${email}`);

    console.log(
      "Subject : Full Stack Developer | Node.js Backend Developer | Immediate Joiner",
    );

    console.log("\nBODY:\n");

    console.log(createBody(contact.name));

    console.log(`\nAttachment: ${path.basename(RESUME_PATH)}`);

    // -----------------------------------------
    // USER DECISION
    // -----------------------------------------

    const answer = await ask("\n[y] Send  [s] Skip  [q] Quit: ");

    // -----------------------------------------
    // QUIT
    // -----------------------------------------

    if (answer.toLowerCase() === "q") {
      saveProgress();

      console.log("\nStopped. Progress saved.");

      return;
    }

    // -----------------------------------------
    // SKIP
    // -----------------------------------------

    if (answer.toLowerCase() === "s") {
      progress.skipped.push({
        contactIndex: i,

        name: contact.name,

        email: contact.email,

        skippedAt: new Date().toISOString(),
      });

      progress.nextContactIndex = i + 1;

      saveProgress();

      console.log("Skipped.");

      continue;
    }

    // -----------------------------------------
    // INVALID OPTION
    // -----------------------------------------

    if (answer.toLowerCase() !== "y") {
      console.log("Invalid option.");

      i--;

      continue;
    }

    // -----------------------------------------
    // SEND
    // -----------------------------------------

    try {
      console.log("\nSending...");

      const info = await transporter.sendMail({
        from: email,

        to: contact.email,

        subject:
          "Full Stack Developer | " +
          "Node.js Backend Developer | " +
          "Immediate Joiner",

        text: createBody(contact.name),

        attachments: [
          {
            filename: path.basename(RESUME_PATH),

            path: RESUME_PATH,
          },
        ],
      });

      // -----------------------------------------
      // UPDATE SENT COUNT
      // -----------------------------------------

      progress.account.sentToday++;

      // -----------------------------------------
      // SAVE SENT RECORD
      // -----------------------------------------

      progress.sent.push({
        contactIndex: i,

        name: contact.name,

        email: contact.email,

        from: email,

        messageId: info.messageId,

        sentAt: new Date().toISOString(),
      });

      // -----------------------------------------
      // NEXT CONTACT
      // -----------------------------------------

      progress.nextContactIndex = i + 1;

      saveProgress();

      // -----------------------------------------
      // SUCCESS
      // -----------------------------------------

      console.log("\n✓ Email sent.");

      console.log(`Message ID: ${info.messageId}`);

      console.log(`Sent today: ${progress.account.sentToday}/${dailyLimit}`);

      printOverallProgress();

      // -----------------------------------------
      // WAIT
      // -----------------------------------------

      if (
        i < contacts.length - 1 &&
        progress.account.sentToday < dailyLimit &&
        waitSeconds > 0
      ) {
        console.log(`\nWaiting ${waitSeconds} seconds...`);

        for (let seconds = waitSeconds; seconds > 0; seconds--) {
          process.stdout.write(`\rNext email in ${seconds}s`);

          await wait(1000);
        }

        console.log("\n");
      }
    } catch (error) {
      // -----------------------------------------
      // FAILURE
      // -----------------------------------------

      console.error("\n✗ Gmail/email sending error:");

      console.error(error.message);

      progress.failed.push({
        contactIndex: i,

        name: contact.name,

        email: contact.email,

        from: email,

        error: error.message,

        failedAt: new Date().toISOString(),
      });

      saveProgress();

      console.log("\nFailure saved to progress.json.");

      console.log("Script stopped.");

      return;
    }
  }

  // -----------------------------------------
  // COMPLETE
  // -----------------------------------------

  console.log("\n=================================");

  console.log("All contacts processed.");

  console.log("=================================");
}

// -----------------------------------------
// START
// -----------------------------------------

main().catch((error) => {
  console.error("\nFATAL ERROR:");

  console.error(error.message);

  process.exit(1);
});
