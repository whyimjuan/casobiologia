// Ensambla public/case/expediente.json a partir de las carpetas de data-src/.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../data-src/', import.meta.url).pathname;
const meta = JSON.parse(readFileSync(join(dir, 'case.json'), 'utf8'));
const folders = readdirSync(dir).filter((f) => /^folder-\d+\.json$/.test(f)).sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const out = new URL('../public/case/expediente.json', import.meta.url).pathname;
writeFileSync(out, JSON.stringify({ ...meta, folders }, null, 1));
console.log(`expediente.json: ${folders.length} carpetas, ${folders.reduce((n, f) => n + f.documents.length, 0)} documentos`);
