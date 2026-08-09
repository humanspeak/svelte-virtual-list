# Plan 003: Apply runtime estimated-size changes safely

> **Executor instructions**: Run each gate and update the sibling README. Stop instead
> of broadening scope.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- src/lib/SvelteVirtualList.svelte src/lib/SvelteVirtualList.test.ts src/lib/reactive-list-manager/ReactiveListManager.svelte.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: 001-reset-measurements.md
- **Category**: bug
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

`defaultEstimatedItemHeight` is a reactive component prop but is copied into the
manager only during construction. Responsive consumers therefore keep the old
estimate for unmeasured items, corrupting total size and programmatic scroll targets.
Horizontal orientation will also need a reliable runtime estimated-size update.

## Current state

- `SvelteVirtualList.svelte:187-204` destructures the prop reactively.
- `SvelteVirtualList.svelte:239-243` passes it only to the constructor.
- `ReactiveListManager.svelte.ts:562-565` already exposes
  `updateEstimatedHeight()`; there is no component call site.
- Anchor capture/restore at `SvelteVirtualList.svelte:339-424` is the required pattern
  for geometry corrections.

## Commands

Focused tests: `pnpm exec vitest run src/lib/SvelteVirtualList.test.ts`; full gates:
`pnpm run check`, `pnpm run test:only`, and `trunk check`; format with `trunk fmt`.

## Scope

**In scope**: drift-check files. **Out of scope**: new public prop names, horizontal
mode, changing measured item values, and rewriting anchor math.

## Steps

1. Add a red component test that rerenders with a new estimate and asserts manager-
   observable content geometry changes. Include mid-list anchor and bottom-pinned cases
   if jsdom can model them; otherwise add a focused Playwright fixture/spec.
   **Verify**: focused test fails because the estimate stays unchanged.
2. Add a reactive effect that validates positive finite input, captures the viewport
   anchor, calls `updateEstimatedHeight`, synchronously flushes derived totals when
   needed, invalidates range memo state, and restores the anchor after the new total is
   active. Avoid work when the value is unchanged.
   **Verify**: focused test passes.
3. Run format, focused tests, typecheck, full unit tests, any new E2E, and Trunk.

## Done criteria

- [ ] A red-first runtime prop test exists and passes after the fix.
- [ ] Mid-list and bottom behavior do not visibly jump.
- [ ] Invalid estimates have deterministic documented handling.
- [ ] All gates pass and only scoped files change.

## STOP conditions

- Svelte prop destructuring is not reactive on the current compiler.
- Correct anchor restoration requires redesigning plan 001 or 002.
- The estimate update triggers a reactive loop.

## Git workflow and maintenance

Use branch `fix/runtime-item-estimate` and conventional commit
`fix(virtual-list): apply runtime estimated height changes`. Future axis-neutral naming
in plan 009 must route through this same update path.
