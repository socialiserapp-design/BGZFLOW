// Pure build admission for the existing graph. Does not dispatch, accept, merge,
// mutate graph state or replace the controller's ownership/permission checks.
const fullCommit = value => typeof value === 'string' && /^[a-f0-9]{40}([a-f0-9]{24})?$/.test(value);
function admitBuild(task, tasks, contains = (head, commit) => head === commit) {
  const admitted = structuredClone(task);
  const pins = [];
  for (const dependency of admitted.dependsOn) {
    const prerequisite = tasks.get(dependency.id);
    if (!prerequisite || !['accepted-dependency', 'integrated'].includes(dependency.gate)) return null;
    const integration = prerequisite.integration;
    if (dependency.gate === 'integrated' && integration?.state === 'integrated') {
      if (!fullCommit(integration.combined_head)) return null;
      pins.push(integration.combined_head);
      continue;
    }
    const acceptance = prerequisite.dependency_acceptance;
    if (prerequisite.worker_state !== 'completed' || acceptance?.state !== 'accepted' ||
        !acceptance.by || acceptance.by === prerequisite.owner || !fullCommit(acceptance.candidate) ||
        acceptance.candidate !== integration?.candidate || !acceptance.evidence_refs?.length ||
        acceptance.evidence_refs.some(ref => !ref.id || !ref.path || ref.version !== acceptance.candidate)) return null;
    // Current-wave implementation dependencies are stacked at admission. The
    // integrated state retains its original meaning and is never set early.
    dependency.gate = 'accepted-dependency';
    pins.push(acceptance.candidate);
  }
  if (!pins.length) return admitted;
  // Choose one pinned descendant containing every prerequisite. Independent
  // branches need a controller-owned stack with verified ancestry before launch.
  const baseline = [task.baseline, ...pins].find(head => fullCommit(head) && pins.every(pin => contains(head, pin)));
  if (!baseline) return null;
  admitted.baseline = baseline;
  return admitted;
}
module.exports = {admitBuild};
