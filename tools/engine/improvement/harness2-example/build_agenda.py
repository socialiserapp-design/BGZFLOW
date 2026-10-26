"""Trusted fixed local effect, authored by BGZFLOW. Input is synthetic only."""
import json
from pathlib import Path
from recipe import decode

root = Path.cwd()
recipe = decode((root / 'recipe.json').read_text(encoding='utf-8'))
items = json.loads((root / 'input.json').read_text(encoding='utf-8'))['items']
if recipe['selection'] == 'omit-last':
    items = items[:-1]
elif recipe['selection'] == 'reverse':
    items = list(reversed(items))
output = '# Agenda\n\n' + ''.join('- ' + item + '\n' for item in items)
(root / 'agenda.md').write_bytes(output.encode('utf-8'))
with (root / 'effects.jsonl').open('a', encoding='utf-8', newline='\n') as stream:
    stream.write(json.dumps({'effect': 'write-agenda', 'artifact': 'agenda.md'}) + '\n')
print('Synthetic agenda written.')
