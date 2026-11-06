// Credential shapes inside URLs: scheme://userinfo@host and secret-looking query parameters.
//
// Rule: tell a username apart from a token before raising an alarm.
//   flagged   user:password@host        (any non-empty password part)
//   flagged   token-format userinfo     (ghp_ gho_ ghu_ ghs_ ghr_ github_pat_ glpat- xoxb- xoxp- xai- sk- sk_live_ npm_ AIza ya29. AKIA...,
//                                        or a long high-entropy string of 30+ characters)
//   flagged   a token-shaped value in a token or api-key query parameter, and any real value in a
//             password, secret or client-secret query parameter
//   NOT       someuser@host, git@host   (a username alone is not a secret)
//   NOT       user:${TOKEN}@host, user:<token>@host   (a reference or placeholder is not a secret)
//   NOT       ?page=2, ?key=short       (a short or ordinary parameter value is not a token)
//
// Findings never carry the secret itself, only its kind, host and (for a query) the parameter name, so callers can log them.
//
// sanitize(text) and sanitizeRecord(obj) at the end of this file are the one masker for anything that leaves the
// machine (every Jev state) or is written to a ledger: PEM blocks, tokens, passwords in every common spelling,
// emails and phone numbers.

const TOKEN_PREFIX = /^(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|xox[bp]-|xai-|sk-|sk_live_|sk_test_|rk_live_|npm_|AIza|ya29\.|A[KS]IA[0-9A-Z]{8})/;
const PLACEHOLDER = /^(?:<[^>]*>|\{\{.*\}\}|\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|%[A-Za-z_][A-Za-z0-9_]*%|\[[^\]]*\]|\{[^}]*\})$/;
const TOKEN_ALPHABET = /^[A-Za-z0-9_\-+/=.~]+$/;
// Parameters whose value is a credential by name alone, and parameters whose value must also look like a token.
const ALWAYS_SECRET_PARAM = /^(?:password|passwd|pwd|secret|client[_-]?secret)$/i;
const TOKEN_PARAM = /^(?:token|access[_-]?token|id[_-]?token|refresh[_-]?token|private[_-]?token|api[_-]?key|apikey|x-api-key|key|auth|authorization|bearer)$/i;

