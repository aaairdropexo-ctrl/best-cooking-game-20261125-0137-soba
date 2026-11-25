// Soba After Midnight — entrypoint. One job: hand the game in.
// It copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from the
// kit's vendor library. Nothing else. Node standard library only.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Copy one tree, entries in sorted order, so two runs write the same
// bytes. Timestamps are never copied into the output.
function copyTree(name: string): void {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  cpSync(src, dst, { recursive: true });
}

function handIn(): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree('game');
  copyTree('screenshots');
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log('handed in: game/ + screenshots/ + dossier.json -> ' + outDir);
}

handIn();
