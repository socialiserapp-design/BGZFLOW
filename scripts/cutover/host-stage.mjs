import fs from 'node:fs';
import path from 'node:path';
import { backup, childEnv, copyRaw, writeOwned, writeManifest, verifyPayload, inside, guard, native, state, equal } from './cutover-lib.mjs';
import { shallow, targetFor } from './owned-changes.mjs';

export function verifyResume(m, host, operations) {
  try {
    if (m.phase !== 'failed') throw new Error('only a failed manifest can resume');
    const operation = m.failure?.operation, step = m.nativeStep, stage = m.hostStages?.[host];
    if (!operations.includes(operation) || m.operation !== operation || step?.label !== operation
      || step.host !== host || step.scope !== 'isolated-staged-home' || !['failed', 'completed'].includes(step.status)) {
      throw new Error('failure was outside a recorded isolated native step');
    }
    const home = path.join(backup, 'runtime', 'native-' + host), config = path.join(home, '.' + host);
    if (stage?.home !== home || stage.config !== config || step.home !== home) throw new Error('isolated stage identity changed');
    guard(home); guard(config);
    if (!fs.lstatSync(config).isDirectory()) throw new Error('isolated stage is missing');
    for (const c of m.changes) {
      targetFor(m, c.path);
      if (!equal(shallow(c.path), c.after)) throw new Error('journalled live path changed: ' + c.path);
    }
    for (const t of m.targets) {
      if (!t.after || !equal(state(t.path, { ignoreVolatile: m.volatilePolicyVersion === 1 }), t.after)) {
        throw new Error('live target drifted: ' + t.path);
      }
    }
    if (m.foreign.length) throw new Error('unexpected live changes were recorded at failure');
    return operations.indexOf(operation);
  } catch (e) {
    throw new Error('Resume refused: ' + e.message + '. Use UNDO.ps1 to restore/reconcile the recorded live changes.');
  }
}

export function hostNative(m, host, stage, label, args, options = {}) {
  m.operation = label;
  m.nativeStep = { host, label, scope: 'isolated-staged-home', home: stage.home, status: 'running' };
  writeManifest(m);
  try {
    const receipt = native(m, label, args, { ...options, env: stage.env, cwd: stage.home });
    m.nativeStep.status = 'completed'; m.nativeStep.receiptFile = receipt.receiptFile; writeManifest(m);
    return receipt;
  } catch (e) {
    m.nativeStep.status = 'failed'; m.nativeStep.receiptFile = e.receipt?.receiptFile || null; writeManifest(m); throw e;
  }
}

// Timestamped native backups remain in the isolated runtime. No native process
// owns a writable directory in the destination home.
export function hostStage(m, host) {
  const configName = host === 'claude' ? '.claude' : '.codex';
  const home = path.join(backup, 'runtime', 'native-' + host), config = path.join(home, configName);
  if (!m.hostStages?.[host]) {
    fs.mkdirSync(config, { recursive: true });
    const files = host === 'claude'
      ? ['settings.json', '.claude.json', 'plugins/installed_plugins.json', 'plugins/known_marketplaces.json']
      : ['config.toml'];
    for (const name of files) {
      const source = path.join(m.home, configName, name);
      if (fs.existsSync(source)) {
        const destination = path.join(config, name); copyRaw(source, destination);
        if (host === 'claude' && name === 'plugins/installed_plugins.json') {
          // The native updater must not reach destination caches through an old registry row.
          const cache = path.join(m.home, configName, 'plugins/cache');
          const remap = value => {
            if (typeof value === 'string' && path.isAbsolute(value)) {
              const relative = path.relative(cache, value);
              if (relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) {
                return path.join(config, 'plugins/cache', relative);
              }
            }
            return Array.isArray(value) ? value.map(remap)
              : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remap(item)])) : value;
          };
          writeOwned(destination, JSON.stringify(remap(JSON.parse(fs.readFileSync(destination, 'utf8'))), null, 2) + '\n');
        }
      }
    }
    m.hostStages ||= {}; m.hostStages[host] = { home, config }; writeManifest(m);
  }
  const env = { ...childEnv(m), HOME: home, USERPROFILE: home, HOMEPATH: home.slice(2) };
  // Both native hosts are isolated, including incidental activity of helpers.
  env.CLAUDE_CONFIG_DIR = path.join(home, '.claude');
  env.CODEX_HOME = path.join(home, '.codex');
  return { home, config, env };
}

export function installNativePackage(m, host, installedPath) {
  const stage = m.hostStages[host];
  inside(stage.config, installedPath); verifyPayload(m, installedPath);
  const relative = path.relative(stage.config, installedPath);
  if (!relative.replaceAll('\\', '/').startsWith('plugins/cache/bgzflow-live/')) throw new Error('Unexpected native package location');
  const destination = path.join(m.home, host === 'claude' ? '.claude' : '.codex', relative);
  copyRaw(installedPath, destination, m); verifyPayload(m, destination);
  return destination;
}

export function installNativeFile(m, host, name) {
  const stage = m.hostStages[host], configName = host === 'claude' ? '.claude' : '.codex';
  const source = path.join(stage.config, name); inside(stage.config, source); guard(source);
  let text = fs.readFileSync(source, 'utf8');
  const destinationConfig = path.join(m.home, configName);
  if (name.endsWith('.json')) {
    const remap = value => typeof value === 'string'
      ? value.replaceAll(stage.config, destinationConfig).replaceAll(stage.config.replaceAll('\\', '/'), destinationConfig.replaceAll('\\', '/'))
      : Array.isArray(value) ? value.map(remap)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v)])) : value;
    text = JSON.stringify(remap(JSON.parse(text)), null, 2) + '\n';
  }
  writeOwned(path.join(destinationConfig, name), text, m);
}
