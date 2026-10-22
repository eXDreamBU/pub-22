#!/usr/bin/env node
// One hook for SessionStart, PreCompact and PostCompact: prints the project state (JETZT.md, newest handoff)
// and, at session start, the task-observer activation block with this project's absolute path filled in.
// Never blocks: a missing file is reported, the exit code stays 0.
const fs = require('fs');
const path = require('path');

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const event = input.hook_event_name || process.argv[2] || 'SessionStart';
const ROOT = process.env.CLAUDE_PROJECT_DIR || input.cwd || path.resolve(__dirname, '..', '..');
const rootSlash = ROOT.replace(/\\/g, '/');

const read = (rel, maxLines = 60) => {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').slice(0, maxLines).join('\n').trim(); }
  catch { return null; }
};
const newestHandoff = () => {
  try {
    const files = fs.readdirSync(path.join(ROOT, 'uebergabe')).filter(f => f.endsWith('.md')).sort();
    return files.length ? `uebergabe/${files[files.length - 1]}` : null;
  } catch { return null; }
};

const out = [];
const jetzt = read('JETZT.md', 20);
const handoff = newestHandoff();

if (event === 'SessionStart') {
  out.push('=== JETZT.md ===', jetzt || 'JETZT.md fehlt: anlegen (Version, Ziel, nächste Schritte, max. 10 Zeilen).');
  if (handoff) out.push('', `=== Neueste Übergabe: ${handoff} ===`, read(handoff, 40));
  const act = read('.claude/docs/task-observer-activation.md', 200);
  if (act) out.push('', '=== task-observer ===', act.split('{{ROOT}}').join(rootSlash));
} else if (event === 'PreCompact') {
  out.push('=== Stand vor der Kompaktierung (in die Zusammenfassung übernehmen) ===', jetzt || '(JETZT.md fehlt)');
  const offen = read('OFFEN.md', 30);
  if (offen) out.push('', '=== OFFEN.md (Anfang) ===', offen);
  if (handoff) out.push('', `Neueste Übergabe: ${handoff}`);
} else if (event === 'PostCompact') {
  out.push('=== Nach der Kompaktierung ===',
    `Lies jetzt JETZT.md${handoff ? ` und ${handoff}` : ''}, bevor du weiterarbeitest.`);
}

if (out.length) console.log(out.join('\n'));
process.exit(0);
