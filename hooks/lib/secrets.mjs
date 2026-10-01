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
