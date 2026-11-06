import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { sanitize } from '../../hooks/lib/secrets.mjs';

// Detached operation owner. It can finish after its controller exits.
const [receiptPath, serialized] = process.argv.slice(2);
const request = JSON.parse(serialized);
const limit = 128000;
let stdout = '', stderr = '', truncated = false, settled = false;
const keep = (previous, bytes) => { const next = previous + bytes.toString('utf8'); if (next.length > limit) truncated = true; return next.slice(0, limit); };
function finish(result) {
  if (settled) return;
  settled = true;
  const temporary = `${receiptPath}.result`;
  fs.writeFileSync(temporary, JSON.stringify({ operationId: request.operationId, fingerprint: request.fingerprint, result: { ...result, stdout: sanitize(stdout).slice(0, limit), stderr: sanitize(stderr).slice(0, limit), outputTruncated: truncated } }));
  fs.renameSync(temporary, receiptPath);
}
try {
  const child = spawn(request.command.file, request.command.args, { cwd: request.cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(request.methodContextPath ? { BGZFLOW_METHOD_CONTEXT_FILE: request.methodContextPath } : {}) } });
  child.stdout.on('data', bytes => { stdout = keep(stdout, bytes); });
  child.stderr.on('data', bytes => { stderr = keep(stderr, bytes); });
  child.on('error', error => finish({ status: 'completed', exitCode: null, error: sanitize(error.message) }));
  child.on('close', (exitCode, signal) => finish({ status: 'completed', exitCode, signal }));
} catch (error) { finish({ status: 'uncertain', reason: sanitize(error.message) }); }
