#!/usr/bin/env node
import { main } from './lessons/lessons.mjs';

const [command, ...args] = process.argv.slice(2);
if (command === 'lessons') main(args);
else {
  console.log('usage: bgz lessons <add|due|review|status> [options]');
  if (command && !['--help', '-h'].includes(command)) process.exitCode = 2;
}
