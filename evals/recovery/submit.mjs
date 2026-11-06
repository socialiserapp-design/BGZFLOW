import fs from 'node:fs';
const request=JSON.parse(fs.readFileSync(new URL('./intent.json',import.meta.url),'utf8'));
const endpoint=JSON.parse(fs.readFileSync(new URL('./service.json',import.meta.url),'utf8')).url;
try{
  const response=await fetch(endpoint+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('No successful response.');
  console.log(await response.text());
}catch{
  console.error('The reply is unavailable. The outcome has not been established.');
  process.exitCode=75;
}
