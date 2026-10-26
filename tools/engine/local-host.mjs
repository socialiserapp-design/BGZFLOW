import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const contained = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
// The receipt writer outlives the engine process. Unknown launch outcomes are never replayed.
const runner = String.raw`
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const [receiptPath, requestText] = process.argv.slice(1);
const request = JSON.parse(requestText);
const write = result => { const temporary = receiptPath + '.result'; fs.writeFileSync(temporary, JSON.stringify({ operationId: request.operationId, fingerprint: request.fingerprint, result })); fs.renameSync(temporary, receiptPath); };
let stdout = '', stderr = '', done = false;
const finish = result => { if (!done) { done = true; write(result); } };
try {
  const child = spawn(request.command.file, request.command.args, { cwd: request.cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(request.methodContextPath ? { BGZFLOW_METHOD_CONTEXT_FILE: request.methodContextPath } : {}) } });
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  child.on('error', error => finish({ status: 'completed', exitCode: null, error: error.message, stdout, stderr }));
  child.on('close', (exitCode, signal) => finish({ status: 'completed', exitCode, signal, stdout, stderr }));
} catch (error) { finish({ status: 'uncertain', reason: error.message }); }
`;

/** Trusted local commands, argument arrays, explicit cwd; no shell or ambient project lookup. */
export function createLocalHostAdapter() {
  async function context(request) {
    const root = await fs.realpath(request.projectRoot);
    const directory = path.join(root, '.bgzflow', 'engine', 'operations');
    await fs.mkdir(directory, { recursive: true });
    if (!contained(root, await fs.realpath(directory))) throw new Error('Operation store escapes project.');
    const cwd = await fs.realpath(path.resolve(root, request.command.cwd ?? '.'));
    if (!contained(root, cwd)) throw new Error('Command cwd escapes project.');
    const fingerprint = hash(JSON.stringify({ command: request.command, cwd, ...(request.methodContext ? { methodContextSha256: request.methodContext.sha256 } : {}) }));
    const methodsDirectory = path.join(directory, 'methods');
    if (request.methodContext) {
      await fs.mkdir(methodsDirectory, { recursive: true });
      if (!contained(directory, await fs.realpath(methodsDirectory))) throw new Error('Operation methods escape project.');
    }
    const methodContextPath = request.methodContext ? path.join(methodsDirectory, `${hash(request.operationId)}.json`) : undefined;
    return { directory, cwd, fingerprint, methodContextPath, receipt: path.join(directory, `${hash(request.operationId)}.json`) };
  }
  async function read(ctx, request) {
    try {
      if (ctx.methodContextPath) {
        const actual = await fs.realpath(ctx.methodContextPath);
        if (!contained(ctx.directory, actual) || await fs.readFile(actual, 'utf8') !== JSON.stringify({ methodContext: request.methodContext, guidance: request.guidance })) return { status: 'uncertain', reason: 'Saved operation method bytes differ.' };
      }
      const stored = JSON.parse(await fs.readFile(ctx.receipt, 'utf8'));
      if (stored.operationId !== request.operationId || stored.fingerprint !== ctx.fingerprint) return { status: 'uncertain', reason: 'Operation identity conflicts with its receipt.' };
      return stored.result;
    } catch (error) {
      if (error.code === 'ENOENT') return { status: 'uncertain', reason: 'No receipt; the effect may have started.' };
      throw error;
    }
  }
  return {
    async execute(request) {
      const ctx = await context(request);
      if (ctx.methodContextPath) {
        const bytes = JSON.stringify({ methodContext: request.methodContext, guidance: request.guidance });
        try { await fs.writeFile(ctx.methodContextPath, bytes, { flag: 'wx', mode: 0o600 }); }
        catch (error) {
          if (error.code !== 'EEXIST') throw error;
          const actual = await fs.realpath(ctx.methodContextPath);
          if (!contained(ctx.directory, actual) || await fs.readFile(actual, 'utf8') !== bytes) throw new Error('Operation method context conflicts with saved bytes.');
        }
      }
      try {
        await fs.writeFile(ctx.receipt, JSON.stringify({ operationId: request.operationId, fingerprint: ctx.fingerprint, result: { status: 'uncertain', reason: 'Operation launched; completion not recorded.' } }), { flag: 'wx' });
      } catch (error) { if (error.code === 'EEXIST') return read(ctx, request); throw error; }
      return new Promise(resolve => {
        const child = spawn(process.execPath, ['-e', runner, ctx.receipt, JSON.stringify({ operationId: request.operationId, command: request.command, methodContextPath: ctx.methodContextPath, cwd: ctx.cwd, fingerprint: ctx.fingerprint })], { cwd: ctx.cwd, detached: true, stdio: 'ignore' });
        child.on('error', error => resolve({ status: 'uncertain', reason: error.message }));
        child.on('close', () => { read(ctx, request).then(resolve, error => resolve({ status: 'uncertain', reason: error.message })); });
      });
    },
    async reconcile(request) { return read(await context(request), request); },
    async readArtifact({ projectRoot, path: relative }) {
      const root = await fs.realpath(projectRoot);
      const target = await fs.realpath(path.resolve(root, relative));
      if (!contained(root, target)) throw new Error('Artifact escapes project.');
      return fs.readFile(target);
    },
  };
}
