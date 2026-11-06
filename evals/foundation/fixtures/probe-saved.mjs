import fs from 'node:fs';
const submission = JSON.parse(fs.readFileSync(new URL('./submission.json', import.meta.url), 'utf8'));
const saved = JSON.parse(fs.readFileSync(new URL('./saved-items.json', import.meta.url), 'utf8'));
console.log(JSON.stringify({ operationId: submission.operationId, submitted: submission.status, saved: saved.some(item => item.operationId === submission.operationId) }));
