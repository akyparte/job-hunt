const fs = require("fs");
const path = require("path");

const CONTACTS_FILE =
  path.join(__dirname, "contacts.json");

const ACCOUNTS_FILE =
  path.join(__dirname, "accounts.json");

const PROGRESS_FILE =
  path.join(__dirname, "progress.json");

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

const progress =
  JSON.parse(
    fs.readFileSync(
      PROGRESS_FILE,
      "utf8"
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

function getAccountStats(account) {
  const today = getToday();

  const stats =
    progress.accountStats?.[
      account.email
    ];

  if (!stats) {
    return {
      date: today,
      sentToday: 0,
      dailyLimit:
        account.dailyLimit || 300
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
        account.dailyLimit || 300
    };
  }

  return {
    date: stats.date,
    sentToday: stats.sentToday,
    dailyLimit:
      account.dailyLimit || 300
  };
}

function printLine() {
  console.log(
    "-----------------------------------------"
  );
}

const total =
  contacts.length;

const nextContact =
  progress.nextContactIndex ?? 0;

const sent =
  progress.sent?.length ?? 0;

const failed =
  progress.failed?.length ?? 0;

const skipped =
  progress.skipped?.length ?? 0;

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

accounts.forEach(
  (account, index) => {

    const stats =
      getAccountStats(
        account
      );

    const remainingToday =
      Math.max(
        stats.dailyLimit -
        stats.sentToday,
        0
      );

    console.log(
      `${index + 1}. ${account.email}`
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

console.log(
  `Next account index : ${
    progress.nextAccountIndex ?? 0
  }`
);

console.log(
  "\n=========================================\n"
);