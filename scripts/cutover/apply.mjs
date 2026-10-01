import fs from 'node:fs';
import path from 'node:path';
import { backup, readManifest, writeManifest, verifyBackup, verifyProtected, verifyPayload, verifyTargets,
  captureVolatileAtApplyStart, volatileInventory, state, copyRaw, writeOwned, seal } from './cutover-lib.mjs';
import { hostStage, hostNative, verifyResume, installNativePackage, installNativeFile } from './host-stage.mjs';

const resume = process.argv.includes('--resume'), apply = process.argv.includes('--apply') || resume;
if ([resume, process.argv.includes('--apply'), process.argv.includes('--dry-run')].filter(Boolean).length !== 1) throw new Error('Explicit single mode required');
const m = readManifest(), operations = ['marketplace-update', 'plugin-update', 'plugin-list'];
const start = resume ? verifyResume(m, 'claude', operations) : 0;
if (!resume && m.phase !== 'prepared') throw new Error('Cutover already started; use --resume for an isolated failed native step, otherwise UNDO.ps1');
try { verifyBackup(m); verifyProtected(m); if (!resume) verifyTargets(m); verifyPayload(m); if (resume) verifyPayload(m, m.packageRoot); }
catch (e) { if (resume) throw new Error('Resume refused: ' + e.message + '. Use UNDO.ps1.'); throw e; }
const result = { ok: true, mode: resume ? 'resume' : apply ? 'apply' : 'dry-run', phase: m.phase,
  releaseCommit: m.releaseCommit, releaseTree: m.releaseTree, verifiedTargets: m.targets.length, verifiedReleaseBlobs: verifyPayload(m) };
if (apply) {
  if (m.profile === 'live-staged' && m.rehearsal?.passed !== true) throw new Error('Cutover held: the pinned candidate failed rehearsal; see REHEARSAL.md');
  if (resume) {
    m.resumes ||= []; m.resumes.push({ at: new Date().toISOString(), from: m.failure.operation, failure: m.failure });
    m.volatileAtResumeStart = volatileInventory(m); delete m.failure;
  } else { captureVolatileAtApplyStart(m); m.startedAt = new Date().toISOString(); m.operation = 'immutable-source'; }
  m.phase = 'applying'; writeManifest(m);
  try {
    if (!resume) {
      if (state(m.packageRoot).exists) throw new Error('Immutable release destination occupied');
      copyRaw(m.payload, m.packageRoot, m); verifyPayload(m, m.packageRoot);
      writeOwned(path.join(m.marketplaceRoot, '.claude-plugin/marketplace.json'), JSON.stringify({ name: 'bgzflow-live', owner: { name: 'BGZFLOW' },
        description: 'Immutable local BGZFLOW 0.3.0', plugins: [{ name: 'bgzflow', source: './' + m.releaseCommit }] }, null, 2) + '\n', m);
      writeOwned(path.join(m.marketplaceRoot, '.agents/plugins/marketplace.json'), JSON.stringify({ name: 'bgzflow-live', interface: { displayName: 'BGZFLOW live' },
        plugins: [{ name: 'bgzflow', source: { source: 'local', path: './' + m.releaseCommit }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' } }] }, null, 2) + '\n', m);
    }
    const staged = hostStage(m, 'claude');
    const args = [['plugin', 'marketplace', 'update', 'bgzflow-live'], ['plugin', 'update', 'bgzflow@bgzflow-live'], ['plugin', 'list', '--json']];
    let list;
    for (let i = start; i < operations.length; i++) list = hostNative(m, 'claude', staged, operations[i], args[i]);
    const entries = JSON.parse(list.stdout), row = (Array.isArray(entries) ? entries : entries.plugins).find(v => (v.id || v.name) === 'bgzflow@bgzflow-live');
    if (!row || row.version !== '0.3.0' || row.enabled !== true) throw new Error('Native enabled version is not 0.3.0');
    const installed = JSON.parse(fs.readFileSync(path.join(staged.config, 'plugins/installed_plugins.json'), 'utf8')).plugins['bgzflow@bgzflow-live'].find(x => x.scope === 'user');
    m.operation = 'commit-native-claude'; m.nativeStep = null; writeManifest(m);
    m.installedPath = installNativePackage(m, 'claude', installed.installPath);
    for (const name of ['settings.json', 'plugins/installed_plugins.json', 'plugins/known_marketplaces.json']) installNativeFile(m, 'claude', name);
    verifyProtected(m); seal(m, 'applied'); Object.assign(result, { phase: m.phase, enabledVersion: '0.3.0', installedPath: m.installedPath });
  } catch (e) {
    m.failure = { message: e.message, at: new Date().toISOString(), operation: m.operation };
    m.phase = 'failed'; writeManifest(m); seal(m, 'failed'); throw e;
  }
}
writeOwned(path.join(backup, resume ? 'resume-result.json' : apply ? 'apply-result.json' : 'apply-dry-run.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
