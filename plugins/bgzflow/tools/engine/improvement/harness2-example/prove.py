"""Real-process synthetic proof. Run in a fresh evidence directory; no network."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--harness', required=True)
parser.add_argument('--engine', required=True)
parser.add_argument('--node', required=True)
parser.add_argument('--evidence', required=True)
args = parser.parse_args()
sys.path.insert(0, str(Path(args.harness).resolve()))

from harness2.core.recursion import run_parallel
from harness2.core.proposer import Reply
from harness2.core.spec import RunView
from bridge import AgendaAdapter, RecipeRegistry, digest, save
from recipe import encode

root = Path(args.evidence).resolve()
root.mkdir(parents=True, exist_ok=False)
results = []


def checked(name, condition):
    if not condition:
        raise AssertionError(name)
    results.append({'name': name, 'passed': True})
    print('PASS ' + name, flush=True)


def rejected(name, action):
    try:
        action()
    except (ValueError, OSError) as error:
        results.append({'name': name, 'passed': True, 'reason': str(error)})
        print('PASS ' + name, flush=True)
    else:
        raise AssertionError('expected rejection: ' + name)


class ScriptedProposer:
    def call(self, mission, workspace, label, *, harvest, max_attempts):
        target = Path(workspace) / harvest
        target.mkdir(parents=True, exist_ok=True)
        selection = 'reverse' if label.startswith('dom') else 'all'
        (target / 'recipe.json').write_text(encode(selection), encoding='utf-8')
        return Reply(label, '<notes>Apply a bounded record selection recipe.</notes>', True,
                     attempts=1, channel='offline-scripted', workspace=target)


training = AgendaAdapter(root / 'training', args.engine, args.node,
                         {'public': {'items': ['Welcome', 'Planning', 'Next actions']}})
base = training.execute('public', None, 'base1')
checked('actual baseline omits last record', not training.score(base, 'public')['exact'])
result = run_parallel('public', 1,
                      [RunView('base1', 'base1', base, True, True)],
                      adapter=training, prop=ScriptedProposer(), work_dir=root / 'core',
                      run_id_of=lambda label: 'core-' + label,
                      base_tree={'recipe.json': encode('omit-last')},
                      propose_workers=1, rollout_workers=1)
save(root / 'core-result.json', result.to_dict())
checked('unchanged core executes all three proposal stages', result.ok and not result.fell_back)
checked('four rollouts and three stages preserved', result.ledger.R == 4 and result.ledger.P == 3)
checked('valid wrong candidate fails exact bytes', not training.score(result.rollouts['dom1'].run_dir, 'public')['exact'])
checked('valid correct candidate passes exact bytes', training.score(result.rollouts['inv1'].run_dir, 'public')['exact'])
final = result.rollouts[result.finals[0]].run_dir
checked('final candidate passes exact bytes', training.score(final, 'public')['exact'])
save(root / 'candidate-hashes.json', {label: json.loads((result.rollouts[label].run_dir / 'manifest.json').read_bytes())['recipe_sha256'] for label in result.trees})
final_tree = root / 'core' / 'harnesses' / 'agg1'
receipt_before = (final / 'receipt.json').read_bytes()
effects_before = (final / 'effects.jsonl').read_bytes()
replayed = training.execute('public', final_tree, 'core-agg1')
checked('same run identity reuses only intact result', replayed == final and (final / 'receipt.json').read_bytes() == receipt_before)
checked('replay has exactly one actual effect', (final / 'effects.jsonl').read_bytes() == effects_before and len(effects_before.splitlines()) == 1)
rejected('different recipe cannot reuse run', lambda: training.execute('public', None, 'core-agg1'))
training.records['public']['items'].append('Changed input')
rejected('different input cannot reuse run', lambda: training.execute('public', final_tree, 'core-agg1'))
training.records['public']['items'].pop()
artifact = final / 'agenda.md'
original = artifact.read_bytes()
artifact.write_bytes(b'tampered synthetic output')
rejected('changed artifact invalidates reuse', lambda: training.execute('public', final_tree, 'core-agg1'))
artifact.write_bytes(original)
artifact.unlink()  # This proof owns this newly-created synthetic output.
rejected('missing artifact invalidates reuse', lambda: training.execute('public', final_tree, 'core-agg1'))
artifact.write_bytes(original)
checked('restored artifact passes integrity', bool(training.verify_run(final)))
for name, tree in [
    ('unknown recipe key rejected', {'recipe.json': '{"version":1,"selection":"all","extra":true}'}),
    ('candidate command rejected', {'recipe.json': '{"version":1,"selection":"all","command":"anything"}'}),
    ('candidate authority rejected', {'recipe.json': '{"version":1,"selection":"all","authority":"all"}'}),
    ('candidate acceptance rejected', {'recipe.json': encode('all'), 'checker.py': 'pass'}),
    ('duplicate recipe key rejected', {'recipe.json': '{"version":1,"selection":"all","selection":"reverse"}'}),
]:
    rejected(name, lambda tree=tree: training.validate_tree(tree))

held = AgendaAdapter(root / 'held-out', args.engine, args.node,
                     {'held-a': {'items': ['Review prototype', 'Accessibility', 'Owners', 'Close']},
                      'held-b': {'items': ['Café meeting', 'Δelta follow-up']}})
correct_checks = [(task, held.execute(task, final_tree, 'good-' + task)) for task in held.tasks()]
wrong_tree = root / 'core' / 'harnesses' / 'dom1'
wrong_checks = [(task, held.execute(task, wrong_tree, 'wrong-' + task)) for task in held.tasks()]
baseline_checks = [(task, held.execute(task, None, 'base-' + task)) for task in held.tasks()]
checked('held-out baseline fails both cases', all(not held.score(directory, task)['exact'] for task, directory in baseline_checks))
checked('held-out wrong valid candidate fails both cases', all(not held.score(directory, task)['exact'] for task, directory in wrong_checks))
checked('held-out final passes both cases', all(held.score(directory, task)['exact'] for task, directory in correct_checks))
registry = RecipeRegistry(root / 'registry')
prior = registry.seed(encode('omit-last'))
correct_text = (final_tree / 'recipe.json').read_bytes().decode('utf-8')
wrong_text = (wrong_tree / 'recipe.json').read_bytes().decode('utf-8')
decision = registry.consider(correct_text, held, correct_checks)
checked('exact final promoted after independent held-out byte comparisons', decision['promoted'])
active = registry.active()
decision = registry.consider(wrong_text, held, wrong_checks)
checked('wrong output rejected and active version unchanged', not decision['promoted'] and registry.active() == active)
decision = registry.consider('{"version":1,"selection":"all","command":"bad"}', held, [])
checked('invalid recipe rejected and active version unchanged', not decision['promoted'] and registry.active() == active)
decision = registry.consider(correct_text, held, correct_checks[:1])
checked('partial held-out coverage cannot promote', not decision['promoted'] and registry.active() == active)
registry.rollback(prior)
checked('rollback restores exact prior version', registry.active() == {'version': prior})
rollback_tree = root / 'rollback-recipe'
rollback_tree.mkdir()
(rollback_tree / 'recipe.json').write_text(json.loads((root / 'registry' / 'versions' / (prior + '.json')).read_bytes())['recipe'], encoding='utf-8')
rolled = held.execute('held-a', rollback_tree, 'rollback-held-a')
checked('rolled-back recipe executes with prior observable behaviour', not held.score(rolled, 'held-a')['exact'])
save(root / 'proof.json', {'checks': results, 'passed': len(results), 'limitations': [
    'Single-process offline core recursion, not POSIX full scheduler.',
    'Scripted proposer; no model quality or paid performance comparison.',
    'Synthetic file effects only; no live Lucian integration.',
    'Trusted local adapter and files; no OS sandbox claim.',
    'Jev not invoked because this brief forbids model/service calls.'],
    'harness_source': str(Path(args.harness).resolve()), 'engine': str(Path(args.engine).resolve()),
    'core_source_sha256': hashlib.sha256((Path(args.harness) / 'harness2/core/recursion.py').read_bytes()).hexdigest()})
print('PROOF COMPLETE: ' + str(len(results)) + ' checks passed.', flush=True)
