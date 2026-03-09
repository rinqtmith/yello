# SKILLS.md

This project keeps contributor workflows lightweight. Treat this file as the index of repo-specific skills and conventions for future Codex work.

## Bootstrap And Architecture

Use when bootstrapping or extending the app shell.

- Keep the three-layer split: `src/main`, `src/preload`, `src/renderer`
- Put reusable domain logic in `src/shared`
- Prefer adding native capability through preload IPC rather than renderer-side workarounds

## Timer Logic

Use when changing focus/break transitions, restore behavior, or persistence semantics.

- Keep timer transitions pure and testable in `src/shared/timer.ts`
- Preserve safe restore behavior on app restart
- Add or update unit tests for long-break cadence and rehydration rules

## Release Hygiene

Use when preparing builds or repo-wide maintenance.

- Keep `README.md` and `AGENTS.md` aligned with actual scripts and workflow
- Validate with `pnpm typecheck`, `pnpm test`, and `pnpm build`
- Create work on scoped branches such as `feat/tray-support` or `fix/timer-drift`
