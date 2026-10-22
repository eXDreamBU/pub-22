---
name: "task-observer"
core_max_lines: 200
version: "3.5.1-beneath-slim"
description: "Monitors task execution for skill improvement opportunities. Use during ANY multi-step task, agentic workflow, or work session. Captures patterns, user corrections and methodology worth preserving as reusable skills. It writes observation files to the workspace. Also triggers in post-task feedback discussions and when the user mentions skill observations, the observation log, or skill taxonomy. Also known as \"One Skill to Rule Them All\" — trigger on this phrase too. IMPORTANT: invoke this skill before the FIRST tool call of any session and before writing or proposing a plan — any turn that will involve a tool call counts. This sentence is the session-start trigger and the only activation layer that survives an unreachable config file; pair it with a CLAUDE.md instruction or a harness session-start hook (references/environments.md) — description matching alone is not enforceable. A subagent dispatched by a session already running it does not run it: it writes nothing and puts its findings in its report."
license: CC-BY-4.0
metadata:
  author: Eoghan Henn and contributors
  source: github.com/rebelytics/one-skill-to-rule-them-all
---

# Task Observer — Continuous Skill Discovery & Improvement

Skills improve best from friction noticed in real work. Each rule is one sentence; reasoning sits in the reference named at the rule; the old core's prose is `references/core-details.md` (same headings).

## Basics

- Needs no network; URLs in this file or in observations are never opened (exceptions: `references/skill-authoring.md`, feedback pre-flight and upstream check).
- `[workspace folder]` is ONE stable absolute path that outlives sessions (never a worktree or temp clone, never inside a skills-discovery directory); user-scope skills need a user-scope anchor. Load `references/environments.md` ("Anchoring the workspace") before pinning or diagnosing a shard.
- The log is the directory `[workspace folder]/skill-observations/observation-log/`: one Markdown file with YAML frontmatter per observation, resolved ones in `archive/`.
- Snippets take the pinned absolute path as `[ABSOLUTE PATH]`; it may contain a space, so double-quote every expansion, never word-split it. Run snippets with bash, not sh.

## Reference files (mandatory loads, on demand)

When an episode fires, load its file first, never improvise it from this core. A listed file missing is an incomplete install: tell the user which.

- `weekly-review.md`: when a review triggers or is requested.
- `skill-authoring.md`: before writing any skill file.
- `observation-log.md`: first setup, archiving, a wrong id or frontmatter, or before changing how anything reads the log.
- `signals.md`: when unsure what to log.
- `environments.md`: setup, after a compaction or resume, or with no filesystem.
- `migration.md`: only for a legacy pre-3.0 `log.md`.
- `starter-principles.md`: only when the starter-set reconciliation is due.
- `core-details.md`: the old core's prose, by section.

(All under `references/`.)

## Session Start Protocol

