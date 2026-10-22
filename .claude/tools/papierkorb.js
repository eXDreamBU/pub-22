#!/usr/bin/env node
// Papierkorb: "delete" files or folders inside the project by moving them to .papierkorb/<stamp>/, keeping their
// relative path. Moving is reversible, so it is allowed where rm -rf is refused.
// Use: node .claude/tools/papierkorb.js <path> [<path> ...]    restore: move the folder back from .papierkorb/.
// Refuses anything outside the project, the project root itself, .git, .claude and .papierkorb. Emptying is Ilker's.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BIN = path.join(ROOT, '.papierkorb');
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node .claude/tools/papierkorb.js <path> ...'); process.exit(1); }

let failed = 0;
for (const a of args) {
  const src = path.resolve(a);
  const rel = path.relative(ROOT, src);
  const top = rel.split(path.sep)[0].toLowerCase();
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || ['.git', '.claude', '.papierkorb'].includes(top)) {
    console.error(`refused (outside the allowed area): ${a}`); failed++; continue;
  }
  if (!fs.existsSync(src)) { console.error(`not found: ${a}`); failed++; continue; }
  const dst = path.join(BIN, stamp, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try { fs.renameSync(src, dst); }
  catch (e) {   // EXDEV or a locked file: copy, then remove the original
    if (e.code !== 'EXDEV') { console.error(`failed: ${a}: ${e.code} (is the file open in another program?)`); failed++; continue; }
    fs.cpSync(src, dst, { recursive: true }); fs.rmSync(src, { recursive: true, force: true });
  }
  console.log(`moved: ${rel} -> ${path.relative(ROOT, dst)}`);
}
process.exit(failed ? 1 : 0);
