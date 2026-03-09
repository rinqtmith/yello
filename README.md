# Yello

Yello is a local-first Pomodoro desktop app built with Electron, React, TypeScript, and Vite. The current bootstrap delivers a focused timer, work/break cycling, native notifications, lightweight history, and local persistence.

## Scripts

- `pnpm install` installs dependencies
- `pnpm dev` starts the Electron development app
- `pnpm typecheck` validates TypeScript across main, preload, renderer, and shared code
- `pnpm test` runs the unit test suite
- `pnpm build` creates a production build

## Branch Flow

- `main` stays stable
- `feat/<scope>` for features
- `fix/<scope>` for bugs and regressions
- `chore/<scope>` for tooling, refactors, and maintenance
- `docs/<scope>` for docs and process work

Current implementation branch: `feat/bootstrap-electron-app`

## Current Scope

- Standard desktop window
- Focus, short break, and long break modes
- Start, pause, and reset controls
- Local settings and timer persistence
- Native desktop notifications
- Lightweight recent-session history

## Next Iteration Ideas

- System tray support
- Richer analytics
- Task association for focus rounds
- Packaging and release automation
