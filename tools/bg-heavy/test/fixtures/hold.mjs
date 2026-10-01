import fs from 'node:fs';

const ready = process.argv[2];
const release = process.argv[3];
if (!ready || !release) process.exit(2);
fs.writeFileSync(ready, String(Date.now()));
const deadline = Date.now() + 180000;
while (!fs.existsSync(release)) {
  if (Date.now() > deadline) process.exit(9);
  await new Promise((resolve) => setTimeout(resolve, 200));
}
fs.writeFileSync(`${ready}.done`, String(Date.now()));
