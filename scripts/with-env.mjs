import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const envFile = process.env.ENV_FILE ?? (fs.existsSync('.env') ? '.env' : 'bien.env');
dotenv.config({ path: envFile });

const [tool, ...args] = process.argv.slice(2);
const commands = {
  next: require.resolve('next/dist/bin/next'),
  prisma: require.resolve('prisma/build/index.js'),
  seed: path.resolve('prisma/seed.js'),
  seedMacKhen: path.resolve('prisma/seed-mac-khen-products.js'),
  rollback: path.resolve('prisma/rollback.mjs'),
};

if (!tool || !commands[tool]) throw new Error(`Unsupported command: ${tool ?? ''}`);

const child = spawn(process.execPath, [commands[tool], ...args], { stdio: 'inherit', env: process.env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});