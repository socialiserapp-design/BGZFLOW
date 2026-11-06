import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'scripts/build-tokens.mjs');
const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
function fixture(t,source){
 const directory=fs.mkdtempSync(path.join(root,'test','run-'));
 const file=path.join(directory,'source.json'),output=path.join(directory,'theme.css');
 fs.writeFileSync(file,typeof source==='string'?source:JSON.stringify(source));
 t.after(()=>{const actual=fs.realpathSync.native(directory),owned=fs.realpathSync.native(path.join(root,'test'));assert.equal(path.dirname(actual),owned);assert.ok(path.basename(actual).startsWith('run-'));fs.rmSync(actual,{recursive:true});});
 return {file,output};
}
const source={primitive:{ink:{$value:'#123456',$type:'color'}},semantic:{text:{$value:'{primitive.ink}',$type:'color'}},space:{4:{$type:'dimension',$value:'16px'}},font:{family:{body:{$type:'fontFamily',$value:['Example Sans','sans-serif']}}},motion:{easing:{standard:{$type:'cubicBezier',$value:[0.2,0,0,1]}}}};
test('real upstream directory compiles colour, spacing, motion and composite source values',()=>{
 const result=run('--in',path.join(root,'samples/tokens'));
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/--color-action-primary:/);assert.match(result.stdout,/--space-4:/);assert.match(result.stdout,/--duration-/);assert.match(result.stdout,/cubic-bezier/);assert.doesNotMatch(result.stdout,/\{primitive\./);
});
test('single source resolves aliases and serializes font and easing values without imposing dark mode',t=>{
 const {file}=fixture(t,source),result=run('--in',file);
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/--color-text: #123456/);assert.match(result.stdout,/--font-body: "Example Sans", sans-serif/);assert.match(result.stdout,/--ease-standard: cubic-bezier\(0.2, 0, 0, 1\)/);assert.doesNotMatch(result.stdout,/data-theme/);
});
test('source dark override re-resolves component aliases',t=>{
 const {file}=fixture(t,{primitive:{light:{$value:'#ffffff'},dark:{$value:'#000000'}},semantic:{text:{$value:'{primitive.dark}'}},component:{label:{$value:'{semantic.text}'}},dark:{text:{$value:'{primitive.light}'}}});
 const result=run('--in',file);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/:root\[data-theme="dark"\][\s\S]*--color-label: #ffffff/);
});
for(const [name,value] of [['unresolved alias',{semantic:{text:{$value:'{missing.value}'}}}],['alias cycle',{semantic:{a:{$value:'{semantic.b}'},b:{$value:'{semantic.a}'}}}],['unsupported root',{unrecognised:{$value:'value'}}],['malformed JSON','{invalid']])test(name+' fails without replacing prior output',t=>{
 const {file,output}=fixture(t,value);fs.writeFileSync(output,'known prior artifact');
 const result=run('--in',file,'--out',output);assert.equal(result.status,1);assert.match(result.stderr,/Token compilation failed:/);assert.equal(fs.readFileSync(output,'utf8'),'known prior artifact');assert.equal(result.stdout,'');
});
test('missing input fails without creating output',t=>{
 const {file,output}=fixture(t,source),result=run('--in',file+'.missing','--out',output);
 assert.equal(result.status,1);assert.equal(fs.existsSync(output),false);
});
