import os from 'node:os';

process.stdout.write(`prio ${os.getPriority()}\n`);
process.stdout.write(`heavy ${process.env.BG_HEAVY}\n`);
