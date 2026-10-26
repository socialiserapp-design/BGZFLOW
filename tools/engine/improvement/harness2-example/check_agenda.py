"""Trusted exact-byte oracle independent of recipe and builder implementation."""
import json
from pathlib import Path

root = Path.cwd()
records = json.loads((root / 'input.json').read_bytes())['items']
expected = ('# Agenda\n\n' + '\n'.join('- ' + record for record in records) + '\n').encode()
actual = (root / 'agenda.md').read_bytes()
if actual != expected:
    raise SystemExit('Synthetic agenda differs from the requested records.')
print('Exact requested agenda bytes verified.')
