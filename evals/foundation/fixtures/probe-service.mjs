import fs from 'node:fs';
const pid = Number(fs.readFileSync(new URL('./service.pid', import.meta.url), 'utf8'));
let alive = false;
try { process.kill(pid, 0); alive = true; } catch (error) { if (error.code !== 'ESRCH') throw error; }
console.log(JSON.stringify({ pid, alive, source: 'actual local process check' }));
