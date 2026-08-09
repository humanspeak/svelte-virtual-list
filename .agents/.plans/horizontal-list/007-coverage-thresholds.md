# Plan 007: Add enforceable library coverage thresholds

> **Executor instructions**: Baseline actual numbers before choosing thresholds. Never
> lower observed coverage merely to make CI green. Update the sibling README.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- vite.config.ts package.json .github/workflows/coveralls.yml README.md src/lib`

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

Vitest emits LCOV but has no thresholds. Tests remain green after arbitrary coverage
loss, while the weekly Coveralls job only reports the decline after the fact. A local
gate should protect the published `src/lib` surface.

## Current state

- `vite.config.ts:23-26` configures reporter/exclusions only.
- `.github/workflows/coveralls.yml:37-45` runs coverage weekly and uploads it.
- `package.json:68` already makes `pnpm test` the coverage-producing command.

## Scope

In scope: `vite.config.ts`, tests required to reach a truthful baseline, and one short
README testing note if needed. Out of scope: generated files, docs application
coverage, gaming coverage via broad exclusions, or changing Coveralls providers.

## Steps

1. Run `pnpm test` at `0e343e5`; record lines, statements, functions, and branches.
   **Verify**: coverage summary and LCOV are produced with a passing suite.
2. Add global thresholds no higher than the measured baseline, rounded down only enough
   to avoid nondeterministic fractional noise. Prefer per-file thresholds for critical
   `SvelteVirtualList.svelte`, manager, and scroll math if current data makes them
   practical. Explain any targeted exclusion inline.
   **Verify**: `pnpm test` passes.
3. Temporarily raise one threshold above current coverage and confirm `pnpm test` fails;
   revert the temporary value. **Verify**: the restored configuration passes.
4. Run `pnpm run check`, `pnpm run test:only`, `pnpm test`, `trunk fmt`, and
   `trunk check`.

## Done criteria

- [ ] All four coverage metrics have enforced thresholds.
- [ ] The gate demonstrably fails below threshold.
- [ ] No new broad exclusion hides production code.
- [ ] Full tests, typecheck, and lint pass.

## STOP conditions

- Current coverage is nondeterministic across two consecutive runs by more than 1%.
- Reaching a reasonable baseline requires unrelated runtime edits.
- Svelte source mapping makes component coverage materially misleading; report data
  before choosing an alternative.

## Git workflow and maintenance

Use branch `test/library-coverage-gates`, commit
`test: enforce virtual-list coverage thresholds`. Ratchet thresholds upward with new
coverage; do not silently lower them in feature PRs.
