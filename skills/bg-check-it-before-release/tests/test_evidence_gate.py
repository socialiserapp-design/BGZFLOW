"""Regression tests for the evidence gate, the result schema and the controller scripts.

Run from the skill folder (skills/bg-check-it-before-release):

    python -X utf8 -m pytest -q

or without pytest:

    python -X utf8 tests/test_evidence_gate.py -v

All generated evidence lives in a temporary folder under the plugin's .tmp/ folder (set
BGZFLOW_TEST_SCRATCH to choose another parent folder). Schema tests need the `jsonschema` package; controller-script tests need
Node.js and Git. Each group skips itself with a reason when its tool is missing.

Reviewer identities and host records in these fixtures are simulated. The tests prove the
gate's structural checks, not a real reviewer, a real host or the truth of any evidence.
"""
import copy
import hashlib
import importlib.util
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import unittest
import zlib
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, ValidationError
except ImportError:  # the schema tests skip themselves
    Draft202012Validator = ValidationError = None

SKILL_DIR = Path(__file__).resolve().parents[1]
SKILLS_DIR = SKILL_DIR.parent
GATE_PATH = SKILL_DIR / 'scripts' / 'evidence_gate.py'
SCHEMA_PATH = SKILL_DIR / 'references' / 'review-verdict.schema.json'
NODE = shutil.which('node')
GIT = shutil.which('git')
TASK = 'fixture-task'
# Scratch lives in the plugin's own .tmp/ folder, never the system temp folder; BGZFLOW_TEST_SCRATCH overrides it.
SCRATCH = Path(os.environ.get('BGZFLOW_TEST_SCRATCH') or SKILLS_DIR.parent / '.tmp')
# Git must never walk up from a scratch folder into this plugin's own repository.
os.environ['GIT_CEILING_DIRECTORIES'] = os.pathsep.join(
    part for part in (os.environ.get('GIT_CEILING_DIRECTORIES'), str(SCRATCH)) if part)

needs_jsonschema = unittest.skipUnless(Draft202012Validator, 'jsonschema is not installed')
needs_git = unittest.skipUnless(GIT, 'Git is not installed')
needs_node_and_git = unittest.skipUnless(NODE and GIT, 'Node.js and Git are required')


def module(path):
    spec = importlib.util.spec_from_file_location('gate', path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def utc_now():
    now = time.time()
    return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(now)) + '.%03dZ' % int((now % 1) * 1000)


def run_node(script, options):
    args = [NODE, str(SKILL_DIR / 'scripts' / script)]
    for key, value in options.items():
        args += ['--' + key, str(value)]
    return subprocess.run(args, capture_output=True, text=True)


_RUNNER = []


def fixture_runner():
    """Run the tiny fixture command once per test session; every fixture records its real output."""
    if not _RUNNER:
        _RUNNER.append(subprocess.run([sys.executable, '-B', '-c', 'print("fixture runner")'],
                                      capture_output=True, text=True, check=True))
    return _RUNNER[0]


