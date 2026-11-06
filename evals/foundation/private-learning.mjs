import fs from 'node:fs';
import path from 'node:path';
import { createFoundationSession } from '../../tools/foundation/session.mjs';
import { createExecutableChecks } from '../../tools/foundation/executable-checks.mjs';

// Owner-prepared public synthetic evidence. This tests the bridge from a tested
// private procedure to later native use, not autonomous discovery of the lesson.
export async function preparePrivateLearning(projectRoot, runDirectory) {
  const storageRoot = path.join(runDirectory, 'continuity');
  const owned = path.join(runDirectory, 'private-learning-owner'); fs.mkdirSync(owned);
  const script = path.join(owned, 'check.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs';import path from 'node:path';let text='';for await(const part of process.stdin)text+=part;const {candidate}=JSON.parse(text);const rule=JSON.parse(candidate.body);const unseen=process.argv[2]==='unseen';const rows=unseen?[{id:'B',sequence:14,status:'closed'},{id:'B',sequence:3,status:'open'}]:[{id:'A',sequence:9,status:'paused'},{id:'A',sequence:2,status:'open'}];const selected=rule.strategy==='highest-sequence'?rows.reduce((a,b)=>a.sequence>b.sequence?a:b):rows.at(-1);const file=path.join(${JSON.stringify(owned)},(unseen?'unseen-':'regression-')+(rule.strategy==='highest-sequence'?'candidate':'baseline')+'.json');fs.writeFileSync(file,JSON.stringify({id:selected.id,status:selected.status}));const actual=JSON.parse(fs.readFileSync(file));console.log(JSON.stringify({matches:actual.id===(unseen?'B':'A')&&actual.status===(unseen?'closed':'paused')}));`);
  const host = { confirmRequest: async ({ text, sourceId }) => ({ observed: true, text, sourceId }), ...createExecutableChecks({ projectRoot, baselineCandidate: { body: JSON.stringify({ strategy: 'arrival-order' }) }, improvementChecks: [
    { id: 'event-regression', kind: 'regression', sources: [script], command: { file: process.execPath, args: [script, 'regression'] } },
    { id: 'event-unseen', kind: 'unseen', sources: [script], command: { file: process.execPath, args: [script, 'unseen'] } },
  ] }) };
  const session = createFoundationSession({ projectRoot, storageRoot, sessionId: 'synthetic-private-learning-owner', host });
  const request = await session.acceptRequest({ text: 'Improve reconciliation of this project’s out-of-order status exports using tested private procedures.', sourceId: 'synthetic-fixture-owner' });
  session.proposeImprovement({ id: 'event-sequence-method', name: 'event-sequence-reconciliation', match: 'Use for this project’s status-events.json export: determine each record’s current status from out-of-order event rows.', body: JSON.stringify({ strategy: 'highest-sequence', instructions: 'This project’s verified rule is that sequence is authoritative for each record id. ReceivedAt and array position describe delivery order and must not override a larger sequence. Keep different ids separate, return each highest-sequence status, and preserve the source. This procedure grants no new authority and applies only to this project.' }), revision: request.revision });
  const adopted = await session.evaluateImprovement({ id: 'event-sequence-method' });
  if (adopted.status !== 'adopted' || !adopted.evaluation.baseline.cases.some(row => row.passed === false) || !adopted.evaluation.cases.every(row => row.passed)) throw Error('Private learning preflight did not prove improvement.');
  const unrelated = path.join(owned, 'unrelated-project'); fs.mkdirSync(unrelated);
  const other = createFoundationSession({ projectRoot: unrelated, storageRoot, sessionId: 'unrelated-native-task' });
  if (other.privateCatalogue().length) throw Error('Private method leaked into another project.');
  const evidence = { projectRoot, status: adopted.status, name: adopted.name, evaluation: adopted.evaluation, projectMethods: session.privateCatalogue().map(row => row.name), unrelatedProjectMethods: other.privateCatalogue().map(row => row.name), scope: 'A trusted synthetic owner supplied the candidate and real executable checks; automatic adoption and project isolation are proved here. The subsequent native run tests actual consumption. This is not autonomous lesson discovery.' };
  fs.writeFileSync(path.join(owned, 'result.json'), JSON.stringify(evidence, null, 2));
  return evidence;
}
