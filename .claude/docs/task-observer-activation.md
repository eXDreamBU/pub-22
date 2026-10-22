# task-observer activation

task-observer: rebelytics/one-skill-to-rule-them-all, CC BY 4.0, Eoghan Henn. The start hook prints this block; the full rules
live in the skill itself. Each project has its own observations: they are about this project's skills and problems.

- Before the first tool call of a session that will use tools (and before writing a plan), invoke task-observer and run its
  Session Start Protocol in that first batch: storage check, frontmatter scan, review trigger. Plan mode: run only the read
  parts, write the checkpoint line right after the mode lifts.
- Pick skills by the decision the request is about, not by the file it arrived as.
- At each skill load, grep the log for open observations naming it and let them change THIS task:
  `find "{{ROOT}}/skill-observations/observation-log" -maxdepth 1 -name '*.md' -exec grep -l "skill:.*<name>" {} +`
- After each task, list the observation files written this session and report them in one line (or "none, because …").
- New observation files only through
  `bash "{{ROOT}}/.claude/skills/task-observer/scripts/new-observation.sh" <slug> "{{ROOT}}"`
- Workspace (never derive from the cwd): `{{ROOT}}`
  → log `skill-observations/observation-log/`, principles `skill-observations/cross-cutting-principles.md`,
  staging `skill-updates/` with `skill-updates/PENDING.md`.
- Subagents skip the protocol and report what they noticed under "Beobachtungen"; the main session logs it.
- Observations about a GLOBAL skill (in ~/.claude/skills, e.g. neues-projekt) are logged here too; the review proposes the
  change to the global skill.
- When open observations add up to a big change (a skill restructured, a new skill, or 3+ on one skill), tell Ilker in one
  line at the end of the turn and add `- Skill-Review <skill>: <change> (<N> observations)` to OFFEN.md.
  Staged copies first, nothing live without his yes.