class GateFixture(unittest.TestCase):
    """Builds a complete, passing version-2 record set that each test then breaks on purpose."""

    def setUp(self):
        self.gate = module(GATE_PATH)
        SCRATCH.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=SCRATCH)
        self.root = Path(self.temp.name)
        self.skill = 'bg-check-it-before-release'

    def tearDown(self):
        self.temp.cleanup()

    def file(self, name, content):
        (self.root / name).write_text(content, encoding='utf-8')
        return self.ref(name)

    def ref(self, name):
        return {'path': name, 'sha256': hashlib.sha256((self.root / name).read_bytes()).hexdigest()}

    def write(self, name, obj):
        return self.file(name, json.dumps(obj))

    def screenshot(self, name, accent):
        # Synthetic 1280x800 PNG with header/sidebar/cards. Interface fixture, not UI acceptance.
        width, height = 1280, 800
        side, page, card = bytes((35, 40, 50)), bytes((245, 246, 248)), bytes((220, 228, 236))
        header = bytes(accent) * width
        body = side * 240 + page * (width - 240)
        card_row = side * 240 + page * 41 + card * 919 + page * 80
        rows = bytearray()
        for y in range(height):
            rows.append(0)  # PNG filter type: none
            rows.extend(header if y < 72 else card_row if 120 < y < 440 else body)

        def chunk(kind, data):
            return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
        data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 2, 0, 0, 0))
        data += chunk(b'IDAT', zlib.compress(bytes(rows))) + chunk(b'IEND', b'')
        (self.root / name).write_bytes(data)
        return self.ref(name)

    def fixture(self, skill=None, phase='review'):
        if skill:
            self.skill = skill
        candidate = self.file('candidate.txt', 'candidate fixture version 1')
        config = self.file('config.json', '{"dependencies":"fixture-v1","mode":"test"}')
        environment = self.file('environment.json', '{"os":"fixture","runtime":"python310"}')
        self.contract = {'schema_version': 2, 'task_id': TASK, 'skill': self.skill,
                         'phase': phase, 'source': {'repository': 'local-fixture', 'base': 'f9494fa576094ebc7dda99a66e876135dd5b5f8a', 'revision': 'fixture-candidate-v1'},
                         'candidate_files': [candidate], 'config_files': [config], 'environment_files': [environment],
                         'builders': [{'job_id': 'builder-1', 'thread_id': 'builder-thread-1'}, {'job_id': 'integrator-2', 'thread_id': 'integrator-thread-2'}],
                         'required_checks': sorted(self.gate.PROFILES[self.skill]), 'prior_findings': []}
        self.obligations = ['REQ-execution'] if self.skill == 'bg-check-it-before-release' else []
        if self.obligations:
            self.contract['candidate_requirements'] = self.obligations
        ids = self.contract['required_checks'] + self.obligations
        self.contract['evidence_types'] = {c: ('command' if c in ('verification', 'production-verification', 'REQ-execution') else 'document') for c in ids}
        if 'visual-evidence' in ids and phase != 'planning':
            self.contract['evidence_types']['visual-evidence'] = 'visual'
            # Structural image fixtures only, not actual UI captures or visual-quality proof.
            reference = self.screenshot('reference.png', (18, 171, 52))
            self.contract['ui'] = {'surface': 'Desktop app 1280x800', 'decision': self.file('decision.txt', 'approved fixture look'),
                                   'approved_tokens': self.file('tokens.json', '{"accent":"#12ab34"}'), 'reference_screenshot': reference}
        self.pin = self.write('contract.json', self.contract)['sha256']
        result = fixture_runner()
        stdout = self.file('stdout.txt', result.stdout)
        stderr = self.file('stderr.txt', result.stderr)
        self.items = {}
        for c in ids:
            kind = self.contract['evidence_types'][c]
            item = {'schema_version': 2, 'task_id': TASK, 'contract_sha256': self.pin,
                    'check_id': c, 'kind': kind, 'status': 'pass'}
            if kind == 'document':
                item.update(summary='Fixture accounting/design conclusion', sources=[candidate])
            elif kind == 'command':
                item.update(argv=[sys.executable, '-B', '-c', 'print("fixture runner")'], cwd=str(self.root),
                            runner={'job_id': 'builder-1', 'thread_id': 'builder-thread-1'}, started_at='2026-01-15T09:30:00Z',
                            finished_at='2026-01-15T09:30:01Z', exit_code=result.returncode, timed_out=False, stdout=stdout, stderr=stderr)
            else:
                item.update(self.contract['ui'])
                item.update(target=self.contract['source'], running_screenshot=self.screenshot('running.png', (18, 170, 52)), clipping='pass')
                command = dict({k: item[k] for k in ('schema_version', 'task_id', 'contract_sha256', 'check_id', 'status')}, kind='command', argv=['fixture-ui-check'], cwd=str(self.root), runner={'job_id': 'builder-1', 'thread_id': 'builder-thread-1'},
                               started_at='2026-01-15T09:30:00Z', finished_at='2026-01-15T09:30:01Z', exit_code=0, timed_out=False, stdout=stdout, stderr=stderr)
                item['token_guard'] = self.write('token-guard.json', command)
                item['overflow_check'] = self.write('overflow.json', command)
            self.items[c] = item
        self.receipt = {'schema_version': 2, 'task_id': TASK, 'contract_sha256': self.pin,
                        'checks': [{'id': c, 'status': 'pass', 'evidence': [self.write(c + '.json', self.items[c])]} for c in self.contract['required_checks']]}
        if self.obligations:
            self.receipt.update(candidate_verdict='ready', candidate_checks=[{'id': c, 'status': 'pass', 'evidence': [self.write(c + '.json', self.items[c])]} for c in self.obligations])
        reviewer = {'provider': 'checker-provider', 'job_id': 'fixture-review-job', 'thread_id': 'fixture-review-thread', 'fresh': True, 'read_only': True, 'resumed': False}
        self.inspection = {'schema_version': 2, 'task_id': TASK, 'contract_sha256': self.pin,
                           'status': 'completed', 'reviewer': reviewer, 'verdict': 'ready', 'findings': [],
                           'limitations': ['Simulated controller and reviewer identities; no real reviewer was launched by this test.']}
        self.capture = {'schema_version': 2, 'task_id': TASK, 'contract_sha256': self.pin,
                        'status': 'completed', 'reviewer': copy.deepcopy(reviewer), 'host_trace': self.file('host-trace.txt', 'SIMULATED launch/result correlation')}
        self.sync()

    def sync(self):
        records = self.receipt['checks'] + self.receipt.get('candidate_checks', [])
        for row in records:
            row['evidence'] = [self.write(row['id'] + '.json', self.items[row['id']])]
        self.inspection['coverage'] = copy.deepcopy(records)
        self.receipt['inspection'] = self.write('inspection.json', self.inspection)
        self.capture['result'] = self.receipt['inspection']
        refs = {}

        def collect(ref):
            refs[ref['path']] = ref
            try:
                item = json.loads((self.root / ref['path']).read_text())
            except (ValueError, UnicodeError, OSError):
                return

            def walk(value):
                if isinstance(value, dict):
                    if set(value) == {'path', 'sha256'}:
                        collect(value)
                    else:
                        for child in value.values():
                            walk(child)
                elif isinstance(value, list):
                    for child in value:
                        walk(child)
            walk(item)
        for row in records:
            for ref in row['evidence']:
                collect(ref)
        self.capture['artifacts'] = list(refs.values())
        self.capture_pin = self.write('capture.json', self.capture)['sha256']
        self.write('receipt.json', self.receipt)

    def run_gate(self):
        self.write('receipt.json', self.receipt)
        return self.gate.validate(self.root / 'contract.json', self.root / 'receipt.json', self.root, self.skill, self.pin,
                                  self.root / 'capture.json', self.capture_pin)

    def validate_result_schema(self):
        if Draft202012Validator is None:
            return  # schema checks run only where jsonschema is installed
        schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(self.inspection)
        Draft202012Validator({'$ref': '#/$defs/reviewer', '$defs': schema['$defs']}).validate(self.inspection['reviewer'])

    def refused(self, field=None):
        try:
            result = self.run_gate()
        except (ValueError, OSError) as exc:
            if field:
                self.assertIn(field, str(exc))
            return
        self.assertEqual(result['gate'], 'FAIL_RECORD', result)

    def repin(self):
        self.pin = self.write('contract.json', self.contract)['sha256']
        self.receipt['contract_sha256'] = self.pin
        self.inspection['contract_sha256'] = self.pin
        self.capture['contract_sha256'] = self.pin
        for item in self.items.values():
            item['contract_sha256'] = self.pin
        self.sync()

    def blocked(self, status='blocked'):
        self.fixture()
        finding = {'id': 'F-fixture', 'owner': 'worker-a', 'next_action': 'obtain a real run', 'closure_requirement': 'fresh passing result',
                   'requirement_ids': ['REQ-execution'], 'severity': 'high', 'status': 'open'}
        self.inspection.update(verdict='blocked', findings=[finding])
        self.receipt['candidate_verdict'] = 'blocked'
        self.receipt['candidate_checks'][0].update(status=status, finding={k: finding[k] for k in ('id', 'owner', 'next_action')})
        if status == 'fail':
            self.items['REQ-execution'].update(status='fail', exit_code=1)
        else:
            # A gap has no command output; do not capture leftover stdout/stderr.
            self.items['REQ-execution'] = {key: self.items['REQ-execution'][key]
                                           for key in ('schema_version', 'task_id', 'contract_sha256', 'check_id')}
            self.items['REQ-execution'].update(kind='gap', status=status, reason='runner unavailable', owner='worker-a', next_action='obtain a real run')
        self.sync()

    def git(self, repo, *args):
        return subprocess.run(['git', '-C', str(repo), '-c', 'user.name=fixture', '-c', 'user.email=fixture@noreply.invalid',
                               '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', *args],
                              capture_output=True, text=True, check=True).stdout.strip()

    def git_candidate(self, name):
        # A real Git base commit plus a real candidate commit.
        repo = self.root / name
        repo.mkdir()
        self.git(repo, 'init', '-q')
        (repo / 'app.txt').write_text('base\n')
        self.git(repo, 'add', '.')
        self.git(repo, 'commit', '-q', '-m', 'base', '--date', '2026-01-01T00:00:00Z')
        base = self.git(repo, 'rev-parse', 'HEAD')
        (repo / 'app.txt').write_text('candidate\n')
        self.git(repo, 'commit', '-q', '-am', 'candidate')
        return dict(repository=str(repo.resolve()), base=base, revision=self.git(repo, 'rev-parse', 'HEAD'),
                    merge_base=self.git(repo, 'merge-base', 'HEAD', base))

    def cli_args(self, *extra):
        return [sys.executable, '-B', str(GATE_PATH), '--contract', str(self.root / 'contract.json'),
                '--receipt', str(self.root / 'receipt.json'), '--root', str(self.root), '--contract-sha256', self.pin,
                '--inspection-capture', str(self.root / 'capture.json'),
                '--inspection-capture-sha256', self.capture_pin, *extra]


