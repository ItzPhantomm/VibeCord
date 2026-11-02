#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distEntry = join(__dirname, '..', 'dist', 'cli', 'index.js');

if (existsSync(distEntry)) {
  const mod = await import(distEntry);
  if (typeof mod.runCli === 'function') {
    await mod.runCli();
  }
} else {
  // Development mode: execute via tsx
  const { spawnSync } = await import('node:child_process');
  const srcEntry = join(__dirname, '..', 'src', 'cli', 'index.ts');
  const tsxBin = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const result = spawnSync(tsxBin, [srcEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 0);
}
