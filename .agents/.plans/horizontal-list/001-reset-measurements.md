# Plan 001: Make manager reset clear all measurements

> **Executor instructions**: Follow every step and verification gate. Update this
> plan's row in the sibling `README.md` when complete. Stop on any STOP condition.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- src/lib/reactive-list-manager/ReactiveListManager.svelte.ts src/lib/reactive-list-manager/ReactiveListManager.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

`reset()` zeros measurement aggregates but retains `_heightCache`. Range, transform,
and scroll-offset functions continue using stale entries, and a later
`setMeasuredHeight()` can subtract an old height from an already-zero total. A reset
must restore one internally consistent unmeasured state; horizontal axis switching
will depend on that guarantee.

## Current state

- `ReactiveListManager.svelte.ts:593-601` resets totals, flags, and block sums but never
  assigns a new empty `_heightCache`.
- `ReactiveListManager.svelte.ts:571-584` interprets an existing cache entry as an
  already-counted measurement.
- `ReactiveListManager.test.ts:704-713` asserts only block-sum invalidation after reset.
- Match the manager's existing synchronous Vitest style in
  `ReactiveListManager.test.ts`.

## Commands

| Purpose         | Command                                                                          | Expected                      |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| Focused tests   | `pnpm exec vitest run src/lib/reactive-list-manager/ReactiveListManager.test.ts` | all pass after implementation |
| Typecheck       | `pnpm run check`                                                                 | exit 0                        |
| Full unit suite | `pnpm run test:only`                                                             | all pass                      |
| Lint            | `trunk check`                                                                    | exit 0                        |
| Format          | `trunk fmt`                                                                      | only intended files change    |

## Scope

**In scope**: the two drift-check files.

**Out of scope**: component item-mutation semantics, orientation, public API changes,
grid detection, and scheduler redesign.

## Git workflow

- Suggested branch: `fix/manager-reset-measurements`
- Use conventional commits, e.g. `fix(manager): clear cached measurements on reset`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a red reset/reuse regression test

Measure at least two unequal heights, call `reset()`, and assert cache emptiness,
zero measured count/height, estimated total height, then remeasure one old index and
assert correct positive aggregates. Confirm the new test fails because the cache is
not empty or remeasurement subtracts stale state.

**Verify**: focused Vitest command → new test FAILS for stale cache state.

### Step 2: Reset the complete measurement state

Replace `_heightCache` with `{}` inside `reset()` before scheduling the recompute.
Retain configured item length, estimated height, DOM references, scroll position, and
documented initialized state. Preserve block-sum invalidation.

**Verify**: focused Vitest command → new and existing reset tests PASS.

### Step 3: Run all gates

Run `trunk fmt`, focused tests, `pnpm run check`, `pnpm run test:only`, and
`trunk check`.

## Test plan and done criteria

- [ ] The test fails against `0e343e5` for retained cache state and passes afterward.
- [ ] Measure → reset → remeasure produces correct cache, count, average, and total.
- [ ] All commands above exit 0.
- [ ] Only in-scope files plus this batch README status are modified.

## STOP conditions

- Existing callers rely on retaining cache entries across `reset()`.
- Clearing the cache requires changing the public reset contract.
- Any in-scope excerpt has materially drifted.

## Maintenance notes

Reviewers should check that reset cancels no unrelated lifecycle state. Any future axis
switch must call this complete reset rather than manipulating private aggregates.
