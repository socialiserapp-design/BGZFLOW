// Narrow local check retained from the original deterministic write guard.
// Detection is evidence of a credential-shaped value, not proof of validity.
const placeholder=/x{5,}|0{8,}|1234567|example|sample|placeholder|your|dummy|fake|redacted|changeme/i;
const varied=body=>new Set(body).size>=8&&!placeholder.test(body);
export function containsObviousSecret(text){
  const s=String(text||'');
  const pem=/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----([\s\S]+?)-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/.exec(s);
  if(pem&&pem[1].replace(/\s+/g,'').length>=64&&varied(pem[1]))return true;
  for(const m of s.matchAll(/\b(?:sk|rk)_live_([A-Za-z0-9]{16,})/g))if(varied(m[1]))return true;
  for(const m of s.matchAll(/\bghp_([A-Za-z0-9]{36})(?![A-Za-z0-9])/g))if(varied(m[1]))return true;
  for(const m of s.matchAll(/\bgithub_pat_([A-Za-z0-9_]{82})(?![A-Za-z0-9_])/g))if(varied(m[1]))return true;
  const aws=[...s.matchAll(/\bAKIA[A-Z0-9]{16}\b/g)].some(m=>varied(m[0].slice(4)));
  return aws&&[...s.matchAll(/(?<![A-Za-z0-9/+])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+=])/g)].some(m=>varied(m[0])&&/[a-z]/.test(m[0])&&/[A-Z0-9]/.test(m[0]));
}
