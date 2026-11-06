import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cases } from './cases.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export function assertionReference(filename='assertions.cjs') {
  const relative = path.relative(process.cwd(), path.join(here, filename));
  // Promptfoo 0.125.1 treats the first colon as an export separator. A Windows
  // drive letter therefore cannot appear in a file:// assertion reference.
  if (path.isAbsolute(relative) || relative.includes(':')) throw new Error('Run the evaluation from the project drive so its assertion file has a relative path.');
  return `file://${relative.replaceAll('\\', '/')}`;
}
function nativeProvider(kind, model, fixture, readOnly = false, runDirectory, effort = 'medium', codexPath) {
  if (!model) throw new Error('An explicit model is required; no hidden model default is used.');
  if (!['low', 'medium'].includes(effort)) throw new Error('Evaluation effort must be low or medium.');
  if (kind === 'codex') return { id: 'openai:codex-app-server', config: { model, model_reasoning_effort: effort, working_dir: fixture, skip_git_repo_check: true, sandbox_mode: readOnly ? 'read-only' : 'workspace-write', approval_policy: 'never', network_access_enabled: false, ephemeral: true, persist_threads: false, reuse_server: false, ...(codexPath?{codex_path_override:codexPath}:{}), ...(!readOnly ? { inherit_process_env:true, cli_env: { BGZFLOW_CONTINUITY_HOME: path.join(runDirectory, 'continuity') } } : {}) } };
  if (kind === 'claude') {
    const pluginRoot=process.env.BGZ_EVAL_PLUGIN_DIR||path.resolve(here,'../../dist/bgzflow');
    const expectedVersion=fs.readFileSync(path.resolve(here,'../../VERSION'),'utf8').trim();
    if(!readOnly && (!/^2\./.test(expectedVersion) || JSON.parse(fs.readFileSync(path.join(pluginRoot,'plugin.json'),'utf8')).version!==expectedVersion))throw new Error('Build the current foundation package version before evaluating native hooks.');
    return { id: 'anthropic:claude-agent-sdk', config: { model, working_dir: fixture, tools: readOnly ? [] : ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit', 'Skill'], allowed_tools: readOnly ? [] : ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit', 'Skill'], permission_mode: readOnly ? 'dontAsk' : 'acceptEdits', setting_sources: readOnly ? [] : ['project'], ...(!readOnly ? { plugins: [{ type: 'local', path: pluginRoot }], skills: 'all', env: { BGZFLOW_CONTINUITY_HOME: path.join(runDirectory, 'continuity') } } : {}), max_turns: 15 } };
  }
  throw new Error('Provider must be explicitly codex or claude.');
}

export function buildConfig({ provider, model, judgeProvider, judgeModel, fixture, runDirectory, effort = 'medium', caseIds, codexPath }) {
  if (!fixture || !runDirectory) throw new Error('Prepare a unique synthetic run directory first.');
  if (!judgeProvider || !judgeModel) throw new Error('An explicit read-only semantic judge is required for these behaviour evaluations.');
  const judge = nativeProvider(judgeProvider, judgeModel, fixture, true, runDirectory, effort, codexPath);
  const selected=caseIds ?? cases.map(item=>item.id);
  if (!Array.isArray(selected) || selected.length===0 || new Set(selected).size!==selected.length || selected.some(id=>!cases.some(item=>item.id===id))) throw new Error('Case filter must contain unique exact known case IDs.');
  // The judge receives the facts and answer as text, with no tool capability.
  delete judge.config.copy_working_dir;
  return {
    description: 'BGZFLOW public synthetic behaviour regressions: actual effects plus independent semantic judgment',
    prompts: ['{{request}}'],
    providers: [nativeProvider(provider, model, fixture, false, runDirectory, effort, codexPath)],
    tests: cases.filter(item=>selected.includes(item.id)).map(item => ({ description: item.id, vars: { caseId: item.id, request: item.request, runDirectory }, assert: [
      { type: 'javascript', value: assertionReference() },
      { type: 'llm-rubric', value: item.rubric, provider: judge, transform:assertionReference('judge-context.cjs') },
    ] })),
  };
}

export function isolateCaseConfigs(config, fixture, runDirectory, {workspacesRoot}={}) {
  const workspaceParent=path.resolve(workspacesRoot||path.join(runDirectory,'workspaces'));
  if(workspacesRoot){
    let cursor=workspaceParent;
    while(!fs.existsSync(cursor)){const parent=path.dirname(cursor);if(parent===cursor)throw Error('Native workspace parent is unavailable.');cursor=parent;}
    cursor=fs.realpathSync.native(cursor);
    for(;;){
      if(fs.existsSync(path.join(cursor,'.git')))throw Error('Native evaluation workspaces must not inherit another Git repository.');
      const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;
    }
  }
  return config.tests.map(test => {
    const directory = path.join(workspaceParent, test.description);
    if (fs.existsSync(directory)) throw new Error('Case workspace already exists; preserve it and start a fresh run.');
    fs.cpSync(fixture, directory, { recursive: true });
    const provider = structuredClone(config.providers[0]);
    provider.config.working_dir = directory;
    const testcase = structuredClone(test);
    testcase.assert[1].provider.config.working_dir = directory;
    return { ...config, providers: [provider], tests: [testcase] };
  });
}
