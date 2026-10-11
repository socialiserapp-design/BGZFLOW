// Secret files never go to Jev. A sweep (a folder, a glob, a diff) skips them quietly and counts them; a path the
// user names on purpose gets a plain refusal, never a silent send. Everything else still goes through sanitize.
import { readTextArg } from './jev.mjs';

export const SECRET_KINDS = '.env*, Secrets/, *key*, *.pem, *credentials*, id_*';

// True for .env*, anything inside a Secrets folder, and file names holding "key", "credentials", a .pem ending or an
// id_ start (ssh keys). Matching is on path parts, case-insensitive, for both slash styles.
export function isSecretPath(p) {
  if (typeof p !== 'string' || !p.trim()) return false;
  const parts = p.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.' && s !== '..');
  if (!parts.length) return false;
  const base = parts[parts.length - 1];
  if (parts.slice(0, -1).some((d) => /^secrets$/i.test(d))) return true;
  return /^\.env/i.test(base) || /key/i.test(base) || /\.pem$/i.test(base) || /credentials/i.test(base) || /^id_/i.test(base) || /^secrets$/i.test(base);
}

export function secretRefusal(p) {
  return `refused ${p}: it looks like a secret file (${SECRET_KINDS}), so it is never sent to Jev. Ask about a copy with the secrets taken out.`;
}

// Throws the refusal for a named secret path.
export function refuseSecret(p) {
  if (isSecretPath(p)) throw new Error(secretRefusal(p));
}

// readTextArg with the refusal: "--state @.env" is refused, plain text and other files read as before.
export function readEvidenceArg(value, maxChars = 20000) {
  if (typeof value === 'string' && value.startsWith('@')) refuseSecret(value.slice(1));
  return readTextArg(value, maxChars);
}

// Drops whole per-file sections of a git diff whose path is a secret file. Returns the rest and the dropped names.
export function dropSecretDiffs(diffText) {
  const text = String(diffText || '');
  const sections = text.split(/(?=^diff --git )/m);
  const kept = [];
  const dropped = [];
  for (const s of sections) {
    const m = /^diff --git a\/(.+?) b\/(.+)$/m.exec(s);
    if (m && (isSecretPath(m[1]) || isSecretPath(m[2]))) dropped.push(m[2]);
    else kept.push(s);
  }
  return { text: kept.join(''), dropped };
}
