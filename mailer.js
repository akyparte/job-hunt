require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodemailer = require("nodemailer");

const CONTACTS_FILE =
  path.join(__dirname, "contacts.json");

const PROGRESS_FILE =
  path.join(__dirname, "progress.json");

const RESUME_PATH =
  path.resolve(
    __dirname,
    process.env.RESUME_PATH || "./resume.pdf"
  );

const contacts =
  JSON.parse(
    fs.readFileSync(
      CONTACTS_FILE,
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


// -----------------------------------------
// INITIALIZE PROGRESS
// -----------------------------------------

progress.nextContactIndex ??= 0;

progress.account ??= {
  email: "",
  date: "",
  sentToday: 0,
  dailyLimit: 0
};

progress.sent ??= [];
progress.failed ??= [];
progress.skipped ??= [];


// -----------------------------------------
// SAVE PROGRESS
// -----------------------------------------

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


// -----------------------------------------
// DATE
// -----------------------------------------

function getToday() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// -----------------------------------------
// INPUT
// -----------------------------------------

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


// -----------------------------------------
// PASSWORD INPUT
// -----------------------------------------

function askPassword(question) {
  const stdin = process.stdin;

  return new Promise(resolve => {
    process.stdout.write(question);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";

    function onData(key) {

      if (key === "\u0003") {
        process.exit();
      }

      if (
        key === "\r" ||
        key === "\n"
      ) {
        stdin.setRawMode(false);
        stdin.pause();

        stdin.removeListener(
          "data",
          onData
        );

        process.stdout.write("\n");

        resolve(password.trim());

        return;
      }

      if (key === "\u007f") {
        if (password.length > 0) {
          password =
            password.slice(0, -1);
        }

        return;
      }

      password += key;
    }

    stdin.on(
      "data",
      onData
    );
  });
}


// -----------------------------------------
// DAILY COUNTER RESET
// -----------------------------------------

function prepareAccountStats(
  email,
  dailyLimit
) {
  const today =
    getToday();

  // If this is a new account/session
  // or the stored account is different.
  if (
    progress.account.email !== email
  ) {
    progress.account = {
      email,
      date: today,
      sentToday: 0,
      dailyLimit
    };

    saveProgress();

    return;
  }

  // Update configured daily limit.
  progress.account.dailyLimit =
    dailyLimit;

  // New day → reset today's count.
  if (
    progress.account.date !== today
  ) {
    progress.account.date =
      today;

    progress.account.sentToday =
      0;

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
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


// -----------------------------------------
// PRINT STATUS
// -----------------------------------------

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
      Math.max(
        contacts.length -
          progress.nextContactIndex,
        0
      )
    }`
  );
}


function printAccountStatus() {
  const sentToday =
    progress.account.sentToday;

  const dailyLimit =
    progress.account.dailyLimit;

  console.log(
    "\nACCOUNT STATUS"
  );

  console.log(
    "---------------------------------"
  );

  console.log(
    `Account   : ${progress.account.email}`
  );

  console.log(
    `Date      : ${progress.account.date}`
  );

  console.log(
    `Sent today: ${sentToday}/${dailyLimit}`
  );

  console.log(
    `Remaining : ${
      Math.max(
        dailyLimit - sentToday,
        0
      )
    }`
  );

  console.log(
    "---------------------------------\n"
  );
}


// -----------------------------------------
// MAIN
// -----------------------------------------

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


  // -----------------------------------------
  // BASIC VALIDATION
  // -----------------------------------------

  if (!contacts.length) {
    console.log(
      "contacts.json is empty."
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


  // -----------------------------------------
  // ASK ACCOUNT
  // -----------------------------------------

  const email =
    await ask(
      "Enter Gmail account: "
    );


  if (!email) {
    console.log(
      "Gmail account is required."
    );

    return;
  }


  // -----------------------------------------
  // ASK DAILY LIMIT
  // -----------------------------------------

  let dailyLimit;

  while (true) {

    const input =
      await ask(
        "Enter daily limit: "
      );

    dailyLimit =
      Number(input);

    if (
      Number.isInteger(
        dailyLimit
      ) &&
      dailyLimit > 0
    ) {
      break;
    }

    console.log(
      "Please enter a valid positive number."
    );
  }


  // -----------------------------------------
  // ASK WAIT TIME
  // -----------------------------------------

  let waitSeconds;

  while (true) {

    const input =
      await ask(
        "Enter wait seconds: "
      );

    waitSeconds =
      Number(input);

    if (
      Number.isInteger(
        waitSeconds
      ) &&
      waitSeconds >= 0
    ) {
      break;
    }

    console.log(
      "Please enter 0 or a positive number."
    );
  }


  // -----------------------------------------
  // PREPARE ACCOUNT STATS
  // -----------------------------------------

  prepareAccountStats(
    email,
    dailyLimit
  );


  // -----------------------------------------
  // DISPLAY CURRENT PROGRESS
  // -----------------------------------------

  console.log(
    `\nDate: ${getToday()}`
  );

  console.log(
    `Account: ${email}`
  );

  console.log(
    `Daily limit: ${dailyLimit}`
  );

  console.log(
    `Wait: ${waitSeconds} seconds`
  );

  console.log(
    `Total contacts: ${contacts.length}`
  );

  printOverallProgress();

  printAccountStatus();


  // -----------------------------------------
  // DAILY LIMIT CHECK
  // -----------------------------------------

  if (
    progress.account.sentToday >=
    dailyLimit
  ) {

    console.log(
      "\nDaily limit already reached."
    );

    return;
  }


  // -----------------------------------------
  // APP PASSWORD
  // -----------------------------------------

  const password =
    await askPassword(
      `Enter App Password for ${email}: `
    );


  if (!password) {
    console.log(
      "App Password is required."
    );

    return;
  }


  // -----------------------------------------
  // CREATE GMAIL TRANSPORTER
  // -----------------------------------------

  const transporter =
    nodemailer.createTransport({

      service: "gmail",

      auth: {
        user: email,
        pass: password
      }

    });


  // -----------------------------------------
  // VERIFY GMAIL
  // -----------------------------------------

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


  // -----------------------------------------
  // SEND LOOP
  // -----------------------------------------

  for (
    let i =
      progress.nextContactIndex;

    i < contacts.length;

    i++
  ) {

    // Make sure the date is still current.
    prepareAccountStats(
      email,
      dailyLimit
    );


    // -----------------------------------------
    // DAILY LIMIT
    // -----------------------------------------

    if (
      progress.account.sentToday >=
      dailyLimit
    ) {

      saveProgress();

      console.log(
        "\n================================="
      );

      console.log(
        "Daily limit reached."
      );

      console.log(
        `Sent today: ${progress.account.sentToday}/${dailyLimit}`
      );

      console.log(
        "Progress saved."
      );

      console.log(
        "================================="
      );

      return;
    }


    // -----------------------------------------
    // CONTACT
    // -----------------------------------------

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
      `From    : ${email}`
    );

    console.log(
      `Subject : Full Stack Developer | Node.js Backend Developer | Immediate Joiner`
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
      `\nAttachment: ${path.basename(
        RESUME_PATH
      )}`
    );


    // -----------------------------------------
    // USER DECISION
    // -----------------------------------------

    const answer =
      await ask(
        "\n[y] Send  [s] Skip  [q] Quit: "
      );


    // -----------------------------------------
    // QUIT
    // -----------------------------------------

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


    // -----------------------------------------
    // SKIP
    // -----------------------------------------

    if (
      answer.toLowerCase() ===
      "s"
    ) {

      progress.skipped.push({

        contactIndex:
          i,

        name:
          contact.name,

        email:
          contact.email,

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


    // -----------------------------------------
    // INVALID OPTION
    // -----------------------------------------

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


    // -----------------------------------------
    // SEND
    // -----------------------------------------

    try {

      console.log(
        "\nSending..."
      );


      const info =
        await transporter.sendMail({

          from:
            email,

          to:
            contact.email,

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


      // -----------------------------------------
      // UPDATE SENT COUNT
      // -----------------------------------------

      progress.account.sentToday++;


      // -----------------------------------------
      // SAVE SENT RECORD
      // -----------------------------------------

      progress.sent.push({

        contactIndex:
          i,

        name:
          contact.name,

        email:
          contact.email,

        from:
          email,

        messageId:
          info.messageId,

        sentAt:
          new Date().toISOString()
      });


      // -----------------------------------------
      // NEXT CONTACT
      // -----------------------------------------

      progress.nextContactIndex =
        i + 1;


      saveProgress();


      // -----------------------------------------
      // SUCCESS
      // -----------------------------------------

      console.log(
        "\n✓ Email sent."
      );

      console.log(
        `Message ID: ${info.messageId}`
      );

      console.log(
        `Sent today: ${
          progress.account.sentToday
        }/${dailyLimit}`
      );


      printOverallProgress();


      // -----------------------------------------
      // WAIT
      // -----------------------------------------

      if (
        i < contacts.length - 1 &&
        progress.account.sentToday <
          dailyLimit &&
        waitSeconds > 0
      ) {

        console.log(
          `\nWaiting ${waitSeconds} seconds...`
        );


        for (
          let seconds =
            waitSeconds;

          seconds > 0;

          seconds--
        ) {

          process.stdout.write(
            `\rNext email in ${seconds}s`
          );

          await wait(1000);
        }


        console.log(
          "\n"
        );
      }

    } catch (error) {

      // -----------------------------------------
      // FAILURE
      // -----------------------------------------

      console.error(
        "\n✗ Gmail/email sending error:"
      );

      console.error(
        error.message
      );


      progress.failed.push({

        contactIndex:
          i,

        name:
          contact.name,

        email:
          contact.email,

        from:
          email,

        error:
          error.message,

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


  // -----------------------------------------
  // COMPLETE
  // -----------------------------------------

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