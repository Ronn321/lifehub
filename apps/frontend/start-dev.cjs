// Wrapper to start Next.js dev server and capture output
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, '..', '..', 'next-dev.log');
const stream = fs.createWriteStream(logFile, { flags: 'w' });

const child = spawn('npx.cmd', ['next', 'dev', '-p', '3001'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
  shell: true,
});

child.stdout.on('data', (d) => { stream.write(d); });
child.stderr.on('data', (d) => { stream.write(d); });
child.on('exit', (code) => {
  stream.write(`\n=== EXIT CODE: ${code} ===\n`);
  stream.end();
  process.exit(code ?? 0);
});

process.on('SIGTERM', () => {
  child.kill();
  stream.end();
  process.exit(0);
});

console.log(`Frontend dev server started (PID ${child.pid}), log: ${logFile}`);
