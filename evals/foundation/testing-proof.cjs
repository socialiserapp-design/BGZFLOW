const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { pathToFileURL } = require('node:url');

function verifyTestStrength(workspace, evidenceRoot) {
  const run = path.join(evidenceRoot, randomUUID()); fs.mkdirSync(run, { recursive: true });
  const original = fs.readFileSync(path.join(__dirname, 'fixtures/discount.mjs'), 'utf8');
  const repaired = fs.readFileSync(path.join(workspace, 'discount.mjs'), 'utf8');
  const testSource = fs.readFileSync(path.join(workspace, 'discount.property.test.mjs'), 'utf8');
  const results = {};
  const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR'].filter(name => process.env[name]).map(name => [name, process.env[name]]));
  function invoke(directory, args, input = '', childQuote = false) {
    const guard = childQuote ? ['--allow-child-process', '--import', pathToFileURL(path.join(directory, 'checker-child-guard.mjs')).href] : [];
    const value = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${directory}`, `--allow-fs-write=${directory}`, ...guard, ...args], { cwd: directory, env, input, encoding: 'utf8', timeout: 10000, maxBuffer: 100000, windowsHide: true });
    return { status: value.status, signal: value.signal, error: value.error?.code, stdout: value.stdout || '', stderr: value.stderr || '' };
  }
  function candidate(label, source) {
    const directory = path.join(run, label); fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
    fs.writeFileSync(path.join(directory, 'discount.mjs'), source);
    fs.writeFileSync(path.join(directory, 'discount.property.test.mjs'), testSource);
    for (const file of ['discount.example.test.mjs', 'quote.mjs']) fs.copyFileSync(path.join(workspace, file), path.join(directory, file));
    // Generated tests may legitimately exercise the requested quote CLI. Permit
    // precisely that subprocess in this checker-owned fixture, retain the read
    // boundary in the child, and reject shells, alternate executables and code
    // supplied in arguments. No user/host permission setting is changed.
    fs.writeFileSync(path.join(directory, 'checker-child-guard.mjs'), `import cp from 'node:child_process';import path from 'node:path';import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
const realSpawn=cp.spawnSync,root=process.cwd(),equal=(a,b)=>process.platform==='win32'?path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase():path.resolve(a)===path.resolve(b);let calls=0;
const refused=()=>{const error=new Error('Checker permits only the requested local quote command.');error.code='BGZ_CHECKER_CHILD';throw error;};
cp.spawnSync=(file,args,options={})=>{if(typeof file!=='string'||!equal(file,process.execPath)||!Array.isArray(args)||args.length!==1||typeof args[0]!=='string'||!equal(path.resolve(options.cwd||root,args[0]),path.join(root,'quote.mjs'))||options.cwd&&!equal(options.cwd,root)||Object.keys(options).some(key=>!['cwd','input','encoding','timeout','maxBuffer'].includes(key)))return refused();const input=options.input??'';if(typeof input!=='string'||Buffer.byteLength(input)>1000000||options.encoding&&!['utf8','utf-8'].includes(options.encoding))return refused();calls++;return realSpawn(process.execPath,['--permission','--allow-fs-read='+root,path.join(root,'quote.mjs')],{cwd:root,env:Object.fromEntries(['PATH','SystemRoot','WINDIR'].filter(name=>process.env[name]).map(name=>[name,process.env[name]])),input,encoding:options.encoding,timeout:10000,maxBuffer:100000,windowsHide:true});};
for(const name of ['spawn','exec','execSync','execFile','execFileSync','fork'])cp[name]=refused;syncBuiltinESMExports();process.on('exit',()=>fs.writeFileSync('child-observation.json',JSON.stringify({quoteCalls:calls})));
`);
    for (const name of ['fast-check', 'pure-rand']) fs.cpSync(path.join(workspace, 'node_modules', name), path.join(directory, 'node_modules', name), { recursive: true });
    // Observe actual execution of the real package. This is a private checker
    // copy, never an edit to the model's dependency or the installed plugin.
    const lib = path.join(directory, 'node_modules/fast-check/lib');
    fs.copyFileSync(path.join(lib, 'fast-check.js'), path.join(lib, 'bgz-original.js'));
    fs.writeFileSync(path.join(lib, 'fast-check.js'), `import original from './bgz-original.js';\nimport fs from 'node:fs';\nexport * from './bgz-original.js';\nlet calls=0,predicates=0;const samples=new Set();\nconst wrapProperty=name=>(...args)=>{const predicate=args.pop();return original[name](...args,(...values)=>{predicates++;samples.add(JSON.stringify(values));return predicate(...values);});};\nexport const property=wrapProperty('property'),asyncProperty=wrapProperty('asyncProperty');\nexport const assert=(...args)=>{calls++;return original.assert(...args);},check=(...args)=>{calls++;return original.check(...args);};\nexport default {...original,property,asyncProperty,assert,check};\nprocess.on('exit',()=>fs.writeFileSync('library-observation.json',JSON.stringify({calls,predicates,unique:samples.size})));\n`);
    const result = invoke(directory, ['--test', '--test-isolation=none', 'discount.example.test.mjs', 'discount.property.test.mjs'], '', true);
    try { result.library = JSON.parse(fs.readFileSync(path.join(directory, 'library-observation.json'))); } catch { result.library = null; }
    try { result.children = JSON.parse(fs.readFileSync(path.join(directory, 'child-observation.json'))); } catch { result.children = null; }
    result.detected = result.status === 1 && !result.error && !result.signal && /Property failed|AssertionError|ERR_ASSERTION/.test(result.stdout + result.stderr);
    results[label] = result;
    return directory;
  }
  const fixedDirectory = candidate('repaired', repaired);
  candidate('original', original);
  candidate('always-round-up', original.replace('Math.floor', 'Math.ceil'));
  // An independent integer oracle checks additional inputs and the unchanged
  // quote entry. It is not generated by the worker or a vote over its claims.
  const probe = `import assert from 'node:assert/strict';import {priceAfterDiscount} from './discount.mjs';let count=0;for(let i=0;i<1300;i++){const cents=(i*7919+17)%1000001,percent=(i*37)%101;const expected=Number((BigInt(cents)*BigInt(100-percent)+50n)/100n);assert.equal(priceAfterDiscount(cents,percent),expected);count++;}for(const [c,p] of [[0,0],[0,100],[1,50],[101,50],[1000000,0],[1000000,100]])assert.equal(priceAfterDiscount(c,p),Number((BigInt(c)*BigInt(100-p)+50n)/100n));for(const [c,p] of [[-1,10],[1000001,10],[1.5,10],[100,-1],[100,101],[100,1.5]])assert.throws(()=>priceAfterDiscount(c,p),RangeError);console.log(JSON.stringify({checked:count,boundaries:true,validation:true}));`;
  fs.writeFileSync(path.join(fixedDirectory, 'independent-probe.mjs'), probe);
  results.unseen = invoke(fixedDirectory, ['independent-probe.mjs']);
  const cart = { items: [{ unitCents: 101, quantity: 3, discountPercent: 50 }, { unitCents: 199, quantity: 2, discountPercent: 33 }, { unitCents: 1, quantity: 1, discountPercent: 50 }] };
  results.integration = invoke(fixedDirectory, ['quote.mjs'], JSON.stringify(cart));
  let actual; try { actual = JSON.parse(results.integration.stdout); } catch {}
  const expected = { lines: [152, 267, 1], totalCents: 420 };
  const passed = results.repaired.status === 0 && results.repaired.library?.calls > 0 && results.repaired.library.predicates >= 50 && results.repaired.library.unique >= 25 && results.original.detected && results['always-round-up'].detected && results.unseen.status === 0 && results.integration.status === 0 && isDeepStrictEqual(actual, expected);
  const result = { passed, results, scope: 'Synthetic calculation, generated test effectiveness, preserved validation and actual quote entry only. No browser, payment provider, real customer or hostile-builder isolation claim.' };
  fs.writeFileSync(path.join(run, 'result.json'), JSON.stringify(result, null, 2));
  return result;
}
module.exports = { verifyTestStrength };
