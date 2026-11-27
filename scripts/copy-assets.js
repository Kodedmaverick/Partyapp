// Copies self-hosted geo data and flag SVGs into public/ so nothing loads from a CDN on the night.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pub = path.join(root, 'public');
fs.mkdirSync(path.join(pub, 'geo'), { recursive: true });
for (const k of ['110m', '50m']) fs.copyFileSync(path.join(root, 'node_modules/world-atlas', `countries-${k}.json`), path.join(pub, 'geo', `countries-${k}.json`));
const src = path.join(root, 'node_modules/flag-icons/flags/4x3'), dst = path.join(pub, 'flags');
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log('assets copied');
