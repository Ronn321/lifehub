#!/usr/bin/env node
// Backend-Build + detached Server-Start.
// Workaround für tsx 4.22: ignorierte tsconfig-extends für Decorators.
// Workaround für esbuild: Swagger braucht emitDecoratorMetadata, der Rest crasht ohne.
// Lösung: explizites esbuild-Build, dann detached node-Spawn.

import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(outdir, { recursive: true });

const tsconfig = {
  compilerOptions: {
    experimentalDecorators: true,
    emitDecoratorMetadata: true,  // PFLICHT für NestJS DI (sonst this.users = undefined)
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    resolveJsonModule: true,
  },
};

const external = [
  // NestJS-Optionals (ziehen kafka/mqtt/grpc/websocket-Stack mit, den wir nicht brauchen)
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@nestjs/platform-socket.io',
  '@grpc/*', 'kafkajs', 'mqtt', 'nats', 'amqplib', 'amqp-connection-manager',
  '@nestjs/platform-ws', 'ws', 'socket.io',
  'class-transformer/storage',
  // Native Module (.node-Binaries, müssen extern bleiben weil esbuild sie nicht bundlen kann)
  'argon2', 'bcrypt', 'better-sqlite3', 'sharp', '@swc/core',
  // Frontend-Pakete (versehentlich transitiv reingezogen via shadcn-Deps)
  'next', 'react', 'react-dom',
  // node:fs, node:stream etc. müssen extern bleiben (Node built-ins)
  // werden aber von esbuild automatisch als external erkannt.
];

console.log('▶  esbuild → dist/main.js');
await build({
  entryPoints: [path.join(__dirname, '..', 'src', 'main.ts')],
  outfile: path.join(outdir, 'main.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  tsconfigRaw: tsconfig,
  external,
  logLevel: 'info',
});

console.log('✅ Built. Starting node dist/main.js (detached)...');
const child = spawn(process.execPath, [path.join(outdir, 'main.js')], {
  stdio: 'inherit',
  env: process.env,
  detached: true,
  windowsHide: false,
});
child.unref();
process.exit(0);