class GateTests(GateFixture):
    def test_release_record_does_not_require_a_ready_review_verdict(self):
        self.fixture(skill='bg-ship-and-recover')
        self.inspection['verdict'] = 'changes-required'
        self.sync()
        result = self.run_gate()
        self.assertEqual(result['errors'], [])

    def test_trust_me_rejected(self):
        note = self.file('claim.txt', 'worker says: trust me, it works; all tasks done and integrated')
        self.skill = 'bg-finish-the-whole-job'
        contract = {'schema_version': 1, 'task_id': 'trust-me', 'skill': self.skill,
                    'candidate_files': [note], 'required_checks': sorted(self.gate.PROFILES[self.skill])}
        pin = self.write('contract.json', contract)['sha256']
        receipt = {'schema_version': 1, 'task_id': 'trust-me', 'contract_sha256': pin,
                   'checks': [{'id': c, 'status': 'pass', 'evidence': [note]} for c in contract['required_checks']]}
        self.write('receipt.json', receipt)
        try:
            result = self.gate.validate(self.root / 'contract.json', self.root / 'receipt.json', self.root, self.skill, pin)
        except ValueError:
            return
        self.assertEqual(result['gate'], 'FAIL_RECORD', result)

    def test_gate_and_enforcement_reference_ship_once(self):
        self.assertEqual(list(SKILLS_DIR.glob('bg-*/scripts/evidence_gate.py')), [GATE_PATH])
        self.assertEqual(list(SKILLS_DIR.glob('bg-*/references/enforcement.md')), [SKILL_DIR / 'references' / 'enforcement.md'])

    def test_enforcement_reference_lists_every_profile_check(self):
        text = (SKILL_DIR / 'references' / 'enforcement.md').read_text(encoding='utf-8')
        for skill, checks in self.gate.PROFILES.items():
            self.assertIn('`' + skill + '`', text)
            for check in checks:
                self.assertIn('`' + check + '`', text, skill + ': ' + check)

    def test_contract_template_matches_the_review_profile(self):
        text = (SKILL_DIR / 'references' / 'inspection.md').read_text(encoding='utf-8')
        section = text.split('## Copyable contract template', 1)[1]
        template = json.loads(re.search(r'```json\n(.*?)\n```', section, re.S).group(1))
        self.assertEqual(template['schema_version'], 2)
        self.assertEqual(template['skill'], 'bg-check-it-before-release')
        self.assertEqual(set(template['required_checks']), self.gate.PROFILES[template['skill']])
        self.assertEqual(set(template['evidence_types']), set(template['required_checks']) | set(template['candidate_requirements']))

    def test_all_profiles_pass_with_the_single_gate_copy(self):
        for skill in self.gate.PROFILES:
            with self.subTest(skill=skill):
                self.fixture(skill)
                result = self.run_gate()
                self.assertEqual(result['gate'], 'PASS_RECORD', result)
                self.assertFalse(result['candidate_accepted'])
                self.assertFalse(result['authorizes_external_action'])
                self.assertFalse(result['host_action_interception_installed'])

    def test_missing_or_builder_reviewer_identities(self):
        for field, value in [('job_id', None), ('thread_id', ''), ('job_id', 'unknown'), ('job_id', 'builder-1'),
                             ('thread_id', 'builder-thread-1'), ('job_id', 'integrator-2'), ('thread_id', 'integrator-thread-2')]:
            with self.subTest(field=field, value=value):
                self.fixture()
                self.capture['reviewer'][field] = value
                self.inspection['reviewer'][field] = value
                self.sync()
                self.refused('reviewer.' + field)

    def test_no_builder_mapping(self):
        self.fixture()
        self.contract['builders'] = []
        self.repin()
        self.refused('contract.builders')

    def test_inspector_failures(self):
        for status in ('queued', 'running', 'failed', 'timeout', None):
            self.fixture()
            self.capture['status'] = status
            self.sync()
            self.refused('inspection_capture.status')
        for field, value in [('fresh', False), ('resumed', True), ('read_only', False)]:
            self.fixture()
            self.capture['reviewer'][field] = value
            self.inspection['reviewer'][field] = value
            self.sync()
            self.refused('reviewer.' + field)  # read_only=false also needs a verified disposable checkout
        self.fixture()
        self.receipt['inspection'] = self.file('malformed.json', 'trust me, it works')
        self.capture['result'] = self.receipt['inspection']
        self.capture_pin = self.write('capture.json', self.capture)['sha256']
        self.refused('receipt.inspection')

    def test_stale_candidate_config_environment_and_contract(self):
        for name in ('candidate.txt', 'config.json', 'environment.json'):
            self.fixture()
            self.file(name, 'changed bytes')
            self.refused()
        self.fixture()
        self.contract['source']['revision'] = 'other-candidate'
        self.write('contract.json', self.contract)
        self.refused()
        for field in ('contract_sha256', 'task_id'):
            self.fixture()
            self.inspection[field] = 'old'
            self.sync()
            self.refused('inspection.' + field)
        self.fixture()
        self.contract['source']['revision'] = 'new-revision'
        self.pin = self.write('contract.json', self.contract)['sha256']
        self.receipt['contract_sha256'] = self.pin
        self.refused('inspection_capture.contract_sha256')

    def test_tampered_output_and_capture(self):
        for name in ('stdout.txt', 'inspection.json', 'capture.json'):
            self.fixture()
            self.file(name, 'changed output')
            self.refused()

    def test_prose_or_failed_command_cannot_pass(self):
        self.fixture()
        self.items['REQ-execution'] = dict(self.items['REQ-execution'], kind='document', summary='trust me, it works', sources=self.contract['candidate_files'])
        self.sync()
        self.refused('.kind')
        for change in ({'exit_code': 1}, {'timed_out': True}, {'exit_code': True}, {'stdout': {'path': '../secret', 'sha256': '0' * 64}}):
            self.fixture()
            self.items['REQ-execution'].update(change)
            self.sync()
            self.refused()

    def test_complete_blocked_and_changes_required_accounting(self):
        for status in ('fail', 'blocked', 'unknown'):
            self.blocked(status)
            if status == 'fail':
                self.receipt['candidate_verdict'] = self.inspection['verdict'] = 'changes-required'
                self.sync()
            result = self.run_gate()
            self.assertTrue(result['assessment_complete'], result)
            self.assertEqual(result['candidate_results'][status], 1)
            self.assertFalse(result['candidate_accepted'])
            self.assertFalse(result['authorizes_external_action'])
            self.receipt['candidate_verdict'] = self.inspection['verdict'] = 'ready'
            self.sync()
            self.refused()

    def test_prior_finding_cannot_disappear_or_change_owner(self):
        self.blocked()
        old = {k: self.inspection['findings'][0][k] for k in ('id', 'owner', 'requirement_ids', 'closure_requirement')}
        self.contract['prior_findings'] = [old]
        self.repin()
        self.assertTrue(self.run_gate()['assessment_complete'])
        self.inspection['findings'] = []
        self.sync()
        self.refused('prior_findings')
        self.blocked()
        self.contract['prior_findings'] = [old]
        self.repin()
        self.inspection['findings'][0]['owner'] = 'someone-else'
        self.sync()
        self.refused('.owner')

    def test_missing_evidence_wrong_task_duplicate_and_coverage(self):
        self.fixture()
        self.receipt['checks'][0]['evidence'] = []
        self.refused()
        self.fixture()
        self.receipt['task_id'] = 'another-task'
        self.refused()
        self.fixture()
        self.receipt['checks'].append(self.receipt['checks'][0])
        self.refused()
        self.fixture()
        self.receipt['candidate_checks'] = []
        self.refused()
        self.fixture()
        self.capture['artifacts'] = []
        self.capture_pin = self.write('capture.json', self.capture)['sha256']
        self.refused('inspection_capture.artifacts')
        self.fixture()
        self.capture['artifacts'].append(self.file('unbound.txt', 'not inspected by any check'))
        self.capture_pin = self.write('capture.json', self.capture)['sha256']
        self.refused('inspection_capture.artifacts')

    def test_planning_is_design_not_runtime(self):
        self.fixture('bg-personal-product-design', phase='planning')
        self.assertEqual(self.run_gate()['gate'], 'PASS_RECORD')
        self.assertEqual(self.contract['evidence_types']['visual-evidence'], 'document')

    def test_review_and_release_cannot_use_planning_phase(self):
        for skill in ('bg-check-it-before-release', 'bg-ship-and-recover', 'bg-finish-the-whole-job'):
            with self.subTest(skill=skill):
                self.fixture(skill, phase='planning')
                self.refused('contract.phase')

    def test_visual_binding(self):
        for change in ({'surface': 'wrong surface'}, {'clipping': 'fail'}, {'decision': None}, {'target': {}}, {'token_guard': None}, {'running_screenshot': None}):
            self.fixture('bg-personal-product-design')
            self.items['visual-evidence'].update(change)
            self.sync()
            self.refused()

    def test_visual_mixed_command_results(self):
        # Validate the visual evidence itself: failed stages still fail the outer gate.
        for token_status, overflow_status, clipping, aggregate in (
            ('pass', 'fail', 'pass', 'fail'),
            ('fail', 'pass', 'pass', 'fail'),
            ('pass', 'pass', 'fail', 'fail'),
            ('pass', 'pass', 'unknown', 'unknown'),
            ('pass', 'blocked', 'pass', 'blocked'),
            ('fail', 'blocked', 'unknown', 'fail'),
        ):
            with self.subTest(token=token_status, overflow=overflow_status, clipping=clipping):
                self.fixture('bg-personal-product-design')
                visual = self.items['visual-evidence']
                for key, state in [('token_guard', token_status), ('overflow_check', overflow_status)]:
                    name = visual[key]['path']
                    command = json.loads((self.root / name).read_text())
                    command['status'] = state
                    if state == 'blocked':
                        command.update(kind='gap', reason='runner unavailable', owner='lead', next_action='run check')
                    else:
                        command['exit_code'] = 0 if state == 'pass' else 1
                    visual[key] = self.write(name, command)
                visual.update(status=aggregate, clipping=clipping)
                finding = dict(id='mixed-visual', owner='builder', next_action='repair visual check',
                               requirement_ids=['visual-evidence'], closure_requirement='both commands and clipping pass',
                               severity='medium', status='open')
                self.inspection.update(verdict='changes-required' if aggregate == 'fail' else 'blocked', findings=[finding])
                row = next(r for r in self.receipt['checks'] if r['id'] == 'visual-evidence')
                row.update(status=aggregate, finding={k: finding[k] for k in ('id', 'owner', 'next_action')})
                self.sync()
                # The review profile permits a non-ready verdict. Exercise version 2 directly
                # with this profile while keeping the same visual obligation.
                self.contract['skill'] = 'bg-check-it-before-release'
                self.receipt['candidate_verdict'] = self.inspection['verdict']
                self.gate.validate_v2(self.contract, self.receipt, self.root, self.pin,
                                      self.root / 'capture.json', self.capture_pin)
                visual['status'] = row['status'] = 'pass'
                self.sync()
                with self.assertRaisesRegex(ValueError, 'aggregate'):
                    self.gate.validate_v2(self.contract, self.receipt, self.root, self.pin,
                                          self.root / 'capture.json', self.capture_pin)

    @needs_git
    def test_disposable_checker_can_run_writing_test_without_touching_candidate(self):
        self.fixture()
        repo = self.git_candidate('disposable-candidate')
        candidate = Path(repo['repository'])
        checkout = self.root / 'checker-copy'
        subprocess.run(['git', 'clone', '--quiet', '--no-hardlinks', str(candidate), str(checkout)], check=True, capture_output=True)
        subprocess.run(['git', '-C', str(checkout), 'checkout', '--quiet', '--detach', repo['revision']], check=True)
        before = (candidate / 'app.txt').read_bytes()
        launch_head = self.git(checkout, 'rev-parse', 'HEAD')
        run = subprocess.run([sys.executable, '-c', "from pathlib import Path; Path('test-output.txt').write_text('test ran'); print('writing test passed')"],
                             cwd=checkout, capture_output=True, text=True, check=True)
        self.assertTrue((checkout / 'test-output.txt').is_file())
        self.assertFalse((candidate / 'test-output.txt').exists())
        self.assertEqual((candidate / 'app.txt').read_bytes(), before)
        self.contract['source'] = {k: repo[k] for k in ('repository', 'base', 'revision')}
        self.repin()
        for obj in (self.capture, self.inspection):
            obj['reviewer']['read_only'] = False
        state = hashlib.sha256(before).hexdigest()
        execution = dict(schema_version=2, task_id=TASK, contract_sha256=self.pin,
                         reviewer=copy.deepcopy(self.capture['reviewer']), kind='disposable-checkout',
                         candidate=str(candidate), checkout=str(checkout.resolve()),
                         launch_head=launch_head, completion_head=self.git(checkout, 'rev-parse', 'HEAD'),
                         candidate_head_before=repo['revision'], candidate_head_after=self.git(candidate, 'rev-parse', 'HEAD'),
                         candidate_state_before=state, candidate_state_after=state,
                         permissions_verified=True, write_roots=[str(checkout.resolve())], candidate_writable=False)
        item = self.items['REQ-execution']
        item.update(cwd=str(checkout.resolve()), runner={k: self.capture['reviewer'][k] for k in ('job_id', 'thread_id')},
                    stdout=self.file('writing-test.stdout', run.stdout), stderr=self.file('writing-test.stderr', run.stderr))
        self.receipt['candidate_checks'][0]['evidence'] = [self.write('REQ-execution.json', item)]
        self.capture['execution'] = self.write('execution.json', execution)
        self.sync()
        self.validate_result_schema()
        self.assertEqual(self.run_gate()['gate'], 'PASS_RECORD')
        for key, value in [('completion_head', repo['base']), ('candidate_head_after', repo['base']),
                           ('candidate_state_after', '0' * 64), ('permissions_verified', False),
                           ('write_roots', [str(candidate)]), ('candidate_writable', True), ('checkout', str(candidate))]:
            with self.subTest(execution_field=key):
                bad = dict(execution, **{key: value})
                self.capture['execution'] = self.write('execution.json', bad)
                self.sync()
                self.refused('execution')

    def test_write_access_needs_an_execution_record(self):
        self.fixture()
        for obj in (self.capture, self.inspection):
            obj['reviewer']['read_only'] = False
        self.sync()
        self.refused('reviewer.read_only')

    def test_any_qualified_provider_passes(self):
        self.fixture()
        for obj in (self.capture, self.inspection):
            obj['reviewer']['provider'] = 'independent-provider'
        self.sync()
        self.validate_result_schema()
        self.assertEqual(self.run_gate()['gate'], 'PASS_RECORD')

    def test_provider_neutral_self_review_and_missing_identity_fail(self):
        for field, value in [('job_id', 'builder-1'), ('thread_id', 'builder-thread-1'),
                             ('provider', ''), ('provider', None), ('provider', 'unknown'),
                             ('job_id', ''), ('thread_id', None)]:
            with self.subTest(field=field, value=value):
                self.fixture()
                for obj in (self.capture, self.inspection):
                    obj['reviewer']['provider'] = 'independent-provider'
                    obj['reviewer'][field] = value
                self.sync()
                self.refused('reviewer.' + field)

    def test_cli_and_precise_safe_errors(self):
        self.fixture()
        good = subprocess.run(self.cli_args(), capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stdout + good.stderr)
        self.assertEqual(json.loads(good.stdout)['skill'], 'bg-check-it-before-release')
        self.capture['reviewer']['job_id'] = None
        self.sync()
        bad = subprocess.run(self.cli_args(), capture_output=True, text=True)
        self.assertEqual(bad.returncode, 1)
        self.assertIn('inspection_capture.reviewer.job_id', json.loads(bad.stdout)['errors'][0])

    def test_cli_skill_option_selects_the_release_profile(self):
        self.fixture('bg-ship-and-recover')
        run = subprocess.run(self.cli_args('--skill', 'bg-ship-and-recover'), capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        result = json.loads(run.stdout)
        self.assertEqual((result['gate'], result['skill']), ('PASS_RECORD', 'bg-ship-and-recover'))
        self.assertFalse(result['candidate_accepted'])
        # The pinned contract names its skill, so the default review profile refuses it.
        run = subprocess.run(self.cli_args(), capture_output=True, text=True)
        self.assertEqual(run.returncode, 1)
        self.assertIn('mismatched', json.loads(run.stdout)['errors'][0])
        # Unknown profile names never reach the gate.
        run = subprocess.run(self.cli_args('--skill', 'not-a-skill'), capture_output=True, text=True)
        self.assertNotEqual(run.returncode, 0)

    def test_retained_assessment_coverage_cases(self):
        for verdict in (None, 'accepted', 'deployed', True):
            self.fixture()
            self.receipt['candidate_verdict'] = verdict
            self.refused()
        for status in ('fail', 'blocked', 'unknown', 'not-applicable', True):
            self.fixture()
            self.receipt['checks'][0]['status'] = status
            self.refused()
        for mutation in ('duplicate', 'wrong-id', 'missing', 'bad-status', 'missing-owner', 'no-evidence', 'stale-evidence'):
            self.blocked()
            row = self.receipt['candidate_checks'][0]
            if mutation == 'duplicate':
                self.receipt['candidate_checks'].append(copy.deepcopy(row))
            elif mutation == 'wrong-id':
                row['id'] = 'different-requirement'
            elif mutation == 'missing':
                self.receipt['candidate_checks'] = []
            elif mutation == 'bad-status':
                row['status'] = 'not-applicable'
            elif mutation == 'missing-owner':
                row['finding']['owner'] = ''
            elif mutation == 'no-evidence':
                row['evidence'] = []
            elif mutation == 'stale-evidence':
                row['evidence'][0]['sha256'] = '0' * 64
            self.refused()
        for obligations in (None, [], ['same', 'same']):
            self.fixture()
            self.contract['candidate_requirements'] = obligations
            self.pin = self.write('contract.json', self.contract)['sha256']
            self.receipt['contract_sha256'] = self.pin
            self.refused()

    def test_duplicate_json_missing_capture_and_profile_downgrade(self):
        self.fixture()
        self.file('capture.json', '{"status":"completed","status":"completed"}')
        self.capture_pin = self.ref('capture.json')['sha256']
        self.refused()
        self.fixture()
        (self.root / 'capture.json').unlink()
        self.refused()
        self.fixture('bg-finish-the-whole-job')
        self.contract['evidence_types']['verification'] = 'document'
        self.repin()
        self.refused('evidence_types.verification')


@needs_jsonschema
class SchemaTests(GateFixture):
    def test_schema_is_valid_and_accepts_a_complete_result(self):
        self.fixture()
        schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
        Draft202012Validator.check_schema(schema)
        self.validate_result_schema()

    def test_read_only_false_is_structurally_valid(self):
        # Structure allows it; every gate rejects it without a verified disposable-checkout record.
        self.fixture()
        for obj in (self.capture, self.inspection):
            obj['reviewer']['read_only'] = False
        self.sync()
        self.validate_result_schema()

    def test_schema_rejects_stale_or_resumed_reviewers(self):
        for field, value in [('fresh', False), ('resumed', True)]:
            with self.subTest(field=field):
                self.fixture()
                self.inspection['reviewer'][field] = value
                with self.assertRaises(ValidationError):
                    self.validate_result_schema()

    def test_schema_rejects_missing_provider_or_identity(self):
        for field, value in [('provider', ''), ('provider', None), ('job_id', ''), ('thread_id', None)]:
            with self.subTest(field=field, value=value):
                self.fixture()
                self.inspection['reviewer'][field] = value
                with self.assertRaises(ValidationError):
                    self.validate_result_schema()

    def test_schema_self_review_is_structurally_valid_but_gate_rejects_it(self):
        for field, value in [('job_id', 'builder-1'), ('thread_id', 'builder-thread-1')]:
            with self.subTest(field=field):
                self.fixture()
                for obj in (self.capture, self.inspection):
                    obj['reviewer'][field] = value
                self.sync()
                self.validate_result_schema()
                self.refused('reviewer.' + field)

    def test_schema_verdicts_and_finding_rules(self):
        self.fixture()
        schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
        validator = Draft202012Validator(schema)
        for verdict in ('ready', 'changes-required', 'blocked'):
            self.inspection['verdict'] = verdict
            validator.validate(self.inspection)
        for verdict in ('approved', 'accepted', 'approve', 'needs-attention'):
            with self.subTest(verdict=verdict):
                self.inspection['verdict'] = verdict
                with self.assertRaises(ValidationError):
                    validator.validate(self.inspection)
        self.inspection['verdict'] = 'ready'
        finding = {'id': 'F-1', 'owner': 'worker-a', 'next_action': 'repair', 'requirement_ids': ['REQ-execution'],
                   'closure_requirement': 'fresh passing result', 'severity': 'high', 'status': 'closed'}
        self.inspection['findings'] = [finding]
        with self.assertRaises(ValidationError):  # a closed finding names the passing checks that closed it
            validator.validate(self.inspection)
        finding['closure_check_ids'] = ['REQ-execution']
        validator.validate(self.inspection)


@needs_node_and_git
class ControllerScriptTests(GateFixture):
    """capture_review_target.cjs and adapt_host_review.cjs against real Git repositories."""

    def setUp(self):
        super().setUp()
        self.fixture()
        self.repo = self.git_candidate('controller-candidate')
        self.contract['source'] = {k: self.repo[k] for k in ('repository', 'base', 'revision')}
        self.repin()
        self.reviewer = copy.deepcopy(self.capture['reviewer'])

    def host_record(self, raw, reviewed=None, **stored_changes):
        """Simulated normalised host record (see references/inspection.md)."""
        reviewed = reviewed or self.repo['repository']
        now = utc_now()
        job = dict(id=self.reviewer['job_id'], thread_id=self.reviewer['thread_id'], status='completed', job_class='review', write=False)
        stored = dict(job, started_at=now, completed_at=now, exit_code=0, workspace_root=reviewed,
                      target=dict(repository=reviewed, base=self.repo['base'], merge_base=self.repo['merge_base']),
                      raw_output=json.dumps(raw))
        stored.update(stored_changes)
        return dict(response=job, stored=stored)

    def launch(self, name='launch', **override):
        options = {'phase': 'launch', 'contract': self.root / 'contract.json', 'contract-sha256': self.pin,
                   'out': self.root / (name + '.json')}
        options.update(override)
        return run_node('capture_review_target.cjs', options)

    def completion(self, launch, record, name='target', **override):
        host = self.write(name + '-host.json', record)
        options = {'phase': 'completion', 'launch': self.root / (launch + '.json'),
                   'launch-sha256': self.ref(launch + '.json')['sha256'], 'host': self.root / host['path'],
                   'host-sha256': host['sha256'], 'out': self.root / (name + '.json')}
        options.update(override)
        return run_node('capture_review_target.cjs', options)

    def test_capture_records_launch_and_completion_heads(self):
        run = self.launch()
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout)['sha256'], self.ref('launch.json')['sha256'])
        launch = json.loads((self.root / 'launch.json').read_text())
        self.assertEqual((launch['task_id'], launch['contract_sha256'], launch['launch_head']), (TASK, self.pin, self.repo['revision']))
        run = self.completion('launch', self.host_record({'verdict': 'approve'}))
        self.assertEqual(run.returncode, 0, run.stderr)
        target = json.loads((self.root / 'target.json').read_text())
        self.assertEqual((target['job_id'], target['thread_id']), (self.reviewer['job_id'], self.reviewer['thread_id']))
        self.assertEqual((target['launch_head'], target['completion_head']), (self.repo['revision'], self.repo['revision']))
        self.assertEqual(target['launch_sha256'], self.ref('launch.json')['sha256'])
        # A capture is never overwritten.
        again = self.completion('launch', self.host_record({'verdict': 'approve'}))
        self.assertNotEqual(again.returncode, 0)
        self.assertIn('EEXIST', again.stderr)

    def test_capture_launch_refusals(self):
        run = self.launch(name='wrong-pin', **{'contract-sha256': '0' * 64})
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('controller pin mismatch', run.stderr)
        self.git(self.repo['repository'], 'commit', '--allow-empty', '-q', '-m', 'moved on')
        run = self.launch(name='moved-head')
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('launch HEAD differs from contract revision', run.stderr)

    def test_capture_completion_refusals(self):
        self.assertEqual(self.launch().returncode, 0)
        record = self.host_record({'verdict': 'approve'})
        cases = {
            'not-completed': (dict(record, response=dict(record['response'], status='running')), 'host must be completed'),
            'other-job': (dict(record, stored=dict(record['stored'], id='other-job')), 'host identity mismatch'),
            'other-thread': (dict(record, stored=dict(record['stored'], thread_id='other-thread')), 'host thread mismatch'),
            'started-before-launch': (dict(record, stored=dict(record['stored'], started_at='2000-01-01T00:00:00.000Z')),
                                      'launch capture must precede review'),
            'completed-in-future': (dict(record, stored=dict(record['stored'], completed_at='2999-01-01T00:00:00.000Z')),
                                    'completion capture must follow review'),
            'no-stored-part': ({'response': record['response']}, 'host record needs response and stored parts'),
            'unknown-identity': (dict(record, response=dict(record['response'], id='unknown'), stored=dict(record['stored'], id='unknown')),
                                 'observed job and thread identity required'),
        }
        for name, (changed, message) in cases.items():
            with self.subTest(case=name):
                run = self.completion('launch', changed, name=name)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn(message, run.stderr)
        # A HEAD that moved during review is never bound to the launch commit.
        self.git(self.repo['repository'], 'commit', '--allow-empty', '-q', '-m', 'moved during review')
        run = self.completion('launch', record, name='moved-during-review')
        self.assertNotEqual(run.returncode, 0)
        self.assertIn('HEAD changed during review', run.stderr)

    def test_capture_and_adapter_feed_the_gate(self):
        base_reviewer = copy.deepcopy(self.reviewer)
        for case in ('approve', 'needs-attention', 'same-builder', 'wrong-repository'):
            with self.subTest(case=case):
                reviewer = copy.deepcopy(base_reviewer)
                if case == 'same-builder':
                    reviewer['thread_id'] = self.contract['builders'][0]['thread_id']
                self.reviewer = reviewer
                raw = dict(verdict='approve', summary='Fixture review', findings=[], next_steps=[])
                assessment = dict(schema_version=2, task_id=TASK, contract_sha256=self.pin,
                                  reviewer=copy.deepcopy(reviewer), coverage=self.inspection['coverage'],
                                  findings=[], limitations=['Simulated host; not a live AI review.'], raw_finding_ids=[],
                                  file_coverage=[dict(path='candidate.txt', check_ids=['REQ-execution'], conclusion='Exact candidate inspected')])
                if case == 'needs-attention':
                    raw.update(verdict='needs-attention', findings=[dict(severity='high', title='Defect', body='Observed failing behaviour',
                               file='candidate.txt', line_start=1, line_end=1, confidence=1, recommendation='Repair')])
                    assessment['raw_finding_ids'] = ['F-adapter']
                    assessment['findings'] = [dict(id='F-adapter', severity='high', status='open', owner='builder',
                                                   next_action='repair', requirement_ids=['REQ-execution'], closure_requirement='Regression passes')]
                assessment['reviewer'] = copy.deepcopy(reviewer)
                reviewed = self.git_candidate('other-repo-' + case)['repository'] if case == 'wrong-repository' else None
                self.assertEqual(self.launch(name='launch-' + case).returncode, 0)
                completed = self.completion('launch-' + case, self.host_record(raw, reviewed=reviewed), name='target-' + case)
                self.assertEqual(completed.returncode, 0, completed.stderr)
                host = self.ref('target-' + case + '-host.json')
                observation = dict(schema_version=2, task_id=TASK, contract_sha256=self.pin,
                                   reviewer=copy.deepcopy(reviewer), status='completed', job_class='review',
                                   source=self.contract['source'], changed_files=['candidate.txt'], host_trace=host,
                                   review_target=self.ref('target-' + case + '.json'))
                options = {'root': self.root, 'contract': 'contract.json', 'contract-sha256': self.pin, 'out': 'adapted-' + case}
                for key, value in [('raw', raw), ('assessment', assessment), ('observation', observation)]:
                    ref = self.write('adapter-' + case + '-' + key + '.json', value)
                    options.update({key: ref['path'], key + '-sha256': ref['sha256']})
                run = run_node('adapt_host_review.cjs', options)
                if case in ('same-builder', 'wrong-repository'):
                    self.assertNotEqual(run.returncode, 0)
                    self.assertIn('same as contributing builder' if case == 'same-builder' else 'repository differs', run.stderr)
                    self.assertFalse((self.root / ('adapted-' + case)).exists())
                    continue
                self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
                adapted = json.loads(run.stdout)
                result = self.gate.validate(self.root / 'contract.json', self.root / adapted['receipt']['path'],
                                            self.root, self.skill, self.pin, self.root / adapted['capture']['path'], adapted['capture']['sha256'])
                self.assertEqual(result['gate'], 'PASS_RECORD', result)
                self.assertEqual(result['candidate_verdict'], 'ready' if case == 'approve' else 'changes-required')
                self.assertFalse(result['candidate_accepted'])
                self.assertFalse(result['authorizes_external_action'])
                (self.root / ('adapted-' + case) / 'raw-review.json').write_text('{}')
                with self.assertRaisesRegex(ValueError, 'inspection.raw_review'):
                    self.gate.validate(self.root / 'contract.json', self.root / adapted['receipt']['path'],
                                       self.root, self.skill, self.pin, self.root / adapted['capture']['path'], adapted['capture']['sha256'])

    def test_adapter_refuses_a_stale_or_failed_host_review(self):
        raw = dict(verdict='approve', summary='Fixture review', findings=[], next_steps=[])
        assessment = dict(schema_version=2, task_id=TASK, contract_sha256=self.pin,
                          reviewer=copy.deepcopy(self.reviewer), coverage=self.inspection['coverage'],
                          findings=[], limitations=['Simulated host; not a live AI review.'], raw_finding_ids=[],
                          file_coverage=[dict(path='candidate.txt', check_ids=['REQ-execution'], conclusion='Exact candidate inspected')])
        self.assertEqual(self.launch().returncode, 0)
        cases = {
            'stale-review': (dict(started_at='2000-01-01T00:00:00.000Z', completed_at='2000-01-01T00:00:01.000Z'), 'predates the pinned candidate'),
            'failed-execution': (dict(exit_code=1), 'host review execution failed'),
            'other-raw-output': (dict(raw_output='{}'), 'raw review differs from preserved host output'),
            'other-base': (dict(target=dict(repository=self.repo['repository'], base='0' * 40, merge_base=self.repo['merge_base'])), 'base differs'),
            'other-range': (dict(target=dict(repository=self.repo['repository'], base=self.repo['base'], merge_base='0' * 40)), 'candidate range'),
        }
        for name, (changes, message) in cases.items():
            with self.subTest(case=name):
                record = self.host_record(raw, **changes)
                # The host record is what the controller captured; the capture script would pass
                # the stale timestamps only for the stale case, so build the target directly.
                host = self.write(name + '-host.json', record)
                target = self.write(name + '-target.json', dict(
                    schema_version=2, task_id=TASK, contract_sha256=self.pin, repository=self.repo['repository'],
                    launch_head=self.repo['revision'], completion_head=self.repo['revision'],
                    job_id=self.reviewer['job_id'], thread_id=self.reviewer['thread_id']))
                observation = dict(schema_version=2, task_id=TASK, contract_sha256=self.pin,
                                   reviewer=copy.deepcopy(self.reviewer), status='completed', job_class='review',
                                   source=self.contract['source'], changed_files=['candidate.txt'], host_trace=host, review_target=target)
                options = {'root': self.root, 'contract': 'contract.json', 'contract-sha256': self.pin, 'out': 'adapted-' + name}
                for key, value in [('raw', raw), ('assessment', assessment), ('observation', observation)]:
                    ref = self.write(name + '-' + key + '.json', value)
                    options.update({key: ref['path'], key + '-sha256': ref['sha256']})
                run = run_node('adapt_host_review.cjs', options)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn(message, run.stderr)
                self.assertFalse((self.root / ('adapted-' + name)).exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
