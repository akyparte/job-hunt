const fs = require("fs");

const data = JSON.parse(fs.readFileSync("contacts.json", "utf8"));

const seen = new Set();
const unique = [];

for (const obj of data) {
  const key = `${obj.name}|||${obj.email}`;

  if (!seen.has(key)) {
    seen.add(key);
    unique.push(obj);
  }
}

fs.writeFileSync(
  "results.json",
  JSON.stringify(unique, null, 2),
  "utf8"
);

console.log(`Original: ${data.length}`);
console.log(`Unique: ${unique.length}`);
console.log(`Duplicates removed: ${data.length - unique.length}`);