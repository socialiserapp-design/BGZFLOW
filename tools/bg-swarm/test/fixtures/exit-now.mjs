const lines = Number(process.argv[2] || 0);
for (let i = 1; i <= lines; i += 1) process.stderr.write(`line ${i}\n`);
process.exit(2);
