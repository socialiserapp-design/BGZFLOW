import { spawn } from 'node:child_process';
import fs from 'node:fs';

const dest = process.argv[2];
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
  stdio: 'ignore',
});
fs.writeFileSync(dest, String(child.pid));
process.stdout.write('parent-up\n');
setInterval(() => {}, 1000);
