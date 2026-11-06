const fs=require('node:fs');
const path=require('node:path');
module.exports=(output,context)=>{
  const root=context.metadata?.workingDir||context.metadata?.codexAppServer?.cwd;
  if(!root)return 'Missing actual workspace: report cannot be judged.';
  const file=path.join(root,'report.md');
  if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.statSync(file).size>100000)return 'Missing or invalid actual report artifact.';
  return JSON.stringify({agentAnswer:output,actualReport:fs.readFileSync(file,'utf8')});
};
