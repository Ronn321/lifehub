#!/usr/bin/env node
// Dev-Helper: startet den gebundleten Backend-Server mit Log-File-Output.
// PID wird in .backend.pid gespeichert, damit man sauber stoppen kann.

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const outdir = path.join(projectRoot, 'apps', 'backend', 'dist');
const logfile = path.join(projectRoot, 'apps', 'backend', 'backend.log');
const pidfile = path.join(projectRoot, 'apps', 'backend', 'backend.pid');

if (!existsSync(path.join(outdir, 'main.js'))) {
  console.error('❌ dist/main.js not found. Run `node scripts/build-and-run.mjs` first.');
  process.exit(1);
}

const out = openSync(logfile, 'a');
const err = openSync(logfile, 'a');

console.log('▶  Starting node dist/main.js, logs →', logfile);

const child = spawn(process.execPath, [path.join(outdir, 'main.js')], {
  stdio: ['ignore', out, err],
  env: process.env,
  windowsHide: false,
  detached: false,
});

writeFileSync(pidfile, String(child.pid));
console.log(`✅ Started, PID ${child.pid}, logfile: ${logfile}`);

child.unref();
setTimeout(() => process.exit(0), 500);
