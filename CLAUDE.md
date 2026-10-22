# Pub 22

Project rules. The global rules (~/.claude/CLAUDE.md) apply too; this file wins where they conflict.
Keep it short: conditional how-to (e.g. how to run end-to-end tests) goes into a project skill in `.claude/skills/`.
When Ilker corrects a mistake, add the lesson here in one line, or in the skill it belongs to.

## What this is
Loyalty-card app for Ilker's father's bar "Pub 22". Customers get a QR card; scanning it checks them in, drinks go on their tab, settling the tab credits points (configurable, start 1 EUR = 1 point), points are redeemed as fixed rewards or as a EUR discount. Walk-in guests without a card get a plain tab without points. Not a cash register: payment still goes through the bar's TSE register. Full v0.1 plan: `docs/plan-0.1.html`.

- **For whom:** only the bar owner, on one iPad at the counter. No customer accounts, no login. UI language German.
- **Platform and stack:** web app installed to the iPad home screen (PWA, offline after first load), hosted on GitHub Pages (public repo, code only). Vite + TypeScript + Svelte 5; jsQR for scanning (iOS Safari has no BarcodeDetector), qrcode for card generation; data in localStorage on the iPad only, with backup export/import; Vitest.

## Commands
- Install: `npm install`
- Run: `npm run dev` (camera needs https or localhost; real check on the iPad)
- Test: `npm test` (Vitest), types: `npm run check`
- Build: `npm run build` (output `dist/`)

## Layout
- `src/App.svelte`, `src/main.ts`: app shell
- `src/lib/`: logic without UI (money and points math in `money.ts`), tests next to it as `*.test.ts`
- `docs/plan-0.1.html`: approved v0.1 plan with screen sketches

## Working here
- State and next steps: `JETZT.md` (max 10 lines; update after a commit that changes version, goal or next steps).
- Open points: `OFFEN.md` (the one list). Decisions: `entscheidungen.md` (E-001, E-002 …, one line each, with source).
- Handoffs after long sessions: skill `handoff`, files in `uebergabe/`.
- Delete only with `node .claude/tools/papierkorb.js <path>` (reversible, `.papierkorb/`); only Ilker empties it.
- Push only with `git push no-mistakes` (the hook refuses everything else). Parallel work: one treehouse worktree per task.

## Terms
- **Deckel:** a customer's open tab for the evening.
- **Laufkunde / Gast:** guest without a card, tab without points.
- **Prämie:** fixed reward bought with points (e.g. free drink).

## Conventions
- Money is always integer cents; format only at the UI edge (`formatEuro`).
- Points are earned on the amount actually paid (after discount) and rounded down.
