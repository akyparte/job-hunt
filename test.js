
const fs = require("fs");
const path = require("path");

// -----------------------------------------
// CONFIGURATION
// -----------------------------------------

const INPUT_FILE =
  path.join(__dirname, "contacts.json");

const NUMBER_OF_PARTS = 4;

// -----------------------------------------
// READ CONTACTS
// -----------------------------------------

if (!fs.existsSync(INPUT_FILE)) {
  throw new Error(
    `Contacts file not found: ${INPUT_FILE}`
  );
}

const contacts =
  JSON.parse(
    fs.readFileSync(
      INPUT_FILE,
      "utf8"
    )
  );

// -----------------------------------------
// VALIDATE
// -----------------------------------------

if (!Array.isArray(contacts)) {
  throw new Error(
    "contacts.json must contain a JSON array."
  );
}

if (contacts.length === 0) {
  throw new Error(
    "contacts.json is empty."
  );
}

console.log(
  `Total contacts: ${contacts.length}`
);

// -----------------------------------------
// CALCULATE PART SIZES
// -----------------------------------------

const baseSize =
  Math.floor(
    contacts.length / NUMBER_OF_PARTS
  );

const remainder =
  contacts.length % NUMBER_OF_PARTS;

// -----------------------------------------
// CREATE 4 FILES
// -----------------------------------------

let startIndex = 0;

for (
  let part = 1;
  part <= NUMBER_OF_PARTS;
  part++
) {

  // First `remainder` files get one
  // extra contact.
  const partSize =
    baseSize +
    (part <= remainder ? 1 : 0);

  const endIndex =
    startIndex + partSize;

  const partContacts =
    contacts.slice(
      startIndex,
      endIndex
    );

  const outputFile =
    path.join(
      __dirname,
      `contacts${part}.json`
    );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      partContacts,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `contacts${part}.json → ${partContacts.length} contacts`
  );

  startIndex =
    endIndex;
}

// -----------------------------------------
// COMPLETE
// -----------------------------------------

console.log(
  "\n✓ Contacts successfully split into 4 files."
);
