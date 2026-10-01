import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const isLinked = stat => stat.isSymbolicLink() || Boolean((stat.fileAttributes || 0) & 0x400);
export function inside(root, file) {
  const rel = path.relative(root, file);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

// Walk from the canonical project root without following a link in any owned component.
export function ownedPath(projectDir, relative, { directory = false, create = false } = {}) {
  try {
    const root = fs.realpathSync(projectDir), parts = relative.split(/[/\\]/);
    if (parts.some(p => !p || p === '.' || p === '..') || path.isAbsolute(relative)) return undefined;
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      const mustBeDirectory = i < parts.length - 1 || directory;
      let stat;
      try { stat = fs.lstatSync(current); }
      catch (e) {
        if (e.code !== 'ENOENT') throw e;
        if (create && mustBeDirectory) { fs.mkdirSync(current); stat = fs.lstatSync(current); }
        else return mustBeDirectory ? undefined : current;
      }
      if (isLinked(stat) || (stat.isFile() && stat.nlink > 1) || (mustBeDirectory && !stat.isDirectory())) return undefined;
      if (!inside(root, fs.realpathSync(current))) return undefined;
    }
    return current;
  } catch { return undefined; }
}

// CLI storage can be outside a project. Use the same component walk from the drive
// root, so even a linked parent above the nominated storage folder is refused.
export function writablePath(file, { create = false, directory = false } = {}) {
  const absolute = path.resolve(file), root = path.parse(absolute).root;
  const checked = ownedPath(root, path.relative(root, absolute), { create, directory });
  if (!checked) throw new Error(`Refusing linked, hard-linked or unsafe storage target: ${absolute}`);
  if (fs.existsSync(checked) && !directory && !fs.lstatSync(checked).isFile()) {
    throw new Error(`Storage target must be a regular file: ${absolute}`);
  }
  return checked;
}

export function appendOwned(file, bytes) {
  writablePath(file, { create: true });
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0), 0o600);
  try {
    const opened = fs.fstatSync(fd);
    writablePath(file);
    const current = fs.lstatSync(file);
    if (!opened.isFile() || opened.nlink !== 1 || current.dev !== opened.dev || current.ino !== opened.ino) {
      throw new Error('Storage identity changed before append');
    }
    fs.writeFileSync(fd, bytes);
  } finally { fs.closeSync(fd); }
}

export function writeOwnedFile(file, bytes) {
  writablePath(file, { create: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  try {
    writablePath(file);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) { writablePath(temporary); fs.unlinkSync(temporary); }
  }
}

export function withOwnedLock(file, action, lock = `${file}.lock`) {
  writablePath(file, { create: true });
  writablePath(lock);
  let fd;
  try { fd = fs.openSync(lock, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Storage writer already holds the lock: ${lock}`);
    throw error;
  }
  const identity = fs.fstatSync(fd);
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    writablePath(file);
    return action();
  } finally {
    fs.closeSync(fd);
    writablePath(lock);
    const current = fs.lstatSync(lock);
    if (current.dev !== identity.dev || current.ino !== identity.ino) throw new Error('Storage lock identity changed');
    fs.unlinkSync(lock);
  }
}
