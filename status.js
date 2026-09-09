
const fs = require("fs");
const path = require("path");

const CONTACTS_FILE =
  path.join(__dirname, "contacts.json");

const PROGRESS_FILES = [
  path.join(__dirname, "progress1.json"),
  path.join(__dirname, "progress2.json"),
  path.join(__dirname, "progress3.json"),
  path.join(__dirname, "progress4.json"),
];

const EMAIL_ACCOUNTS = [
  "akshayparte580@gmail.com",
  "akshayparte60@gmail.com",
  "akshayparte0728@gmail.com",
  "parteakshay511@gmail.com",
];

const contacts =
  JSON.parse(
    fs.readFileSync(
      CONTACTS_FILE,
      "utf8"
    )
  );

const progressFiles =
  PROGRESS_FILES.map(
    (file) =>
      JSON.parse(
        fs.readFileSync(
          file,
          "utf8"
        )
      )
  );

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

function getAccountStats(
  email,
  progress
) {
  const today = getToday();

  const stats =
    progress.accountStats?.[email];

  if (!stats) {
    return {
      date: today,
      sentToday: 0,
      dailyLimit: 300
    };
  }

  /*
   * If the stored date is older than today,
   * today's counter should be considered 0.
   *
   * We don't modify progress.json here.
   * The mailer will persist the reset when it runs.
   */
  if (stats.date !== today) {
    return {
      date: today,
      sentToday: 0,
      dailyLimit:
        stats.dailyLimit || 300
    };
  }

  return {
    date: stats.date,
    sentToday: stats.sentToday,
    dailyLimit:
      stats.dailyLimit || 300
  };
}

function printLine() {
  console.log(
    "-----------------------------------------"
  );
}

const total =
  contacts.length;

/*
 * Overall progress from all 4 progress files.
 */
const nextContacts =
  progressFiles.map(
    (progress) =>
      progress.nextContactIndex ?? 0
  );

const nextContact =
  Math.max(...nextContacts, 0);

const sent =
  progressFiles.reduce(
    (total, progress) =>
      total +
      (progress.sent?.length ?? 0),
    0
  );

const failed =
  progressFiles.reduce(
    (total, progress) =>
      total +
      (progress.failed?.length ?? 0),
    0
  );

const skipped =
  progressFiles.reduce(
    (total, progress) =>
      total +
      (progress.skipped?.length ?? 0),
    0
  );

const remaining =
  Math.max(
    total - nextContact,
    0
  );

console.log(
  "\n========================================="
);

console.log(
  "             HR MAILER STATUS"
);

console.log(
  "=========================================\n"
);

console.log(
  `Date              : ${getToday()}`
);

printLine();

console.log(
  `Total contacts    : ${total}`
);

console.log(
  `Overall sent      : ${sent}`
);

console.log(
  `Failed            : ${failed}`
);

console.log(
  `Skipped           : ${skipped}`
);

console.log(
  `Remaining         : ${remaining}`
);

console.log(
  `Next contact      : #${nextContact + 1}`
);

printLine();

console.log(
  "\nACCOUNT STATUS\n"
);

/*
 * Display each hardcoded email
 * with its corresponding progress file.
 */
EMAIL_ACCOUNTS.forEach(
  (email, index) => {

    const progress =
      progressFiles[index];

    const stats =
      getAccountStats(
        email,
        progress
      );

    const remainingToday =
      Math.max(
        stats.dailyLimit -
        stats.sentToday,
        0
      );

    console.log(
      `${index + 1}. ${email}`
    );

    console.log(
      `   Progress file : progress${
        index + 1
      }.json`
    );

    console.log(
      `   Date          : ${stats.date}`
    );

    console.log(
      `   Sent today    : ${stats.sentToday}`
    );

    console.log(
      `   Daily limit   : ${stats.dailyLimit}`
    );

    console.log(
      `   Remaining     : ${remainingToday}`
    );

    console.log();
  }
);

printLine();

/*
 * Show next account index
 * for each progress file.
 */
console.log(
  "\nNEXT ACCOUNT INDEX"
);

progressFiles.forEach(
  (progress, index) => {

    console.log(
      `Progress ${
        index + 1
      } : ${
        progress.nextAccountIndex ?? 0
      }`
    );
  }
);

console.log(
  "\n=========================================\n"
);
