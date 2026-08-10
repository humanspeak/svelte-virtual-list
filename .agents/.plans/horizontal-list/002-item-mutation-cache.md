# Plan 002: Preserve measurement correctness across item mutations

> **Executor instructions**: Execute step by step, run every gate, and update the
> sibling README status. Do not improvise beyond the STOP conditions.
>
> **Revision 2026-08-09**: Rebased after plan 001 completed at `cd280a1`. The
> manager reset now clears `_heightCache`; preserve that invariant while implementing
> shrink and identity reconciliation. The drift baseline below includes plan 001.
>
> **Drift check (run first)**:
> `git diff --stat 3a90029..HEAD -- src/lib/types.ts src/lib/SvelteVirtualList.svelte src/lib/SvelteVirtualList.test.ts src/lib/reactive-list-manager/ReactiveListManager.svelte.ts src/lib/reactive-list-manager/ReactiveListManager.test.ts tests/topToBottom`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001-reset-measurements.md
- **Category**: bug
- **Planned at**: commit `3a90029`, 2026-08-09

## Why this matters

The height cache is keyed only by array index, while the component reacts only to
`items.length`. Reorder, prepend, removal, and same-length replacement silently attach
old measurements to different items. Shrinking also retains measurements outside the
new length and can make measured count exceed item count.

## Current state

- `SvelteVirtualList.svelte:426-429` calls only `updateItemLength(items.length)`.
- `ReactiveListManager.svelte.ts:547-555` changes length without trimming the cache or
  aggregates.
- `ReactiveListManager.test.ts:587-604` documents retained measured count but only
  measures indices that survive the shrink, missing removed high-index measurements.
- `{#each}` is keyed by `originalIndex`, so there is no stable public identity hook.

## Target contract

Add optional `itemKey?: (item: TItem, index: number) => string | number`. With a key,
measurements follow surviving keys through reorder/prepend/removal. Without it, retain
the append-only fast path; invalidate measurements on ambiguous replacement/reorder.
Shrinking must always delete out-of-range cache entries and reconcile totals.

## Commands

| Purpose         | Command                                                                                  | Expected       |
| --------------- | ---------------------------------------------------------------------------------------- | -------------- |
| Manager tests   | `pnpm exec vitest run src/lib/reactive-list-manager/ReactiveListManager.test.ts`         | pass after fix |
| Component tests | `pnpm exec vitest run src/lib/SvelteVirtualList.test.ts src/lib/component-types.test.ts` | pass after fix |
| Full gates      | `pnpm run check && pnpm run test:only`                                                   | exit 0         |
| Lint            | `trunk check`                                                                            | exit 0         |

## Scope

**In scope**: drift-check files; one focused Playwright fixture/spec under
`src/routes/tests/issues/` and `tests/issues/` if DOM anchoring cannot be proven in
Vitest.

**Out of scope**: bidirectional loading, reverse lists, horizontal rendering, changing
the render snippet signature, or general diffing of arbitrary mutable objects.

## Git workflow

Suggested branch `fix/item-measurement-identity`; conventional commit
`fix(virtual-list): reconcile measurements across item mutations`.

## Steps

### Step 1: Add red manager shrink tests

Measure indices on both sides of a future shrink boundary, shrink below the high
indices, and assert cache, count, measured total, average, and total-height invariants.

**Verify**: manager test command → FAILS because removed measurements remain.

### Step 2: Reconcile manager state on shrink

Trim entries at indices `>= newLength` and subtract their contributions atomically.
Keep surviving measurements and rebuild flags/prefix sums consistently. Growth must
remain append-friendly.

**Verify**: manager tests → PASS.

### Step 3: Add red component mutation tests

Use visibly unequal item sizes. Cover same-length replacement, sort/reorder, prepend,
removal, clear/repopulate, and ordinary append. Assert rendered identity and geometry,
not merely DOM existence. Confirm current code fails at least replacement/reorder.

**Verify**: component tests (and focused E2E if used) → expected stale-geometry FAIL.

### Step 4: Introduce stable item identity and safe fallback behavior

Add and document `itemKey`. Track prior keys so measurements can be remapped when keys
survive. Preserve an O(1) append-only path. With no key, invalidate when the sequence
cannot be proven append-only. Key the Svelte each block consistently with the chosen
identity and reject duplicate keys in development/debug mode with a useful error.

**Verify**: mutation tests → PASS; append retains existing measurements.

### Step 5: Run all gates

Run `trunk fmt`, focused tests, `pnpm run check`, `pnpm run test:only`, relevant
Playwright spec if created, and `trunk check`.

## Done criteria

- [ ] Red tests demonstrate the old shrink and stale-index failures.
- [ ] Shrink removes out-of-range measurements and fixes aggregates.
- [ ] Keyed reorder/prepend preserves correct measurements and DOM identity.
- [ ] Unkeyed ambiguous replacement invalidates safely; append keeps its fast path.
- [ ] Public types and tests cover `itemKey` inference.
- [ ] All gates pass; no unrelated files change.

## STOP conditions

- Stable remapping requires changing `renderItem` arguments.
- Svelte rejects the proposed key type or duplicate-key policy cannot be deterministic.
- Append performance becomes proportional to total list length on every addition.

## Maintenance notes

This plan is the prerequisite for future prepend loading. Review cache remapping and
anchor preservation together: correct totals are insufficient if the visible item
jumps.
