#!/usr/bin/env node
// PreToolUse guard (global rule "push only with git push no-mistakes"): refuses every other git push and any force push.
// Exit 2 = blocked, the message goes back to Claude.
const fs = require('fs');

let cmd = '';
try { cmd = String(JSON.parse(fs.readFileSync(0, 'utf8') || '{}').tool_input?.command || ''); } catch {}
if (!/\bgit\b[^;&|\n]*\bpush\b/.test(cmd)) process.exit(0);

const pushes = cmd.match(/\bgit\b[^;&|\n]*\bpush\b[^;&|\n]*/g) || [];
for (const p of pushes) {
  if (/\s(--force\b|-f\b|--force-with-lease\b|\+\S)/.test(p)) {
    console.error('Blocked: force push is never allowed here.');
    process.exit(2);
  }
  if (!/\bpush\s+no-mistakes\b/.test(p)) {
    console.error('Blocked: push only with "git push no-mistakes" (global CLAUDE.md). It validates the branch and opens the PR.');
    process.exit(2);
  }
}
process.exit(0);
