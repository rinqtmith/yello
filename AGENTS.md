# AGENTS.md

## Project Intent

Build Yello as a local-first Pomodoro desktop app. Favor a reliable timer flow, clean Electron boundaries, and incremental delivery over speculative architecture.

## Repo Rules

- Keep `main` stable and do work on topic branches.
- Merge to `main` only via PRs.
- Use branch names `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, and `docs/<scope>`.
- Do not add backend, auth, or sync abstractions unless a task explicitly requires them.
- Keep Electron APIs behind preload IPC. Renderer code should not reach directly into Electron or Node.
- Prefer shared pure logic in `src/shared` when it can be tested outside the UI.

## Implementation Guidance

- Main process owns native integrations such as windowing, notifications, and file-backed persistence.
- Preload should expose a minimal typed API surface.
- Renderer should handle presentation, timer interaction, and optimistic local state updates.
- Persist settings, timer state, and session history in a versioned local JSON shape.
- When changing timer behavior, update or add unit tests in `src/shared`.

## Validation

- Run `pnpm typecheck`
- Run `pnpm test`
- Run `pnpm build` when changes affect packaging, Electron wiring, or production config

## Release Flow

- Work on release changes in `feat/release-pipeline` or `chore/release-*`.
- Tag releases as `vX.Y.Z` to trigger GitHub Actions builds.
- Ensure `pnpm pack` succeeds before pushing a release tag.