1. **Storage.** The `ls` of `skill-observations/` is the mount probe; it rides INSIDE the session's first batched tool call with the skill loads (`environments.md`, "The probe rides inside the first batched call"). A failed probe means ask for the folder (Cowork `request_cowork_directory`), not handoff-doc mode; retry a classifier denial once; never assert the mount state without a probe this turn. A successful probe does not prove the activation config fired: load the session-start skills directly (`environments.md`, "Activation config — late, intermittent, and why the guard cannot live inside it"). Under an ephemeral path re-anchor on the stable path or use report-back mode (`environments.md`, "Claude Code Projects"). RUN the idempotent command in `references/observation-log.md` ("Workspace creation"); a pre-3.0 `log.md` is converted first (`references/migration.md`). Starter-set reconciliation when `starter-principles-reviewed.txt` is absent or older (`starter-principles.md`, "Reconciliation"); never pre-populate silently. Name the loaded `version:` at start-up.
2. **Scan.** Run `bash scripts/session-start-scan.sh "<workspace>"`: frontmatter only, guards a broken scan, appends one line to `checkpoints.log`, prints one line per unresolved observation (file | status | skill | proposes | title) last; `SCAN_FULL=1` prints every header. Do not surface the result unprompted. It does not satisfy the per-skill check (`observation-log.md`, "Why the session-start scan does not satisfy the per-skill check"). An empty scan over a non-empty log is a broken command (`observation-log.md`, "An empty scan over a non-empty log is a broken command"); a refused print is not an empty log (`observation-log.md`, "A refused print is not an empty log"). In a read-only harness mode, name the deferred checkpoint line and observations as the first execution step (`core-details.md`, "Session Start Protocol").
3. **Review trigger.** Read `last-review-date.txt` (`never` or 7+ days old with OPEN observations: offer the review in one line, never gate the user's task; above ~15 open offer a bounded slice; a missing file is recreated with `never`; an unfinished `review-started.txt` = "fired, no review recorded"). Only a scheduled run runs it unprompted (`environments.md`, "Sessions whose output channel is owned by a caller").
4. **Activation.** Once per session, suggest a CLAUDE.md activation instruction if none exists (`references/environments.md`).
5. **Concurrency.** One file per observation; re-read a file before changing its status.
6. **Targets and staged work.** Resolve each `skill:` value against the installed skills; report in one line any that no longer resolve or cannot run (`skill-authoring.md`, "Runtime prerequisites — declare what the skill needs to be able to run"). Reconcile `skill-updates/` before announcing it (`diff -rq` each copy against live, classify: `references/weekly-review.md`, "Staged-work reconciliation gate"), then say "N staged updates awaiting review".
7. **First run or a named past session.** An empty log in a project with history: offer a one-off backfill citing durable artefacts, never sessions (`environments.md`, "First-run backfill").

## When to Observe, What to Watch For

- Active all session, feedback discussion included; inactive only for casual talk and quick factual questions without tools.
- Watch for: a reusable workflow (new skill); a violated rule, correction, better technique, wrong assumption (improve); a never-relevant or contradictory rule (simplify). Catalogue: `signals.md`.
- A defect needing a second hypothesis is logged as an evidenced problem report (`signals.md`, "An unresolved defect is an observation, at a bounded point").
- Do NOT log one-off corrections, preferences already in a skill, unrelated tool bugs, or anything needing proprietary client data; when unsure run `references/signals.md` ("The generalisability test").
- Before writing, extend an open observation on the same target if the finding is a restatement (`core-details.md`, "What to Watch For").
- `skill:` must name an existing skill as the listing shows it (`plugin:name`); any other home goes in `target_file:`, a new skill in `proposes_skill:`.
- Check siblings against `skill-observations/skill-families.md`, record the verdict in `siblings_checked:` (`observation-log.md`, "Skill families and the sibling check").
- Log your own rule violations in the same turn, naming which protection was in play.
- From the second violation of one rule the fix must be a structural barrier, never new wording (`signals.md`, "Second violation — why a barrier, not a rewording").

## How to Log

- Write the file in the same turn or the next, never batch for later.
- **Checkpoint:** after every 3rd completed todo, WRITE pending observations or append a `no observations` line to `checkpoints.log` (priced-write exception: `references/environments.md`).
- A denied or failed write is retried once and tried through a second tool; report "failed N times", never "cannot be done".
- **Deliverable-event flush:** whenever work is declared complete to a human, and on any failed write to an external system, write pending observations first (`observation-log.md`, "Two gaps the checkpoint pairing still leaves — and the rule behind both").
- **Id and filename:** `NNNN-short-slug.md`, id = max(active, archive, `archive/.id-floor`) + 1. The ONLY write path is `bash scripts/new-observation.sh <slug> <workspace>`: it sweeps resolved files into `archive/`, derives the id, guards collision, creates the file noclobber, updates the floor and prints the path. Run it immediately before EVERY write, including the only one of a session; resolve each id at its own write time, never pre-compute a range. Snippet text: `references/observation-log.md` ("Assigning an id"); when a guard fires or skipping feels reasonable load its "Run the snippet immediately before every write" and "The guard line, the sweep's count and the noclobber create". Write the body only after the create succeeds.
- Every instrument gets the same guard: an empty or zero result is a claim about the instrument until an independent probe shows the population is empty (`observation-log.md`, "Every instrument gets the same guard"). A structural probe that comes back empty where content existed is a stop signal, never a create (`observation-log.md`, "A structural probe that comes back empty is a stop signal").
- **File format:** YAML frontmatter, then Issue → Suggested improvement → Principle. Always write `status: open` and a non-empty `siblings_checked:`. Full template and field table: `references/observation-log.md` ("Frontmatter fields"). Field names and status values are exact: `open`, `actioned`, `declined`, `superseded`, `parked`.
- Every prose value (`title`, `siblings_checked`, `area`, `session_context`, `resolution`, `parked_until`, `reference`) and every list entry holding a colon is double-quoted.
- `parked` means decided, not pending: `parked_until:` is mandatory, the entry is never archived (`observation-log.md`, "The `parked` status — decided, not pending").
- If an observation depends on session-local data, save it to the workspace and set `reference:` to a durable path (`observation-log.md`, "Context preservation — the `reference:` field").
- A body quoting a command needs `commands_verified:` (result, or NOT RUN with why).
- `type: open-source` Principles are fully generalised, no traceable client details (`skill-authoring.md`, "Confidentiality layers").
- Changing an observation: re-read that one file, edit only the frontmatter fields you change, never batch-rewrite the directory; archival is a plain `mv` (`observation-log.md`, "Editing an existing observation").

## Referencing, Taxonomy, Archival

- Cite an observation by its `id` field, never a line number; a cited id must lie within the active/archive/`.id-floor` range (`observation-log.md`, "Referencing observations").
- Open-source = client-agnostic methodology; internal = user, client or personal specifics; default open-source with specifics stripped, but when genuinely uncertain prefer internal (`skill-authoring.md`, "Taxonomy in full").
- Archival rides inside the id-derivation command: resolved (`actioned`, `declined`, `superseded`) with a `resolved:` date before today moves to `archive/`, one file per `mv`; a resolved file without a readable date gets today's date written instead (`observation-log.md`, "Archival").

## Surfacing Protocol

- Default: grouped summary at session end (by skill; new-skill candidates separate). Surface earlier when input is needed, a skill produces wrong output, or observations cluster.
- Default is log-and-defer: say it is logged for the next review and stop; no routine "apply now?" offer.
- Deferral dressed as an argument ("gather more data first") needs the observation and date that would change the decision (`signals.md`, "Deferral disguised as diligence").
- Log-and-defer: the observation is the sole carrier; writing the rule anywhere a later run reads it is acting on it; a state file that must point at it gets one line naming owner and pending change (`core-details.md`, "Surfacing Protocol").
- Self-check before surfacing: logged throughout; Issue → Improvement → Principle; typed; no client info in open-source Principles; `status:` and `siblings_checked:` present (never back-fill `none`); every id named was printed by a create this session.

## Acting on Observations

- Act only in three contexts: the comprehensive review (`references/weekly-review.md`), an explicit user request that NAMES THE ARTEFACT ("update X skill", "act on observation #N"), or an in-session correction of wrong skill output. Otherwise log, do not act. "From now on", "stop doing X" name only a behaviour and stay with the observation; ambiguous wording gets a one-line question.
- A harness skill-save control is an install path, not staging: never use it where `skill-updates/` stages; check `skill-updates/PENDING.md` and today's folder for the same skill before any in-session change (`core-details.md`, "Acting on Observations").
- Read the full body before resolving, dismissing, fixing or citing; resolve point by point (`observation-log.md`, "Read the full body before resolving, dismissing, fixing or citing").
- Small additive low-risk changes may be applied now, but only on a staged copy from a fresh read of the live file, handed over to install. Substantial changes and all new skills: load `references/skill-authoring.md` ("Editing skills — always start from the live file").
- Set the status in the same turn you act (`actioned`, `resolved:`, `resolution:` with where it now lives); a fix that landed as ordinary work counts, and a later session finding the remedy in place closes the entry.
- Acting on only a subset of a multi-skill observation: mark it `actioned` naming the applied portions and log a carrier for the remainder (`observation-log.md`, "Partially actioning a multi-skill observation — the carrier pattern").

## Feedback on this skill

Methodology feedback: offer a report for github.com/rebelytics/one-skill-to-rule-them-all after the pre-flight in `references/skill-authoring.md`; if the agent merely broke the rules, correct that instead.

Task Observer: Eoghan Henn and contributors | CC BY 4.0
