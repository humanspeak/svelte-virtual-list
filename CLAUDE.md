# CLAUDE.md

Project context for Claude Code sessions.

## Project Overview

`@humanspeak/svelte-virtual-list` — A high-performance virtual list component for Svelte 5. Renders large datasets (10k+ items) with dynamic item heights, bi-directional scrolling, and minimal memory usage.

- **Homepage**: <https://virtuallist.svelte.page>
- **Repository**: <https://github.com/humanspeak/svelte-virtual-list>

## Workspace Structure

This is a **PNPM workspace** with two packages:

- **`./`** — Main library package (`@humanspeak/svelte-virtual-list`)
- **`./docs`** — Documentation site (SvelteKit + Cloudflare Pages) at virtuallist.svelte.page

## Tech Stack

- **Svelte 5** — Uses runes (`$state`, `$derived`, `$effect`) and snippets (`{#snippet}`)
- **SvelteKit** — For dev server, test routes, and docs site
- **TypeScript** — Strict mode, full type safety
- **Vitest** — Unit tests (324 tests)
- **Playwright** — E2E tests

## Formatting and Linting

This project uses **[Trunk](https://trunk.io)** for all formatting and linting. Do NOT use `pnpm run lint:fix` or `prettier` directly.

```bash
trunk fmt        # Format files
trunk check      # Run all linters
```

Trunk manages tool versions and configuration in `.trunk/trunk.yaml`. It runs automatically via pre-commit hooks (`trunk-fmt-pre-commit`, `trunk-check-pre-push`).

Trunk-managed tools include: prettier (with svelte/tailwind plugins), eslint, markdownlint, actionlint, shellcheck, osv-scanner, and others.

## Key Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start dev server (library)
pnpm run dev:all      # Start library + docs dev servers
pnpm build            # Build library (vite build + svelte-package + publint)
pnpm test             # Run vitest with coverage
pnpm run test:e2e     # Run Playwright tests
pnpm run test:all     # Run both unit and e2e tests
pnpm run check        # svelte-check (TypeScript validation)
```

## Architecture

### Core Component

- `src/lib/SvelteVirtualList.svelte` — Main component (~1700 lines). Handles virtualization, scroll events, height measurement, bottomToTop mode, infinite scroll, and programmatic scrolling.

### Key Subsystems

- `src/lib/reactive-list-manager/` — Manages item heights, averageHeight, totalHeight. Incremental updates with O(1) amortized recomputation via `RecomputeScheduler`.
- `src/lib/utils/virtualList.ts` — Pure functions for visible range calculation, transform positioning, and scroll offset computation.
- `src/lib/utils/throttle.ts` — Throttle utilities for scroll event handling.

### Scroll Modes

- **topToBottom** (default) — Standard list, scrollTop = 0 at top
- **bottomToTop** — Chat-style, items anchored to bottom. Uses content height ratcheting during active scroll to prevent jitter from averageHeight oscillation.

### Test Pages

Test routes live at `src/routes/tests/` with pages for both modes covering basic rendering, scrolling, wrong item sizes, infinite scroll, performance, and more.

## Conventions

- Commit messages follow **conventional commits** (`feat:`, `fix:`, `docs:`, `build:`, etc.)
- PRs target `main` branch
- The docs sidebar navigation is defined in `docs/src/lib/utils/docsNav.ts`
- The docs sidebar component uses `@humanspeak/svelte-motion` for animations and `runed` for persisted state
