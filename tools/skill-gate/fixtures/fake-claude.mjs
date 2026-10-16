// Stand-in for `claude plugin eval` in the skill-gate tests. It checks the staged plugin the gate hands it, logs
// its arguments to FAKE_CLAUDE_LOG and writes a saved result: FAKE_CANDIDATE for the candidate copy,
// FAKE_PREVIOUS for the previous one.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = args[2];
const jsonFile = args[args.indexOf('--json') + 1];
fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify(args) + '\n');

const skillsDir = path.join(target, 'skills');
const leftover = fs.existsSync(skillsDir) && fs.readdirSync(skillsDir).some((s) => fs.existsSync(path.join(skillsDir, s, 'evals')));
if (!fs.existsSync(path.join(target, 'evals')) || leftover) {
  process.stderr.write('staged plugin is wrong: cases must sit at evals/ and nowhere under skills/\n');
  process.exit(3);
}
const side = path.basename(target).startsWith('candidate') ? 'FAKE_CANDIDATE' : 'FAKE_PREVIOUS';
fs.copyFileSync(process.env[side], jsonFile);
process.exit(1); // like a real run with a case below the threshold: the result is still written
