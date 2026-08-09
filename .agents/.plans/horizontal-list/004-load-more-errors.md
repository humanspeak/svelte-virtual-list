# Plan 004: Recover from load-more callback failures

> **Executor instructions**: Follow all steps, keep retry semantics bounded, and update
> the sibling README.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- src/lib/SvelteVirtualList.svelte src/lib/SvelteVirtualList.test.ts src/lib/types.ts tests/topToBottom/infiniteScroll.spec.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

The loader is invoked while evaluating `Promise.resolve(onLoadMore())`. A synchronous
throw occurs before `.finally()` is installed, leaving `isLoadingMore` true forever.
Rejected async loaders also lack an explicit rejection policy.

## Current state

- `SvelteVirtualList.svelte:431-446` sets the guard and directly invokes the callback.
- `SvelteVirtualList.test.ts` accepts the props but does not test throw/rejection paths.
- Existing E2E coverage in `tests/topToBottom/infiniteScroll.spec.ts` is the browser
  behavior exemplar.

## Target contract

Both synchronous throws and async rejections must clear the in-flight guard. Report
the failure once (debug logger or a new optional `onLoadMoreError` callback); do not
immediately retrigger in a reactive tight loop while the viewport remains at the edge.

## Steps

1. Add red tests for sync throw and async reject. Assert no unhandled rejection, guard
   recovery, and controlled retry only after an explicit edge/state change.
   **Verify**: `pnpm exec vitest run src/lib/SvelteVirtualList.test.ts` fails for the
   stuck/error behavior.
2. Move invocation behind a promise/async boundary with explicit catch/finally. If a
   public error callback is necessary, add it to `types.ts` with a typed `unknown`
   error and component-type coverage. Add a failure latch so the same unchanged edge
   does not spin.
   **Verify**: focused tests pass with no unhandled rejection.
3. Run `trunk fmt`, `pnpm run check`, `pnpm run test:only`, the focused infinite-scroll
   Playwright spec, and `trunk check`.

## Scope

In scope: drift-check files. Out of scope: automatic backoff, networking, start-edge
loading, changing successful load thresholds, or horizontal mode.

## Done criteria

- [ ] Both current-code failure modes are captured red-first.
- [ ] Guard clears for sync and async failures.
- [ ] Persistent edge state cannot cause a retry loop.
- [ ] Success behavior and concurrency prevention remain intact.
- [ ] All gates pass; no unrelated files change.

## STOP conditions

- The only viable recovery changes the existing successful-callback cadence.
- Svelte effects repeatedly reinvoke despite a failure latch.
- A global error handler would be required.

## Git workflow and maintenance

Use branch `fix/load-more-errors`, commit
`fix(virtual-list): recover from load-more failures`. Reviewers should scrutinize
reactive retry behavior more than logging style.
