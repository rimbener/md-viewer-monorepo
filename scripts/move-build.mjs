import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { argv } from 'node:process';

const [from, to] = argv.slice(2);
if (!from || !to) {
  throw new Error('usage: move-build.mjs <from> <to>');
}

rmSync(to, { recursive: true, force: true });
mkdirSync(dirname(to), { recursive: true });
renameSync(from, to);
