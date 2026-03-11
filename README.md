# Yello

Yello is a local-first Pomodoro desktop app built with Electron, React, TypeScript, and Vite. The current bootstrap delivers a focused timer, work/break cycling, native notifications, lightweight history, and local persistence.

## Scripts

- `pnpm install` installs dependencies
- `pnpm dev` starts the Electron development app
- `pnpm typecheck` validates TypeScript across main, preload, renderer, and shared code
- `pnpm test` runs the unit test suite
- `pnpm build` creates a production build
- `pnpm pack` builds a local installer bundle without publishing
- `pnpm release` builds and publishes installers to GitHub Releases

## pnpm Note

This repo trusts the required Electron and esbuild install scripts through `package.json#pnpm.onlyBuiltDependencies`.

If a machine already installed dependencies before that setting existed and `pnpm dev` fails with `Electron failed to install correctly` or `Electron uninstall`, run:

- `pnpm rebuild electron esbuild`

## Releases

Releases are built and published by GitHub Actions on version tags.

1. Bump `package.json` version (or run `pnpm version patch|minor|major`).
2. Commit the version bump.
3. Tag and push:

```bash
git tag v0.2.0
git push origin main --tags
```

The release workflow publishes:
- Windows: NSIS `.exe`
- macOS: `.dmg`
- Linux: `AppImage`

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
