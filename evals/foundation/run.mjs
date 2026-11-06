import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareFixture } from './prepare.mjs';
import { buildConfig, isolateCaseConfigs } from './config.mjs';
import { clearInheritedHostIdentity } from './native-environment.mjs';
import { preparePrivateLearning } from './private-learning.mjs';
import { readNativeHookStatus } from './native-hooks.mjs';

const required = ['BGZ_EVAL_PROVIDER', 'BGZ_EVAL_MODEL', 'BGZ_EVAL_JUDGE_PROVIDER', 'BGZ_EVAL_JUDGE_MODEL'];
for (const name of required) if (!process.env[name]) throw new Error(`Set ${name} explicitly before starting a model evaluation.`);
// A separate app-server must not inherit the desktop's live session identity.
// Keep existing credentials in the environment, never in saved configuration.
clearInheritedHostIdentity();
const runDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '.runs', `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
const fixture = prepareFixture(runDirectory, { propertyTesting: !process.env.BGZ_EVAL_CASES || process.env.BGZ_EVAL_CASES.split(',').map(value => value.trim()).includes('combined-test-strength') });
const workspaceBase=path.resolve(process.env.BGZ_EVAL_WORK_ROOT||os.tmpdir());
fs.mkdirSync(workspaceBase,{recursive:true});
const workspacesRoot=fs.mkdtempSync(path.join(workspaceBase,'bgzflow-native-'));
const config = buildConfig({ provider: process.env.BGZ_EVAL_PROVIDER, model: process.env.BGZ_EVAL_MODEL, judgeProvider: process.env.BGZ_EVAL_JUDGE_PROVIDER, judgeModel: process.env.BGZ_EVAL_JUDGE_MODEL, fixture, runDirectory, effort: process.env.BGZ_EVAL_EFFORT || 'medium', caseIds:process.env.BGZ_EVAL_CASES?.split(',').map(id=>id.trim()), codexPath:process.env.BGZ_EVAL_CODEX_PATH });
fs.writeFileSync(path.join(runDirectory, 'invocation.json'), JSON.stringify({ provider: process.env.BGZ_EVAL_PROVIDER, model: process.env.BGZ_EVAL_MODEL, judgeProvider: process.env.BGZ_EVAL_JUDGE_PROVIDER, judgeModel: process.env.BGZ_EVAL_JUDGE_MODEL, ...(process.env.BGZ_EVAL_CODEX_PATH?{codexPath:process.env.BGZ_EVAL_CODEX_PATH}:{}), workspacesRoot, cases: config.tests.map(test => test.description) }, null, 2), { flag: 'wx' });
try {
  const { evaluate, assertions } = await import('promptfoo');
  // Exercise the real assertion-file loader before spending any model usage.
  // This controlled negative fixture intentionally has no native hook events.
  const preflight = await assertions.runAssertion({ assertion: config.tests[0].assert[0], test: { vars: { caseId: 'current-correction', runDirectory: path.join(runDirectory, 'harness-preflight') } }, providerResponse: { output: 'local harness preflight only', metadata: { workingDir: fixture } } });
  fs.writeFileSync(path.join(runDirectory, 'harness-preflight.json'), JSON.stringify(preflight, null, 2), { flag: 'wx' });
  if (preflight.pass !== false || !String(preflight.reason).startsWith('No matching native foundation prompt/tool events observed')) throw new Error(`Assertion-loader preflight failed before inference: ${preflight.reason}`);
  const results = [];
  for (const caseConfig of isolateCaseConfigs(config, fixture, runDirectory,{workspacesRoot})) {
    if(process.env.BGZ_EVAL_PROVIDER==='codex'){
      const status=await readNativeHookStatus({executable:process.env.BGZ_EVAL_CODEX_PATH,cwd:caseConfig.providers[0].config.working_dir});
      fs.writeFileSync(path.join(runDirectory,caseConfig.tests[0].description+'-native-hook-preflight.json'),JSON.stringify(status,null,2),{flag:'wx'});
      if(!status.ready)throw new Error(status.reason);
    }
    if (caseConfig.tests[0].description === 'private-tested-method-use') await preparePrivateLearning(caseConfig.providers[0].config.working_dir, runDirectory);
    const evaluation = await evaluate(caseConfig, { cache: false, maxConcurrency: 1, sharing: false });
    const result = await evaluation.toEvaluateSummary();
    fs.writeFileSync(path.join(runDirectory, `${caseConfig.tests[0].description}.json`), JSON.stringify(result, null, 2), { flag: 'wx' });
    results.push(result);
  }
  fs.writeFileSync(path.join(runDirectory, 'result.json'), JSON.stringify(results, null, 2), { flag: 'wx' });
  console.log(`Preserved evaluation run: ${runDirectory}`);
  if (results.some(result => result.results?.some(row => !row.success))) process.exitCode = 1;
} catch (error) {
  fs.writeFileSync(path.join(runDirectory, 'failure.txt'), String(error.stack || error), { flag: 'wx' });
  throw error;
}
