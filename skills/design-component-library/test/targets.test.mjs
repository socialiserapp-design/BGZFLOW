import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {requireTargets} from '../scripts/_targets.mjs';
test('explicit HTTP test instance is accepted without broadening authority',()=>assert.deepEqual(requireTargets(['http://localhost:4317/test']),['http://localhost:4317/test']));
test('existing owned HTML fixture is represented by a properly escaped file URL',()=>{const file=fileURLToPath(new URL('./fixture with spaces.html',import.meta.url));assert.match(requireTargets([file])[0],/^file:.*fixture%20with%20spaces.html$/);});
for(const targets of [[],['one','two'],['javascript:alert(1)'],['data:text/html,hello'],['http://name:password@localhost/test'],['missing-test-file.html']])test('invalid target is unavailable rather than a pass: '+targets.length+' arguments '+(targets[0]?.split(':')[0]||'none'),()=>assert.throws(()=>requireTargets(targets)));
