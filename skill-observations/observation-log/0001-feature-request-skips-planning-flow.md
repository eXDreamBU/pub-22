---
id: 1
title: "Feature request in an existing project skipped the stage-0 + lavish plan flow"
status: actioned
type: internal
skill: [neues-projekt]
proposes_skill: [neue-version]
target_file: []
siblings_checked: "none: neues-projekt belongs to no family"
area: "trigger scope: only new projects get stage 0 and the lavish plan"
date: 2026-10-22
session_context: "Pub 22: Ilker asked how to add shift close (Kasse buchen per shift) and revenue overview to the existing app"
parked_until:
resolved: 2026-10-22
resolution: "New global skill ~/.claude/skills/neue-version (Ilker chose it in chat 2026-10-22)"
reference:
commands_verified: none
---

**Issue:** Ilker described a bigger new feature for the existing Pub 22 app (shift close, daily revenue, overview). I answered with a loose AskUserQuestion bundle and no lavish plan page, although the global CLAUDE.md says "Plan bigger work as a lavish page". The neues-projekt skill, which carries the stage-0 -> lavish plan -> yes -> build -> gate flow, only triggers on new projects, so nothing loaded the flow. Ilker corrected it twice: he expects that flow every time, without having to say "neues Projekt".

**Suggested improvement:** A skill for extending an existing project (working name neue-version) with the same flow: stage-0 bundle, lavish plan page in `docs/plan-<version>.html` at the quality of the first plan (screen sketches, flow diagram, decisions as in-page forms, risks), build nothing before his yes, then branch, tests, screenshot, gate. Its description triggers on any described new feature or version in an existing project.

**Principle:** A planning flow that only a "new project" trigger loads is skipped for every later feature; the trigger must follow the size of the work, not whether the folder is new.
