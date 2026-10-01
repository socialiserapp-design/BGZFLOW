"""Read-only evidence-record gate. Never executes an action or grants authority.

Checks that a pinned contract, a receipt, typed evidence files and a separate
controller capture agree: hashes, task and contract binding, reviewer identity,
coverage and retained findings. PASS_RECORD means the records are consistent.
It never accepts a candidate, proves the evidence is true or authorizes an
external action. Run it at review and at release; see
references/enforcement.md and references/inspection.md.

Python 3.9+, no dependencies. Exit 0 = PASS_RECORD, exit 1 = FAIL_RECORD.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

PROFILES = {
    'bg-efficiency': {'context', 'evidence', 'next-action', 'routing', 'scope-preserved', 'tool-capabilities'},
    'bg-build-with-me': {'next-action', 'ownership', 'skill-selection', 'stage', 'state'},
    'bg-plain-english-builder': {'acceptance', 'architecture-and-contracts', 'decisions', 'intent', 'next-action', 'research', 'work-and-dependencies'},
    'bg-continue-my-project': {'next-action', 'ownership', 'state', 'uncertain-effects'},
    'bg-finish-the-whole-job': {'integrated-candidate', 'next-action', 'open-findings', 'requirements', 'verification'},
    'bg-check-it-before-release': {'authority-scope', 'candidate', 'coverage-accounting', 'findings-disposition', 'next-action', 'recovery', 'requirements', 'verdict'},
    'bg-ship-and-recover': {'authority-scope', 'candidate', 'handover', 'next-action', 'preflight', 'production-verification', 'recovery'},
    'bg-personal-product-design': {'accessibility', 'design-decisions', 'intent-and-profile', 'next-action', 'platform-and-performance', 'states-and-flows', 'visual-evidence'},
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load_json(path):
    raw = Path(path).read_bytes()
    if len(raw) > 262144:
        raise ValueError('Record exceeds 256 KiB; use bounded evidence references')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('Duplicate JSON key')
            result[key] = value
        return result
    return raw, json.loads(raw.decode('utf-8-sig'), object_pairs_hook=unique)


def verify_file(entry, root):
    if not isinstance(entry, dict) or set(entry) != {'path', 'sha256'}:
        raise ValueError('File reference needs exactly path and sha256')
    name, expected = entry['path'], entry['sha256']
    if not isinstance(name, str) or not name.strip() or ':' in name or '\\' in name or name.startswith('/'):
        raise ValueError('Use a relative forward-slash evidence path')
    if not isinstance(expected, str) or not re.fullmatch('[0-9a-f]{64}', expected):
        raise ValueError('Invalid SHA256')
    relative = Path(name)
    if '..' in relative.parts:
        raise ValueError('Parent traversal forbidden')
    target = (root / relative).resolve(strict=True)
    if not target.is_relative_to(root) or not target.is_file():
        raise ValueError('Reference escapes evidence root or is not a file')
    if target.stat().st_size > 268435456:
        raise ValueError('Evidence file exceeds 256 MiB; use a scoped artifact manifest')
    hasher = hashlib.sha256()
    with target.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            hasher.update(block)
    if hasher.hexdigest() != expected:
        raise ValueError('File missing, changed or stale against recorded SHA256')


# Schema v2 validation.
class RecordError(ValueError):
    """Safe field diagnostic; never include evidence contents or OS exception text."""


def need(condition, field, message):
    if not condition:
        raise RecordError(field + ': ' + message)


def text_value(value):
    return isinstance(value, str) and bool(value.strip()) and value.strip().lower() not in ('unknown', 'null', 'none', 'pending', 'not-yet-launched')


def object_value(value, field):
    need(isinstance(value, dict), field, 'expected object')
    return value


def string_list(value, field, empty=False):
    need(isinstance(value, list) and (empty or bool(value)) and all(text_value(x) for x in value), field, 'expected nonempty strings')
    need(len(value) == len(set(value)), field, 'duplicate identity')
    return value


def identity(value, field):
    value = object_value(value, field)
    for key in ('job_id', 'thread_id'):
        need(text_value(value.get(key)) and re.fullmatch('[A-Za-z0-9][A-Za-z0-9._:-]{0,199}', value[key]), field + '.' + key, 'missing or malformed observed identity')
    return value


def checked_ref(entry, root, field, refs=None):
    try:
        verify_file(entry, root)
    except (ValueError, OSError, TypeError, RuntimeError):
        raise RecordError(field + ': invalid path, missing file or SHA256 mismatch') from None
    if refs is not None:
        refs.add((entry['path'], entry['sha256']))
    return root / entry['path']


def json_ref(entry, root, field, refs=None):
    path = checked_ref(entry, root, field, refs)
    try:
        _, value = load_json(path)
    except (ValueError, OSError, UnicodeError, RecursionError):
        raise RecordError(field + ': malformed or oversized JSON') from None
    return object_value(value, field)


def binding(value, contract, pin, field):
    need(value.get('schema_version') == 2, field + '.schema_version', 'requires version 2')
    need(value.get('task_id') == contract['task_id'], field + '.task_id', 'wrong task')
    need(value.get('contract_sha256') == pin, field + '.contract_sha256', 'stale candidate/config/environment/contract binding')


def validate_v2(contract, receipt, root, pin, capture_path, capture_pin):
    phase = contract.get('phase')
    need(phase in ('planning', 'implementation', 'review', 'release'), 'contract.phase', 'invalid phase')
    if contract['skill'] in ('bg-finish-the-whole-job', 'bg-check-it-before-release', 'bg-ship-and-recover'):
        need(phase != 'planning', 'contract.phase', 'delivery/review/release needs runtime scope')
    source = object_value(contract.get('source'), 'contract.source')
    for key in ('repository', 'base', 'revision'):
        need(text_value(source.get(key)), 'contract.source.' + key, 'missing exact source identity')
    for key in ('config_files', 'environment_files'):
        entries = contract.get(key)
        need(isinstance(entries, list) and bool(entries), 'contract.' + key, 'pin sanitized manifest files')
        for i, ref in enumerate(entries):
            checked_ref(ref, root, 'contract.' + key + '[' + str(i) + ']')
    builders = contract.get('builders')
    need(isinstance(builders, list) and bool(builders), 'contract.builders', 'missing contributing builders')
    for i, builder in enumerate(builders):
        identity(builder, 'contract.builders[' + str(i) + ']')
    obligations = contract.get('candidate_requirements', []) if contract['skill'] == 'bg-check-it-before-release' else []
    ids = contract['required_checks'] + obligations
    string_list(ids, 'contract.check_ids')
    types = object_value(contract.get('evidence_types'), 'contract.evidence_types')
    need(set(types) == set(ids), 'contract.evidence_types', 'must cover every check and candidate requirement exactly')
    for ident in ids:
        need(types[ident] in ('document', 'command', 'visual'), 'contract.evidence_types', 'unsupported evidence type')
    for ident in ('verification', 'production-verification'):
        if ident in ids:
            need(types[ident] == 'command', 'contract.evidence_types.' + ident, 'executed claim requires command evidence')
    if 'visual-evidence' in ids:
        need(types['visual-evidence'] == ('document' if phase == 'planning' else 'visual'), 'contract.evidence_types.visual-evidence', 'phase requires design or runtime visual evidence')
    need(text_value(capture_path) or isinstance(capture_path, Path), 'inspection_capture', 'supply controller capture separately')
    need(isinstance(capture_pin, str) and re.fullmatch('[0-9a-f]{64}', capture_pin), 'inspection_capture.sha256', 'supply controller-owned pin separately')
    try:
        raw, capture = load_json(capture_path)
    except (ValueError, OSError, UnicodeError, RecursionError):
        raise RecordError('inspection_capture: missing or malformed JSON') from None
    need(digest(raw) == capture_pin, 'inspection_capture.sha256', 'capture changed since controller pin')
    capture = object_value(capture, 'inspection_capture')
    binding(capture, contract, pin, 'inspection_capture')
    need(capture.get('status') == 'completed', 'inspection_capture.status', 'inspection incomplete, failed or timed out')
    reviewer = identity(capture.get('reviewer'), 'inspection_capture.reviewer')
    for builder in builders:
        need(reviewer['job_id'] != builder['job_id'], 'inspection_capture.reviewer.job_id', 'same as contributing builder')
        need(reviewer['thread_id'] != builder['thread_id'], 'inspection_capture.reviewer.thread_id', 'same as contributing builder or resumed builder')
    need(text_value(reviewer.get('provider')), 'inspection_capture.reviewer.provider', 'observed checker provider required')
    for key, expected in (('fresh', True), ('resumed', False)):
        need(reviewer.get(key) is expected, 'inspection_capture.reviewer.' + key, 'requires fresh read-only non-resumed inspection')
    need(type(reviewer.get('read_only')) is bool, 'inspection_capture.reviewer.read_only', 'explicit access mode required')
    execution = None
    if reviewer['read_only'] is False:
        need('execution' in capture, 'inspection_capture.reviewer.read_only', 'write access requires verified disposable execution')
        execution = json_ref(capture.get('execution'), root, 'inspection_capture.execution')
        field = 'inspection_capture.execution'
        binding(execution, contract, pin, field)
        need(execution.get('reviewer') == reviewer, field, 'execution must bind the independent checker')
        need(execution.get('kind') == 'disposable-checkout', field, 'writes require a disposable checkout')
        candidate, checkout = execution.get('candidate'), execution.get('checkout')
        need(text_value(candidate) and text_value(checkout), field, 'resolved candidate and checkout required')
        candidate_path, checkout_path = Path(candidate).resolve(), Path(checkout).resolve()
        need(candidate_path.is_absolute() and checkout_path.is_absolute() and Path(candidate).is_absolute() and Path(checkout).is_absolute(), field, 'absolute paths required')
        need(candidate_path != checkout_path and candidate_path not in checkout_path.parents and checkout_path not in candidate_path.parents, field, 'checkout must be separate from candidate')
        need(candidate_path == Path(source['repository']).resolve(), field, 'candidate repository mismatch')
        need(execution.get('permissions_verified') is True and execution.get('candidate_writable') is False, field, 'verified candidate protection required')
        need(execution.get('write_roots') == [checkout], field, 'write access must be scoped to the disposable checkout')
        need(re.fullmatch('[a-f0-9]{40}|[a-f0-9]{64}', source['revision']) is not None, field, 'full commit SHA required')
        for key in ('launch_head', 'completion_head', 'candidate_head_before', 'candidate_head_after'):
            need(execution.get(key) == source['revision'], field + '.' + key, 'exact commit changed')
        state = execution.get('candidate_state_before')
        need(isinstance(state, str) and re.fullmatch('[a-f0-9]{64}', state) is not None, field, 'candidate byte inventory hash required')
        need(execution.get('candidate_state_after') == state, field, 'candidate bytes changed')
    checked_ref(capture.get('host_trace'), root, 'inspection_capture.host_trace')
    need(receipt.get('inspection') == capture.get('result'), 'receipt.inspection', 'not bound to controller-returned result')
    inspection = json_ref(receipt.get('inspection'), root, 'receipt.inspection')
    binding(inspection, contract, pin, 'inspection')
    if 'raw_review' in inspection:
        checked_ref(inspection['raw_review'], root, 'inspection.raw_review')
    need(inspection.get('reviewer') == reviewer, 'inspection.reviewer', 'does not match observed launch/result identity')
    need(inspection.get('status') == 'completed', 'inspection.status', 'inspection incomplete, failed or timed out')
    need(inspection.get('verdict') in ('ready', 'changes-required', 'blocked'), 'inspection.verdict', 'invalid verdict')
    need(isinstance(inspection.get('limitations'), list) and all(text_value(x) for x in inspection['limitations']), 'inspection.limitations', 'explicit list required (empty allowed)')
    records = receipt['checks'] + (receipt.get('candidate_checks', []) if obligations else [])
    need(inspection.get('coverage') == records, 'inspection.coverage', 'must match exact check results and evidence')
    used = set()
    by_id = {record['id']: record for record in records}

    def evidence(ref, expected_kind, check_id, status, field, depth=0):
        need(depth <= 1, field, 'nested evidence cycle')
        item = json_ref(ref, root, field, used)
        binding(item, contract, pin, field)
        need(item.get('check_id') == check_id, field + '.check_id', 'wrong check')
        need(item.get('status') == status, field + '.status', 'does not match recorded result')
        kind = item.get('kind')
        if kind == 'gap':
            need(status in ('blocked', 'unknown'), field + '.kind', 'gap cannot prove execution or pass')
            for key in ('reason', 'owner', 'next_action'):
                need(text_value(item.get(key)), field + '.' + key, 'gap needs accountable explanation')
            return
        need(kind == expected_kind, field + '.kind', 'wrong evidence type; prose cannot prove execution')
        if kind == 'document':
            need(text_value(item.get('summary')), field + '.summary', 'missing design/accounting conclusion')
            sources = item.get('sources')
            need(isinstance(sources, list) and bool(sources), field + '.sources', 'missing inspected sources')
            for i, source_ref in enumerate(sources):
                checked_ref(source_ref, root, field + '.sources[' + str(i) + ']', used)
        elif kind == 'command':
            need(isinstance(item.get('argv'), list) and item['argv'] and all(text_value(x) for x in item['argv']), field + '.argv', 'missing actual argument vector')
            need(text_value(item.get('cwd')), field + '.cwd', 'missing actual runner cwd')
            identity(item.get('runner'), field + '.runner')
            if execution is not None:
                need(Path(item['cwd']).resolve() == Path(execution['checkout']).resolve(), field + '.cwd', 'checker commands must run in disposable checkout')
                need(all(item['runner'][k] == reviewer[k] for k in ('job_id', 'thread_id')), field + '.runner', 'command must belong to independent checker')
            for key in ('started_at', 'finished_at'):
                need(text_value(item.get(key)), field + '.' + key, 'missing runner timestamp')
            need(type(item.get('timed_out')) is bool, field + '.timed_out', 'expected boolean')
            code = item.get('exit_code')
            need(type(code) is int or (code is None and item['timed_out']), field + '.exit_code', 'missing actual exit result')
            if status == 'pass':
                need(code == 0 and not item['timed_out'], field + '.exit_code', 'failed or timed-out command cannot pass')
            if status == 'fail':
                need(type(code) is int and code != 0 and not item['timed_out'], field + '.exit_code', 'failed command needs nonzero exit; use gap for unrun checks')
            for key in ('stdout', 'stderr'):
                checked_ref(item.get(key), root, field + '.' + key, used)
        elif kind == 'visual':
            need(phase != 'planning', field + '.kind', 'planning evidence must remain design evidence')
            ui = object_value(contract.get('ui'), 'contract.ui')
            need(text_value(ui.get('surface')) and item.get('surface') == ui['surface'], field + '.surface', 'wrong actual target surface')
            need(item.get('target') == source, field + '.target', 'wrong running candidate/source')
            for key in ('decision', 'approved_tokens', 'reference_screenshot'):
                need(item.get(key) == ui.get(key) and isinstance(ui.get(key), dict), field + '.' + key, 'not bound to recorded visual decision')
                checked_ref(item[key], root, field + '.' + key, used)
            checked_ref(item.get('running_screenshot'), root, field + '.running_screenshot', used)
            need(item['running_screenshot']['path'] != item['reference_screenshot']['path'], field + '.running_screenshot', 'separate running and reference captures required')
            need(item.get('clipping') in ('pass', 'fail', 'unknown'), field + '.clipping', 'missing clipping result')
            components = [item['clipping']]
            for key in ('token_guard', 'overflow_check'):
                command = json_ref(item.get(key), root, field + '.' + key)
                command_status = command.get('status')
                need(command_status in ('pass', 'fail', 'blocked', 'unknown'), field + '.' + key + '.status', 'invalid command status')
                evidence(item.get(key), 'command', check_id, command_status, field + '.' + key, depth + 1)
                components.append(command_status)
            # A defect remains a failure even when another check is unavailable.
            aggregate = next((s for s in ('fail', 'blocked', 'unknown') if s in components), 'pass')
            need(status == aggregate, field + '.status', 'does not match derived visual aggregate')

    for i, record in enumerate(records):
        for j, ref in enumerate(record.get('evidence', [])):
            evidence(ref, types[record['id']], record['id'], record['status'], 'checks[' + str(i) + '].evidence[' + str(j) + ']')
    prior = contract.get('prior_findings')
    need(isinstance(prior, list), 'contract.prior_findings', 'explicit retained lineage required (empty allowed)')
    findings = inspection.get('findings')
    need(isinstance(findings, list), 'inspection.findings', 'explicit finding list required')
    found = {}
    for i, finding in enumerate(findings):
        field = 'inspection.findings[' + str(i) + ']'
        object_value(finding, field)
        for key in ('id', 'owner', 'next_action', 'closure_requirement'):
            need(text_value(finding.get(key)), field + '.' + key, 'missing finding accountability')
        need(finding['id'] not in found, field + '.id', 'duplicate finding')
        found[finding['id']] = finding
        requirements = string_list(finding.get('requirement_ids'), field + '.requirement_ids')
        need(set(requirements).issubset(ids), field + '.requirement_ids', 'unbound requirement')
        need(finding.get('severity') in ('critical', 'high', 'medium', 'low'), field + '.severity', 'missing severity')
        need(finding.get('status') in ('open', 'closed'), field + '.status', 'invalid finding status')
        if finding['status'] == 'closed':
            closures = string_list(finding.get('closure_check_ids'), field + '.closure_check_ids')
            need(all(c in by_id and by_id[c]['status'] == 'pass' for c in closures), field + '.closure_check_ids', 'closure requires current passing evidence')
        else:
            need(inspection['verdict'] != 'ready', field + '.status', 'ready cannot drop open findings')
    prior_ids = []
    for i, old in enumerate(prior):
        field = 'contract.prior_findings[' + str(i) + ']'
        object_value(old, field)
        need(text_value(old.get('id')) and old['id'] in found, field + '.id', 'prior finding silently dropped')
        prior_ids.append(old['id'])
        for key in ('owner', 'requirement_ids', 'closure_requirement'):
            need(key in old and found[old['id']].get(key) == old[key], field + '.' + key, 'finding lineage changed')
    string_list(prior_ids, 'contract.prior_findings.ids', empty=True)
    for record in records:
        if record['status'] != 'pass':
            finding = record.get('finding', {})
            need(isinstance(finding, dict) and finding.get('id') in found, 'inspection.findings', 'non-pass result needs retained finding')
            retained = found[finding['id']]
            need(retained['status'] == 'open' and record['id'] in retained['requirement_ids'], 'inspection.findings', 'non-pass finding must stay open and cover requirement')
            need(all(finding.get(k) == retained[k] for k in ('owner', 'next_action')), 'inspection.findings', 'finding owner/action mismatch')
    captured = capture.get('artifacts')
    need(isinstance(captured, list), 'inspection_capture.artifacts', 'missing observed evidence inventory')
    observed = set()
    for i, ref in enumerate(captured):
        checked_ref(ref, root, 'inspection_capture.artifacts[' + str(i) + ']', observed)
    need(observed == used and len(observed) == len(captured), 'inspection_capture.artifacts', 'evidence not bound to actual returned inspection capture')
    if contract['skill'] == 'bg-check-it-before-release':
        need(receipt.get('candidate_verdict') == inspection['verdict'], 'receipt.candidate_verdict', 'does not match independent verdict')
    elif contract['skill'] != 'bg-ship-and-recover':
        need(inspection['verdict'] == 'ready', 'inspection.verdict', 'non-ready inspection prevents successful handover')
    if inspection['verdict'] == 'ready':
        need(all(record['status'] == 'pass' for record in records), 'inspection.verdict', 'ready contradicts failed/blocked/unknown evidence')
    return inspection


def validate(contract_path, receipt_path, root, skill, expected_contract_hash, inspection_capture=None, inspection_capture_hash=None):
    errors = []
    root = Path(root).resolve(strict=True)
    raw, contract = load_json(contract_path)
    _, receipt = load_json(receipt_path)
    if skill not in PROFILES:
        raise ValueError('Unknown installed skill profile')
    if not isinstance(expected_contract_hash, str) or not re.fullmatch('[0-9a-f]{64}', expected_contract_hash):
        raise ValueError('A pinned contract SHA256 is required')
    if digest(raw) != expected_contract_hash:
        raise ValueError('Contract changed since its supplied pin; do not weaken requirements')
    if not isinstance(contract, dict) or not isinstance(receipt, dict):
        raise ValueError('Contract and receipt must be objects')
    if contract.get('schema_version') != 2 or receipt.get('schema_version') != 2:
        raise RecordError('schema_version: version 1 prose receipts retired; migrate to version 2 with typed evidence and controller capture')
    task = contract.get('task_id')
    if not isinstance(task, str) or not task.strip() or contract.get('skill') != skill:
        raise ValueError('Contract task/skill missing or mismatched')
    if receipt.get('task_id') != task or receipt.get('contract_sha256') != expected_contract_hash:
        raise ValueError('Receipt belongs to a different task or contract')
    required = contract.get('required_checks')
    if not isinstance(required, list) or not required or not all(isinstance(x, str) and x.strip() for x in required) or len(set(required)) != len(required):
        raise ValueError('Required checks must be unique nonempty strings')
    if not PROFILES[skill].issubset(required):
        raise ValueError('Mandatory skill checks removed from contract')
    candidates = contract.get('candidate_files')
    if not isinstance(candidates, list) or not candidates:
        raise ValueError('Pin at least the actual brief/checkpoint/source/artifact being assessed')
    for i, entry in enumerate(candidates):
        checked_ref(entry, root, 'contract.candidate_files[' + str(i) + ']')
    checks = receipt.get('checks')
    if not isinstance(checks, list) or not all(isinstance(x, dict) for x in checks):
        raise ValueError('Missing check records')
    ids = [x.get('id') for x in checks]
    if not all(isinstance(x, str) for x in ids) or len(set(ids)) != len(ids):
        raise ValueError('Invalid or duplicate check IDs')
    if set(ids) != set(required):
        raise ValueError('Check records do not exactly cover the pinned requirements')
    for check_index, check in enumerate(checks):
        ident = check['id']
        if check.get('status') != 'pass':
            errors.append(ident + ': incomplete, failed, unknown or not applicable; do not claim stage success')
        evidence = check.get('evidence')
        if not isinstance(evidence, list) or not evidence:
            errors.append(ident + ': no evidence files')
        else:
            for evidence_index, entry in enumerate(evidence):
                checked_ref(entry, root, 'receipt.checks[' + str(check_index) + '].evidence[' + str(evidence_index) + ']')
    verdict, candidate_results = None, None
    if skill == 'bg-check-it-before-release':
        verdict = receipt.get('candidate_verdict')
        if verdict not in ('ready', 'changes-required', 'blocked'):
            raise ValueError('Assessment needs an explicit candidate verdict')
        obligations = contract.get('candidate_requirements')
        if not isinstance(obligations, list) or not obligations or not all(isinstance(x, str) and x.strip() for x in obligations) or len(set(obligations)) != len(obligations):
            raise ValueError('Pin a unique nonempty candidate requirement list separately from assessment checks')
        results = receipt.get('candidate_checks')
        if not isinstance(results, list) or not all(isinstance(x, dict) for x in results):
            raise ValueError('Missing candidate result records')
        identities = [x.get('id') for x in results]
        if not all(isinstance(x, str) for x in identities) or len(set(identities)) != len(identities) or set(identities) != set(obligations):
            raise ValueError('Candidate results do not exactly cover pinned candidate requirements')
        candidate_results = {status: 0 for status in ('pass', 'fail', 'blocked', 'unknown')}
        for result_index, result in enumerate(results):
            status, ident = result.get('status'), result['id']
            if not isinstance(status, str) or status not in candidate_results:
                raise ValueError('Candidate result must be pass, fail, blocked or unknown')
            candidate_results[status] += 1
            evidence = result.get('evidence')
            if not isinstance(evidence, list) or not evidence:
                errors.append(ident + ': candidate result or gap needs evidence')
            else:
                for evidence_index, entry in enumerate(evidence):
                    checked_ref(entry, root, 'receipt.candidate_checks[' + str(result_index) + '].evidence[' + str(evidence_index) + ']')
            if status != 'pass':
                finding = result.get('finding')
                if not isinstance(finding, dict) or not all(isinstance(finding.get(key), str) and finding[key].strip() for key in ('id', 'owner', 'next_action')):
                    errors.append(ident + ': retain finding ID, responsible owner and next action')
        if verdict == 'ready' and candidate_results['pass'] != len(obligations):
            errors.append('A ready verdict contradicts failed, blocked or unknown candidate requirements')
    validate_v2(contract, receipt, root, expected_contract_hash, inspection_capture, inspection_capture_hash)
    return {'gate': 'PASS_RECORD' if not errors else 'FAIL_RECORD', 'skill': skill,
            'task_id': task, 'contract_sha256': expected_contract_hash, 'errors': errors,
            'meaning': 'Local record completeness and hash consistency only; not semantic truth or approval',
            'assessment_complete': skill == 'bg-check-it-before-release' and not errors,
            'candidate_verdict': verdict, 'candidate_results': candidate_results, 'candidate_accepted': False,
            'authorizes_external_action': False, 'host_action_interception_installed': False}


def default_skill():
    """Profile of the skill folder that holds this script; the review profile elsewhere."""
    folder = Path(__file__).resolve().parents[1].name
    return folder if folder in PROFILES else 'bg-check-it-before-release'


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--contract', required=True)
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--root', required=True)
    parser.add_argument('--contract-sha256', required=True)
    parser.add_argument('--inspection-capture', required=True)
    parser.add_argument('--inspection-capture-sha256', required=True)
    # One shared copy serves every skill. The pinned contract must name the same skill,
    # so a worker cannot pick a weaker profile than the dispatcher pinned.
    parser.add_argument('--skill', choices=sorted(PROFILES), default=default_skill(),
                        help='profile to validate against (default: %(default)s; use bg-ship-and-recover at release)')
    args = parser.parse_args()
    skill = args.skill
    try:
        result = validate(args.contract, args.receipt, args.root, skill, args.contract_sha256, args.inspection_capture, args.inspection_capture_sha256)
    except (ValueError, OSError, TypeError, KeyError, RecursionError, RuntimeError) as exc:
        result = {'gate': 'FAIL_RECORD', 'assessment_complete': False, 'candidate_accepted': False, 'candidate_verdict': None, 'candidate_results': None, 'errors': [str(exc) if isinstance(exc, ValueError) and not isinstance(exc, json.JSONDecodeError) else 'record: invalid shape, pin, path or missing evidence; reconcile locally'],
                  'authorizes_external_action': False, 'host_action_interception_installed': False}
    print(json.dumps(result))
    return 0 if result['gate'] == 'PASS_RECORD' else 1


if __name__ == '__main__':
    sys.exit(main())
