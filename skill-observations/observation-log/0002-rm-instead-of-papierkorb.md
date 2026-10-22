---
id: 2
title: "Deleted a just-created file with rm inside a chained shell command instead of the papierkorb tool"
status: open
type: internal
skill: []
proposes_skill: []
target_file: ["CLAUDE.md"]
siblings_checked: "none: target is the project CLAUDE.md, not a skill family"
area: "file deletion rule (papierkorb) under quick cleanup inside a multi-step bash command"
date: 2026-10-22
session_context: "Pub 22 plan 0.4: inlined the logo into the plan page as base64, then removed the now-unused copy docs/img/logo.jpg with rm -f and rmdir"
parked_until:
resolved:
resolution:
reference:
commands_verified: "NOT RUN: the papierkorb call was not made; the file was a copy created minutes earlier (original still in public/logo.jpg and the chat image folder), so nothing was lost"
---

**Issue:** CLAUDE.md says "Delete only with `node .claude/tools/papierkorb.js <path>`". While tidying up after inlining an image, I chained `rm -f docs/img/logo.jpg; rmdir docs/img` into the same bash call as an edit. The rule was in context, but no barrier caught it. Here the file was my own minutes-old copy, so nothing was lost; the same reflex on a user file would be.

**Suggested improvement:** First violation, so make the wording more visible: in CLAUDE.md "Working here", write "never `rm`/`rmdir`/`Remove-Item`, not even for files you just created". If it happens again, add a structural barrier: a PreToolUse hook that refuses Bash commands containing `rm ` / `rmdir` in this project and points to papierkorb.js.

**Principle:** A delete rule that names only the allowed tool gets skipped for "cleanup of my own temp copy"; the rule must say explicitly that it covers files the agent created itself.
