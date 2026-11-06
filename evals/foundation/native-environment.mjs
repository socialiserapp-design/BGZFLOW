// A new native test child must not impersonate the Codex process hosting the
// evaluator. Preserve supported account/config choices, without reading or
// serialising credential values. This affects only this evaluation process.
export function clearInheritedHostIdentity(env=process.env){
  const preserved=new Set(['CODEX_HOME','CODEX_API_KEY','CODEX_CA_CERTIFICATE']);
  const removed=[];
  for(const name of Object.keys(env))if(name.startsWith('CODEX_')&&!preserved.has(name)){
    delete env[name];removed.push(name);
  }
  return removed.sort();
}
