#!/usr/bin/env node
// Cross-platform JWT key generator (Windows-kompatibel, da OpenSSL nicht überall verfügbar)
// Erzeugt RS256-Keypair via Node crypto, schreibt base64 nach .env

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

console.log('▶  Generating RS256 keypair (2048-bit)...');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privB64 = Buffer.from(privateKey, 'utf8').toString('base64');
const pubB64 = Buffer.from(publicKey, 'utf8').toString('base64');

const envPath = path.join(repoRoot, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent
    .split('\n')
    .filter((l) => !l.startsWith('JWT_PRIVATE_KEY_BASE64=') && !l.startsWith('JWT_PUBLIC_KEY_BASE64='))
    .join('\n');
  if (envContent && !envContent.endsWith('\n')) envContent += '\n';
}
envContent += `JWT_PRIVATE_KEY_BASE64=${privB64}\n`;
envContent += `JWT_PUBLIC_KEY_BASE64=${pubB64}\n`;
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ JWT keys generated and appended to .env');
console.log('   (do NOT commit .env or the .pem files)');