function entropyBitsPerChar(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

// A long random-looking string: 30+ characters, token alphabet, at least one digit and one
// letter (so a long hyphenated username made of words is not mistaken for a token).
export function looksHighEntropy(value) {
  if (typeof value !== 'string' || value.length < 30) return false;
  if (!TOKEN_ALPHABET.test(value)) return false;
  if (!/[0-9]/.test(value) || !/[A-Za-z]/.test(value)) return false;
  return entropyBitsPerChar(value) >= 3.0;
}

export function isPlaceholder(value) {
  return PLACEHOLDER.test(value);
}

export function isTokenShape(value) {
  if (typeof value !== 'string' || !value) return false;
  if (isPlaceholder(value)) return false;
  if (TOKEN_PREFIX.test(value)) return true;
  return looksHighEntropy(value);
}

// userinfo is the text between "scheme://" and the last "@" of the authority.
// Returns null for a harmless value, otherwise 'user:password' or 'token'.
export function classifyUserinfo(userinfo) {
  if (typeof userinfo !== 'string' || !userinfo) return null;
  const colon = userinfo.indexOf(':');
  const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const secret = colon === -1 ? '' : userinfo.slice(colon + 1);
  if (secret) {
    if (isPlaceholder(secret)) return null;
    return 'user:password';
  }
  if (isTokenShape(user)) return 'token';
  return null;
}

// Value of a query parameter that is a credential, or false.
export function isSecretParam(name, value) {
  if (typeof name !== 'string' || typeof value !== 'string' || !value) return false;
  let v = value;
  try {
    v = decodeURIComponent(value);
  } catch {
    // keep the raw value
  }
  if (isPlaceholder(v)) return false;
  if (ALWAYS_SECRET_PARAM.test(name)) return v.length >= 4;
  if (TOKEN_PARAM.test(name)) return isTokenShape(v);
  return false;
}

const SCHEME = /\b([A-Za-z][A-Za-z0-9+.-]{1,15}):\/\//g;

// Every URL-shaped span: { scheme, authorityStart, authority, restStart, rest }. `rest` is the path, query and fragment.
function* urlSpans(text) {
  if (typeof text !== 'string' || !text.includes('://')) return;
  SCHEME.lastIndex = 0;
  let m;
  while ((m = SCHEME.exec(text)) !== null) {
    const authorityStart = m.index + m[0].length;
    const tail = text.slice(authorityStart, authorityStart + 2048);
    const stop = tail.search(/[\s/?#'"`<>)\]]/);
    const authority = stop === -1 ? tail : tail.slice(0, stop);
    const restStart = authorityStart + authority.length;
    const restMatch = text.slice(restStart, restStart + 2048).match(/^[^\s'"`<>)\]]*/);
    yield { scheme: m[1].toLowerCase(), authorityStart, authority, restStart, rest: restMatch ? restMatch[0] : '' };
  }
}

// Yields { kind, scheme, host, start, end } for each credential-shaped URL userinfo in the text.
// start/end cover the userinfo part only (so callers can redact it).
export function findUrlCredentials(text) {
  const out = [];
  for (const span of urlSpans(text)) {
    const at = span.authority.lastIndexOf('@');
    if (at <= 0) continue;
    const kind = classifyUserinfo(span.authority.slice(0, at));
    if (!kind) continue;
    out.push({
      kind,
      scheme: span.scheme,
      host: span.authority.slice(at + 1),
      start: span.authorityStart,
      end: span.authorityStart + at,
    });
  }
  return out;
}

// Yields { kind: 'query-token', scheme, host, param, start, end } for each secret-looking query parameter.
// start/end cover the parameter value only.
export function findQueryCredentials(text) {
  const out = [];
  for (const span of urlSpans(text)) {
    const q = span.rest.indexOf('?');
    if (q === -1) continue;
    const hash = span.rest.indexOf('#', q);
    const query = span.rest.slice(q + 1, hash === -1 ? undefined : hash);
    let offset = span.restStart + q + 1;
    const at = span.authority.lastIndexOf('@');
    for (const pair of query.split('&')) {
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const name = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        if (isSecretParam(name, value)) {
          out.push({
            kind: 'query-token',
            scheme: span.scheme,
            host: span.authority.slice(at + 1),
            param: name,
            start: offset + eq + 1,
            end: offset + pair.length,
          });
        }
      }
      offset += pair.length + 1;
    }
  }
  return out;
}

// Userinfo and query findings together, in text order.
export function findAllUrlCredentials(text) {
  return [...findUrlCredentials(text), ...findQueryCredentials(text)].sort((a, b) => a.start - b.start);
}

export function hasUrlCredentials(text) {
  return findAllUrlCredentials(text).length > 0;
}

// Replace the secret part of every credential-shaped URL with [redacted]; leave harmless URLs alone.
export function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  const found = findAllUrlCredentials(text);
  if (!found.length) return text;
  let result = '';
  let cursor = 0;
  for (const f of found) {
    if (f.start < cursor) continue;
    result += text.slice(cursor, f.start) + '[redacted]';
    cursor = f.end;
  }
  return result + text.slice(cursor);
}

// ---------- sanitize: every text that leaves the machine or lands in a ledger ----------
//
// sanitize(text) applies, in this order:
//   1. whole PEM private-key blocks (BEGIN ... END, or to the end of the text when END is missing), masked as one unit
//   2. maskSecrets: secret-named values and token-shaped words become a marker with only kind and length
//   3. redactSecrets: URL userinfo and secret query parameters
//   4. any URL user:password the URL scanner missed (a password holding '/', '?' or '#')
//   5. curl/wget/http -u / --user user:password
//   6. mysql/mariadb/psql/pg_dump -p<pw>, and the --password flag (with = or a space) on any command
//   7. assignments to a name holding password, passwd, pwd, secret or token (env, ini, YAML, JSON, quoted literals)
//   8. email addresses (example/test/invalid domains, noreply and git@ are kept)
//   9. phone numbers (+<country code> numbers and UK 0-leading numbers)
// It is idempotent: sanitize(sanitize(x)) === sanitize(x). Placeholders (${X}, <x>, [redacted], $X, %X%) stay.
// Every regex is anchored at a word start or bounded, so 60,000 characters of base64 cost milliseconds, not minutes.

const REDACTED = '[redacted]';

// ---- 1. PEM blocks ----
const PEM_BEGIN = /-----BEGIN ([A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?)-----/g;
const PEM_END = /-----END [A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?-----/g;
export function maskPemBlocks(text) {
  const t = String(text ?? '');
  if (!t.includes('-----BEGIN ')) return t;
  let out = '';
  let cursor = 0;
  PEM_BEGIN.lastIndex = 0;
  let m;
  while ((m = PEM_BEGIN.exec(t)) !== null) {
    out += t.slice(cursor, m.index);
    PEM_END.lastIndex = m.index + m[0].length;
    const end = PEM_END.exec(t);
    out += `[${m[1].toLowerCase()} block]`;
    cursor = end ? end.index + end[0].length : t.length;
    PEM_BEGIN.lastIndex = cursor;
  }
  return out + t.slice(cursor);
}

// ---- 2. secret-named values and token-shaped words (maskSecrets) ----
const SECRET_NAME_VALUE = /(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]{0,64}(?:password|passwd|secret|token|api[_-]?key|apikey|private[_-]?key|credential|authorization|bearer)[A-Za-z0-9_.-]{0,64})(\s*[:=]\s*|\s+)(["']?)([^\s"',;)}\]]{8,})/gi;
const PLACEHOLDER_VALUE = /^(?:\$|<|\[|\{|%|process\.env|env\.|os\.environ|ENV\[|your[_-]|example|changeme|xxx|\*{3,}|\.{3})/i;
export const TOKEN_START = /^(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|xox[bp]-|xai-|sk-|sk_live_|sk_test_|rk_live_|npm_|AIza|ya29\.|A[KS]IA)/;
const FILE_EXT = /\.(?:md|mjs|cjs|js|ts|tsx|json|txt|py|yaml|yml)$/i;
// A bare UUID (session and folder names) or a git object id (commits in ledgers) is an identifier, not a secret. Under
// a secret name (token=..., password: ...) it is still masked by the name rules.
const IDENTIFIER = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{40}|[0-9a-f]{64})$/i;
const PLACEHOLDER_WORDS = /(?:your|example|changeme|change_me|placeholder|dummy|sample|replace|insert|todo|fixme|xxxx|here|redacted)/i;

// A hint about a hidden value that shows its shape and never its content: so a judge can tell a generated key from an
// example without seeing either.
export function valueShape(value) {
  const v = String(value ?? '');
  if (PLACEHOLDER_WORDS.test(v)) return 'placeholder-like';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(v)).length;
  if (v.length >= 16 && classes >= 2 && /[0-9]/.test(v)) return 'random-looking';
  if (classes >= 3) return 'random-looking';
  return 'plain text';
}

const isPlaceholderValue = (v) => PLACEHOLDER_VALUE.test(v) || isPlaceholder(v);
const mixedAlnum = (s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s);

// True for a word with slashes (or a file extension) that reads like a path. Base64 (PEM bodies, AWS secrets) is not
// path-like: it holds a '+', or long runs of mixed-case letters and digits between the slashes. Paths usually hold a
// '.', '-', '_' or '~', which base64 never does.
export function pathLike(word) {
  const w = String(word ?? '');
  if (TOKEN_START.test(w)) return false;
  if (/[^A-Za-z0-9+/=]/.test(w)) return true;
  if (w.includes('+')) return false;
  const bare = w.replace(/[/=]/g, '');
  if (bare.length >= 30 && mixedAlnum(bare) && looksHighEntropy(bare)) return false;
  return !w.split('/').some((seg) => seg.length >= 16 && mixedAlnum(seg));
}

export function maskSecrets(text) {
  let t = String(text ?? '');
  t = t.replace(SECRET_NAME_VALUE, (all, name, sep, q, value) => {
    if (isPlaceholderValue(value)) return all;
    if (!/[0-9]/.test(value) && !TOKEN_START.test(value) && value.length < 16) return all;
    return `${name}${sep}${q}<value, ${value.length} chars, ${valueShape(value)}>${q}`;
  });
  t = t.replace(/[A-Za-z0-9_\-+/=.~]{16,}/g, (word) => {
    // A NAME= prefix stays visible: the judge needs the name next to a hidden value.
    const named = /^([A-Za-z_][A-Za-z0-9_.-]*=)(.+)$/.exec(word);
    const head = named ? named[1] : '';
    const w = named ? named[2] : word;
    if (((w.match(/\//g) || []).length >= 2 || FILE_EXT.test(w)) && pathLike(w)) return word;
    if (IDENTIFIER.test(w)) return word;
    if (!isTokenShape(w)) return word;
    const m = TOKEN_START.exec(w);
    return head + (m ? `<token starting ${m[0]}, ${w.length} chars>` : `<secret-shaped token, ${w.length} chars>`);
  });
  return t;
}

// ---- 4. URL user:password the URL scanner missed ----
const URL_USERPASS = /\b([A-Za-z][A-Za-z0-9+.-]{1,15}:\/\/)([^\s:@/'"<>]{1,256}):([^\s@'"<>]{1,512})@/g;
function maskUrlPasswords(t) {
  return t.replace(URL_USERPASS, (all, scheme, user, pw) => (isPlaceholderValue(pw) ? all : `${scheme}${user}:${REDACTED}@`));
}

// ---- 5. -u / --user user:password ----
const USER_FLAG = /(^|[\s"'])(-u|--user)(\s+|=)(["']?)([^\s:"'@]{1,256}):([^\s"']{1,512})\4/g;
function maskUserFlag(t) {
  return t.replace(USER_FLAG, (all, lead, flag, sep, q, user, pw) => {
    if (isPlaceholderValue(pw)) return all;
    if (/^\d+$/.test(user) && /^\d+$/.test(pw)) return all; // docker -u 1000:1000 is a uid:gid
    return `${lead}${flag}${sep}${q}${user}:${REDACTED}${q}`;
  });
}

// ---- 6. database client passwords ----
const DB_CLIENT = /\b(?:mysql|mysqldump|mysqladmin|mysqlsh|mariadb|mariadb-dump|psql|pg_dump|pg_dumpall|pg_restore)\b/i;
const ATTACHED_P = /(^|[\s"'])-p(?=[^\s=-])("[^"\n]{0,512}"|'[^'\n]{0,512}'|[^\s"']{1,512})/g;
const PASSWORD_FLAG = /(--pass(?:word|wd)?)(=|\s+)(["']?)([^\s"']{1,512})\3/gi;
function maskDbPasswords(t) {
  t = t.replace(/[^\n]+/g, (line) => {
    if (!DB_CLIENT.test(line)) return line;
    return line.replace(ATTACHED_P, (all, lead, value) => {
      const v = value.replace(/^["']|["']$/g, '');
      if (!v || isPlaceholderValue(v)) return all;
      return `${lead}-p${REDACTED}`;
    });
  });
  return t.replace(PASSWORD_FLAG, (all, flag, sep, q, value) => {
    if (value.startsWith('-') || isPlaceholderValue(value)) return all;
    return `${flag}${sep}${q}${REDACTED}${q}`;
  });
}

// ---- 7. password / secret / token assignments ----
const ASSIGNMENT = /(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]{0,64}(?:password|passwd|pwd|secret|token)[A-Za-z0-9_.-]{0,64})(["']?)(\s*[:=]\s*)(?:"([^"\n]{0,2048})"|'([^'\n]{0,2048})'|([^\s"'&,;]{1,2048}))/gi;
const NOT_A_SECRET = /^(?:true|false|null|none|nil|undefined|string|number|boolean|required|optional|bool|int|str|object|any)$/i;
// Names that hold a count, a size, a place or a kind, not a secret value.
const NOT_A_SECRET_NAME = /(?:tokens|secrets|passwords|count|len|length|limit|size|max|min|type|kind|name|file|path|dir|url|uri|endpoint|ttl|expiry|expires|budget|usage|cost|chars)$/i;
function maskAssignments(t) {
  return t.replace(ASSIGNMENT, (all, name, nameQuote, sep, dq, sq, bare, offset, whole) => {
    if (NOT_A_SECRET_NAME.test(name)) return all;
    const value = dq ?? sq ?? bare ?? '';
    if (value.length < 6 || isPlaceholderValue(value) || NOT_A_SECRET.test(value)) return all;
    if (/^[=>]/.test(value)) return all; // == / === / => are code, not an assignment
    if (bare !== undefined) {
      if (/[()]/.test(value)) return all; // a call is code
      if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(value)) return all; // a property chain is code
      const next = whole[offset + all.length];
      if (next && /[,;)]/.test(next) && !/[0-9]/.test(value)) return all; // an identifier in an argument list or object
    }
    const quote = dq !== undefined ? '"' : sq !== undefined ? "'" : '';
    return `${name}${nameQuote}${sep}${quote}${REDACTED}${quote}`;
  });
}

// ---- 8. email addresses ----
const EMAIL = /(?<![A-Za-z0-9._%+-])([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24})(?![A-Za-z0-9-])/g;
const SAFE_EMAIL_DOMAIN = /(?:^|\.)(?:example\.(?:com|org|net)|example|invalid|test|localhost)$/i;
function maskEmails(t) {
  return t.replace(EMAIL, (all, local, domain) => {
    if (local.toLowerCase() === 'git') return all; // git@host:org/repo
    if (/no-?reply/i.test(local) || /no-?reply/i.test(domain) || SAFE_EMAIL_DOMAIN.test(domain)) return all;
    return '[email]';
  });
}

// ---- 9. phone numbers ----
const PHONE_INTL = /(?<![\w+])\+\d{1,3}(?:[ -]?\(?\d{1,5}\)?){1,5}(?!\w)/g;
const PHONE_UK = /(?<![\w.:/+-])\(?0\d{2,4}\)?[ -]?\d{3,4}[ -]?\d{3,4}(?![\w.:/-])/g;
const digitsOf = (s) => s.replace(/\D/g, '');
function maskPhones(t) {
  t = t.replace(PHONE_INTL, (all) => {
    const n = digitsOf(all).length;
    return n >= 9 && n <= 15 ? '[phone]' : all;
  });
  return t.replace(PHONE_UK, (all) => {
    const d = digitsOf(all);
    if (d.length < 10 || d.length > 11) return all;
    if (/^(\d)\1+$/.test(d) || '01234567890'.startsWith(d)) return all;
    return '[phone]';
  });
}

export function sanitize(text) {
  if (text === null || text === undefined) return '';
  let t = String(text);
  t = maskPemBlocks(t);
  t = maskSecrets(t);
  t = redactSecrets(t);
  t = maskUrlPasswords(t);
  t = maskUserFlag(t);
  t = maskDbPasswords(t);
  t = maskAssignments(t);
  t = maskEmails(t);
  t = maskPhones(t);
  return t;
}

// A copy of a record with every string field sanitized at any depth (arrays and plain objects). Keys, numbers,
// booleans and null are kept as they are. A cycle becomes '[cycle]' so the copy can always be serialised.
// For ledger rows, bench cards and any other record written to disk or sent out.
export function sanitizeRecord(value, seen = new WeakSet()) {
  if (typeof value === 'string') return sanitize(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[cycle]';
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) return value; // Date, Buffer and the like
  seen.add(value);
  let out;
  if (Array.isArray(value)) out = value.map((v) => sanitizeRecord(v, seen));
  else {
    out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeRecord(v, seen);
  }
  seen.delete(value);
  return out;
}
