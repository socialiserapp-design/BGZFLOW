const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');

// Captured by the evaluator before the model starts, outside its prompt.
function snapshotWorkspace(root) {
  const entries = {};
  function visit(directory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const relative = path.relative(root, file).replaceAll('\\', '/');
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw Error('A linked fixture cannot establish an isolated artifact baseline.');
      if (stat.isDirectory()) { entries[relative] = { directory: true }; visit(file); }
      else if (stat.isFile()) entries[relative] = { bytes: stat.size, digest: createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
      else throw Error('Unexpected fixture entry type.');
    }
  }
  visit(root);
  return entries;
}

function workspaceMatches(root, before, { added = [], changed = [] } = {}) {
  if (!before || typeof before !== 'object') return false;
  const after = snapshotWorkspace(root), additions = new Set(added), changes = new Set(changed);
  for (const [name, original] of Object.entries(before)) {
    if (!Object.hasOwn(after, name)) return false;
    if (!changes.has(name) && !isDeepStrictEqual(original, after[name])) return false;
  }
  return Object.keys(after).every(name => Object.hasOwn(before, name) || additions.has(name));
}

function verifyConverterOnUnseenInputs(workspace, evidenceRoot, { requireParserCall = false } = {}) {
  const variants = [
    {
      input: 'defaults: &defaults\n  mode: local\n  enabled: false\ncalendar:\n  <<: *defaults\n  title: "Monday: planning"\n  colours: [violet, amber]\n  count: 7\n',
      expected: { defaults: { mode: 'local', enabled: false }, calendar: { mode: 'local', enabled: false, title: 'Monday: planning', colours: ['violet', 'amber'], count: 7 } },
    },
    {
      input: 'defaults: &settings\n  mode: offline\n  enabled: true\ncalendar:\n  <<: *settings\n  mode: manual\n  title: |\n    First line\n    Second line\n  colours: []\n  note: null\n',
      expected: { defaults: { mode: 'offline', enabled: true }, calendar: { mode: 'manual', enabled: true, title: 'First line\nSecond line\n', colours: [], note: null } },
    },
  ];
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const attempt = fs.mkdtempSync(path.join(evidenceRoot, 'converter-unseen-'));
  const results = [];
  for (let index = 0; index < variants.length; index++) {
    const test = variants[index], directory = path.join(attempt, String(index + 1));
    fs.mkdirSync(directory);
    fs.copyFileSync(path.join(workspace, 'convert.mjs'), path.join(directory, 'convert.mjs'));
    fs.cpSync(path.join(workspace, 'node_modules'), path.join(directory, 'node_modules'), { recursive: true });
    if(requireParserCall){
      // Instrument only this disposable dependency copy. Importing the package
      // alone cannot satisfy the check: an actual parsing entry point must run.
      const entry=path.join(directory,'node_modules','yaml','dist','index.js');
      fs.appendFileSync(entry,`\nfor (const key of ['parse','parseDocument','parseAllDocuments','Parser','Composer']) {\n const original=exports[key]; if(typeof original!=='function')continue;\n const mark=()=>require('node:fs').appendFileSync(require('node:path').join(__dirname,'../../../.yaml-parser-call'),key+'\\n');\n exports[key]=new Proxy(original,{apply(target,self,args){mark();return Reflect.apply(target,self,args);},construct(target,args,newTarget){mark();return Reflect.construct(target,args,newTarget);}});\n}\n`);
    }
    fs.writeFileSync(path.join(directory, 'input.yaml'), test.input);
    const run = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${directory}`, `--allow-fs-write=${directory}`, path.join(directory, 'convert.mjs')], { cwd: directory, encoding: 'utf8', timeout: 5000, maxBuffer: 20000 });
    let output;
    try { output = JSON.parse(fs.readFileSync(path.join(directory, 'output.json'), 'utf8')); } catch {}
    const parserCalled=!requireParserCall||fs.existsSync(path.join(directory,'.yaml-parser-call'));
    results.push({ case: index + 1, passed: run.status === 0 && isDeepStrictEqual(output, test.expected)&&parserCalled, exitCode: run.status, ...(requireParserCall?{parserCalled}:{}) });
  }
  fs.writeFileSync(path.join(attempt, 'results.json'), JSON.stringify(results, null, 2));
  return results.every(result => result.passed);
}

module.exports = { snapshotWorkspace, workspaceMatches, verifyConverterOnUnseenInputs };
