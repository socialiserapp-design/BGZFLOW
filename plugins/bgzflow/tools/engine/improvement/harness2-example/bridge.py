"""Bounded offline Harness2 to BGZFLOW bridge; no model or provider calls."""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from recipe import decode, encode
from harness2.core.spec import BenchSpec, BenchPrompts, ChannelSpec
from harness2.core.tree import SurfaceSpec
from harness2.substrate.base import Install

SOURCE = Path(__file__).resolve().parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def packed(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def save(path, value):
    path.write_bytes(json.dumps(value, indent=2, sort_keys=True).encode() + b'\n')


def expected(records):
    return ('# Agenda\n\n' + ''.join('- ' + item + '\n' for item in records['items'])).encode()


class BridgeSubstrate:
    name = 'bgzflow-offline-agenda'

    def __init__(self, owner):
        self.owner = owner

    def surface(self):
        # Stock prompts key by codex/opencode; this selects text only, never a launcher.
        return SurfaceSpec(name='codex', always_on=('recipe.json',), always_on_max=512,
                           always_on_cap_reason='bounded data recipe', skill_dir='skills',
                           skill_name_rule='must_match', trigger_hint='',
                           autotrigger_file='recipe.json', trigger_line='',
                           subagent_requires_mode=True, plugin_dir=None, hooks_file=None)

    def materialise(self, tree_dir, spec=None, ctx=None):
        tree_dir = Path(tree_dir)
        files = {str(p.relative_to(tree_dir)).replace('\\', '/'): p.read_text(encoding='utf-8')
                 for p in tree_dir.rglob('*') if p.is_file()}
        self.owner.validate_tree(files)
        recipe = files['recipe.json'].encode()
        return Install(tree_dir, digest(recipe))

    def execute(self, task_ref, install, run_ids, timeout):
        return [self.owner.execute(task_ref, install.staging_dir, run_id, timeout=timeout)
                for run_id in run_ids]

    def read_trajectory(self, stream_path, *, obs_trunc, max_chars, args_trunc=400):
        return Path(stream_path).read_text(encoding='utf-8')[:max_chars]

    def preflight(self):
        for path in (self.owner.node, self.owner.engine, SOURCE / 'build_agenda.py', SOURCE / 'check_agenda.py'):
            if not path.is_file():
                raise RuntimeError('required offline executable/source is missing')


class AgendaAdapter:
    def __init__(self, root, engine, node, tasks):
        self.root, self.engine, self.node = Path(root).resolve(), Path(engine).resolve(), Path(node).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.records = tasks
        for value in tasks.values():
            if set(value) != {'items'} or not value['items'] or not all(isinstance(s, str) and s and '\n' not in s for s in value['items']):
                raise ValueError('synthetic tasks need nonempty single-line records')
        self.substrate = BridgeSubstrate(self)
        channel = ChannelSpec('claude_cli', 'offline-scripted-unused', effort='medium')
        self.spec = BenchSpec('synthetic-agenda', self.root / 'runs', 'workspace_config',
                              BenchPrompts('Produce a Markdown agenda containing every supplied record in order.'),
                              {'proposer': channel, 'selector': channel})
        self._base = self.root / 'base'
        self._base.mkdir(exist_ok=True)
        recipe = self._base / 'recipe.json'
        if not recipe.exists():
            recipe.write_text(encode('omit-last'), encoding='utf-8')
        self.substrate.preflight()

    def tasks(self, split='all'):
        return sorted(self.records)

    def domain_of(self, task_id):
        return 'synthetic-agendas'

    def task_prompt(self, task_id):
        return 'Produce an agenda in this exact record order: ' + json.dumps(self.records[task_id]['items'])

    def task_files(self, task_id):
        return None

    def base_harness(self):
        return self._base

    def validate_tree(self, tree):
        if set(tree) != {'recipe.json'}:
            raise ValueError('only recipe.json is editable; commands, authority and acceptance are immutable')
        decode(tree['recipe.json'])

    def trusted_identity(self):
        return {str(p): digest(p.read_bytes()) for p in
                sorted(set(self.engine.parent.glob('*.mjs')) | set(SOURCE.glob('*.py')) |
                       {p for p in (self.engine.parent / 'method-assets').rglob('*') if p.is_file()})}

    def execute(self, task_id, harness_dir, run_id, *, timeout=None):
        if not isinstance(run_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', run_id):
            raise ValueError('invalid run identity')
        install = self.substrate.materialise(harness_dir or self._base)
        recipe = (install.staging_dir / 'recipe.json').read_bytes()
        inputs = packed(self.records[task_id])
        identity = {'run_id': run_id, 'task_id': task_id, 'input_sha256': digest(inputs),
                    'recipe_sha256': digest(recipe), 'trusted_code': self.trusted_identity(),
                    'node': str(self.node), 'python': sys.executable}
        directory = self.root / 'runs' / digest(run_id.encode())
        if directory.exists():
            manifest = json.loads((directory / 'manifest.json').read_bytes())
            if manifest != identity:
                raise ValueError('run identity mismatch; input, recipe or trusted code changed')
            self.verify_run(directory)
            return directory
        directory.mkdir(parents=True)
        save(directory / 'manifest.json', identity)
        (directory / 'recipe.json').write_bytes(recipe)
        (directory / 'input.json').write_bytes(inputs)
        spec = {'id': run_id, 'text': self.task_prompt(task_id),
                'steps': [{'id': 'write-agenda', 'command': {'file': sys.executable, 'args': [str(SOURCE / 'build_agenda.py')]}}],
                'checker': {'id': 'exact-byte-check', 'command': {'file': sys.executable, 'args': [str(SOURCE / 'check_agenda.py')]}},
                'artifacts': [{'id': 'agenda', 'path': 'agenda.md', 'acceptance': {'sha256': digest(expected(self.records[task_id]))}}]}
        save(directory / 'goal.json', spec)
        process = subprocess.run([str(self.node), str(self.engine), 'run', '--project', str(directory), '--spec', str(directory / 'goal.json'), '--json'],
                                 capture_output=True, timeout=timeout or 40)
        (directory / 'engine.stdout.json').write_bytes(process.stdout)
        (directory / 'engine.stderr.txt').write_bytes(process.stderr)
        if process.returncode not in (0, 1):
            raise RuntimeError('engine execution failed; preserve directory and reconcile; no blind retry')
        state = json.loads(process.stdout)
        if not (directory / 'agenda.md').is_file() or not (directory / 'effects.jsonl').is_file():
            raise RuntimeError('engine did not produce its required real artifacts')
        save(directory / 'receipt.json', {'identity_sha256': digest(packed(identity)), 'status': state['status'],
             'artifact_sha256': digest((directory / 'agenda.md').read_bytes()),
             'effect_sha256': digest((directory / 'effects.jsonl').read_bytes()),
             'engine_state_sha256': digest(process.stdout), 'goal_sha256': digest((directory / 'goal.json').read_bytes())})
        self.verify_run(directory)
        return directory

    def verify_run(self, directory):
        directory = Path(directory)
        receipt = json.loads((directory / 'receipt.json').read_bytes())
        identity = json.loads((directory / 'manifest.json').read_bytes())
        checks = {'identity_sha256': digest(packed(identity)), 'artifact_sha256': digest((directory / 'agenda.md').read_bytes()),
                  'effect_sha256': digest((directory / 'effects.jsonl').read_bytes()),
                  'engine_state_sha256': digest((directory / 'engine.stdout.json').read_bytes()),
                  'goal_sha256': digest((directory / 'goal.json').read_bytes())}
        if any(receipt[key] != value for key, value in checks.items()):
            raise ValueError('cached run integrity failed')
        if digest((directory / 'input.json').read_bytes()) != identity['input_sha256'] or digest((directory / 'recipe.json').read_bytes()) != identity['recipe_sha256']:
            raise ValueError('cached run input/recipe integrity failed')
        if len((directory / 'effects.jsonl').read_bytes().splitlines()) != 1:
            raise ValueError('synthetic effect count must be exactly one')
        return receipt

    def delivered(self, run_dir):
        return (Path(run_dir) / 'agenda.md').is_file()

    def trajectory(self, run_dir, *, obs_trunc):
        state = json.loads((Path(run_dir) / 'engine.stdout.json').read_bytes())
        # Raw checker verdicts stay in private receipts, outside proposer context.
        effects = (Path(run_dir) / 'effects.jsonl').read_text(encoding='utf-8')
        return '[ACTION] fixed engine agenda writer\n[OBSERVATION] ' + effects + '[OBSERVATION] engine event count: ' + str(len(state['events']))

    def deliverable_files(self, run_dir):
        return {'agenda.md': self.deliverable_text(run_dir)}

    def deliverable_text(self, run_dir):
        return (Path(run_dir) / 'agenda.md').read_text(encoding='utf-8')

    def score(self, run_dir, task_id):
        self.verify_run(run_dir)
        return {'exact': (Path(run_dir) / 'agenda.md').read_bytes() == expected(self.records[task_id])}


class RecipeRegistry:
    """Isolated synthetic registry; candidate selection cannot supply acceptance."""
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        (self.root / 'versions').mkdir(exist_ok=True)

    def active(self):
        path = self.root / 'active.json'
        return json.loads(path.read_bytes()) if path.exists() else None

    def _activate(self, version):
        temporary = self.root / 'active.tmp'
        save(temporary, {'version': version})
        temporary.replace(self.root / 'active.json')

    def seed(self, text):
        decode(text)
        version = digest(text.encode())
        save(self.root / 'versions' / (version + '.json'), {'recipe': text, 'kind': 'prior-baseline'})
        self._activate(version)
        return version

    def consider(self, text, adapter, checks):
        version = digest(text.encode())
        reasons = []
        try:
            decode(text)
        except (ValueError, TypeError) as error:
            reasons.append(str(error))
        if not checks:
            reasons.append('no held-out cases')
        if len(checks) != len(adapter.records) or {task for task, _ in checks} != set(adapter.records):
            reasons.append('all configured held-out cases are required exactly once')
        for task_id, directory in checks:
            try:
                adapter.verify_run(directory)
                manifest = json.loads((Path(directory) / 'manifest.json').read_bytes())
                if manifest['recipe_sha256'] != version or manifest['task_id'] != task_id:
                    raise ValueError('held-out evidence identity mismatch')
                if not adapter.score(directory, task_id)['exact']:
                    raise ValueError('held-out exact bytes did not match')
            except (ValueError, OSError) as error:
                reasons.append(str(error))
        decision = {'version': version, 'promoted': not reasons, 'reasons': reasons,
                    'cases': [{'task': task, 'run': str(directory)} for task, directory in checks], 'previous': self.active()}
        save(self.root / (version + '.decision.json'), decision)
        if not reasons:
            save(self.root / 'versions' / (version + '.json'), {'recipe': text, 'kind': 'held-out-accepted', 'evidence': decision})
            self._activate(version)
        return decision

    def rollback(self, version):
        saved = json.loads((self.root / 'versions' / (version + '.json')).read_bytes())
        if digest(saved['recipe'].encode()) != version:
            raise ValueError('registry version integrity failed')
        previous = self.active()
        self._activate(version)
        save(self.root / 'rollback.json', {'previous': previous, 'active': self.active()})
