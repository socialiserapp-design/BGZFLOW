import path from 'node:path';
import { backup, readManifest, verifyBackup, verifyTargets, captureVolatileAtApplyStart, volatileInventory,
  verifyPayload, writeManifest, seal, writeOwned } from './cutover-lib.mjs';
import { hostStage, hostNative, verifyResume, installNativePackage, installNativeFile } from './host-stage.mjs';

const resume = process.argv.includes('--resume'), apply = process.argv.includes('--apply') || resume;
if ([resume, process.argv.includes('--apply'), process.argv.includes('--dry-run')].filter(Boolean).length !== 1) throw new Error('Explicit single mode required');
const m = readManifest(), operations = ['codex-plugin-add', 'codex-plugin-list'];
const start = resume ? verifyResume(m, 'codex', operations) : 0;
if (!resume && m.phase !== 'prepared') throw new Error('Codex refresh already started; use --resume for an isolated failed native step, otherwise UNDO.ps1');
try { verifyBackup(m); if (!resume) verifyTargets(m); verifyPayload(m); }
catch (e) { if (resume) throw new Error('Resume refused: ' + e.message + '. Use codex-refresh/UNDO.ps1.'); throw e; }
const result = { ok: true, mode: resume ? 'resume' : apply ? 'apply' : 'dry-run', releaseCommit: m.releaseCommit,
  verifiedTargets: m.targets.length, configWrite: true, requiresCodexAppClosed: true };
if (apply) {
  if (!process.argv.includes('--codex-app-closed')) throw new Error('Close the destination Codex app for this config-writing refresh; existing lead jobs are not stopped here.');
  const parent = readManifest(path.join(m.parentBackup, 'manifest.json'));
  if (parent.phase !== 'applied' || parent.releaseCommit !== m.releaseCommit) throw new Error('Matching Claude cutover must be applied before Codex refresh; reconcile or UNDO.ps1');
  try { verifyPayload(m, m.packageRoot); } catch (e) { throw new Error((resume ? 'Resume refused: ' : '') + e.message + '. Use codex-refresh/UNDO.ps1.'); }
  if (resume) {
    m.resumes ||= []; m.resumes.push({ at: new Date().toISOString(), from: m.failure.operation, failure: m.failure });
    m.volatileAtResumeStart = volatileInventory(m); delete m.failure;
  } else captureVolatileAtApplyStart(m);
  m.phase = 'applying'; writeManifest(m);
  try {
    const staged = hostStage(m, 'codex');
    if (start === 0) {
      const add = hostNative(m, 'codex', staged, 'codex-plugin-add', [m.codexCli, 'plugin', 'add', 'bgzflow@bgzflow-live', '--json'], { exe: process.execPath });
      m.nativePackage = JSON.parse(add.stdout);
      if (m.nativePackage.version !== '0.3.0') throw new Error('Codex did not install 0.3.0');
      verifyPayload(m, m.nativePackage.installedPath); writeManifest(m);
    }
    const list = hostNative(m, 'codex', staged, 'codex-plugin-list', [m.codexCli, 'plugin', 'list', '--json'], { exe: process.execPath });
    const row = JSON.parse(list.stdout).installed.find(x => x.pluginId === 'bgzflow@bgzflow-live');
    if (!row || row.version !== '0.3.0' || row.enabled !== true) throw new Error('Codex enabled version mismatch');
    m.operation = 'commit-native-codex'; m.nativeStep = null; writeManifest(m);
    m.installedPath = installNativePackage(m, 'codex', m.nativePackage.installedPath); installNativeFile(m, 'codex', 'config.toml');
    seal(m, 'applied'); Object.assign(result, { phase: m.phase, version: row.version, enabled: true, installedPath: m.installedPath });
  } catch (e) {
    m.failure = { message: e.message, at: new Date().toISOString(), operation: m.operation };
    m.phase = 'failed'; writeManifest(m); seal(m, 'failed'); throw e;
  }
}
writeOwned(path.join(backup, resume ? 'resume-result.json' : apply ? 'apply-result.json' : 'apply-dry-run.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
