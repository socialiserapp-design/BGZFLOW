// H5 state snapshot. Event: Stop. Copies project state that git does not protect into
// <project>/.bgzflow/snapshots/<UTC timestamp>/ and keeps the newest 20 snapshots. Never blocks the stop.
import { logLine, runHook } from './lib/io.mjs';
import { takeSnapshot } from './lib/snapshot.mjs';

await runHook('H5', async ({ projectDir, cfg }) => {
  if (!projectDir) return '{}';
  const result = takeSnapshot({ projectDir, cfg, log: (message) => logLine(projectDir, 'H5', message) });
  if (result.status === 'snapshot') {
    const extra = result.removed.length ? `, removed ${result.removed.length} old` : '';
    logLine(projectDir, 'H5', `snapshot ${result.name}: ${result.copied} file(s), ${result.bytes} bytes${result.truncated ? ' (truncated at size cap)' : ''}${extra}`);
  }
  return '{}';
});
