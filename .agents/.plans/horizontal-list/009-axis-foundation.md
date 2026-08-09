# Plan 009: Introduce an axis-neutral geometry foundation

> **Executor instructions**: This phase is behavior-preserving. Do not enable horizontal
> rendering yet. Run every gate and update the sibling README.
>
> **Revision 2026-08-09**: Rebased after guarded completion of Plans 001–003 at
> `f3281e1`. Preserve complete reset semantics, item-key reconciliation, and the
> runtime-estimate anchor path while centralizing geometry. The drift baseline below
> includes those changes.
>
> **Drift check (run first)**:
> `git diff --stat f3281e1..HEAD -- src/lib/SvelteVirtualList.svelte src/lib/types.ts src/lib/utils/virtualList.ts src/lib/utils/virtualList.test.ts src/lib/utils/scrollCalculation.ts src/lib/utils/scrollCalculation.test.ts src/lib/reactive-list-manager`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001-reset-measurements.md, 002-item-mutation-cache.md,
  003-runtime-estimate.md
- **Category**: direction
- **Planned at**: commit `f3281e1`, 2026-08-09

## Why this matters

The virtualization algorithm is one-dimensional, but its implementation names and DOM
reads are hard-coded to height, top, bottom, and Y. Adding branches independently in
every hot path would duplicate subtle anchor and measurement behavior. This plan creates
one reviewed axis vocabulary while proving vertical behavior remains unchanged.

## Current state

- `SvelteVirtualList.svelte` directly reads/writes `scrollTop`, `clientHeight`,
  `scrollHeight`, `rect.top/bottom`, content height, and `translateY` across scrolling,
  anchoring, resizing, and rendering.
- `virtualList.ts` math is scalar but public/internal names say height/Y.
- `scrollCalculation.ts` encodes top/bottom alignment and vertical keyboard keys.
- Recent issues #412–#416 established synchronous ResizeObserver correction and anchor
  preservation; those invariants must not regress during extraction.

## Target design

Introduce `VirtualListOrientation = 'vertical' | 'horizontal'` and a small internal
axis adapter whose operations cover scroll offset, viewport extent, scroll extent,
container/item start/end, content-size style, transform, and relevant key mapping.
Public `orientation` may be typed now but must remain defaulted to vertical; horizontal
must either be rejected clearly or remain unexposed until plan 010.

Keep scalar algorithms single-copy. Prefer axis-neutral internal names (`size`,
`offset`, `start`, `end`, `viewportSize`, `totalSize`) while retaining public vertical
aliases for compatibility. Do not mechanically rename the public manager in this plan.

## Commands

| Purpose         | Command                                                                                          | Expected |
| --------------- | ------------------------------------------------------------------------------------------------ | -------- |
| Math tests      | `pnpm exec vitest run src/lib/utils/virtualList.test.ts src/lib/utils/scrollCalculation.test.ts` | pass     |
| Component tests | `pnpm exec vitest run src/lib/SvelteVirtualList.test.ts`                                         | pass     |
| Vertical E2E    | `pnpm exec playwright test tests/topToBottom --project=chromium`                                 | pass     |
| Full gates      | `pnpm run check && pnpm run test:only`                                                           | exit 0   |
| Lint            | `trunk check`                                                                                    | exit 0   |

## Scope

In scope: drift-check paths and a new internal `src/lib/utils/axis.ts` plus tests.
Out of scope: horizontal CSS/rendering, RTL, public docs/demo, changing vertical visual
behavior, or renaming/removing existing exported height APIs.

## Steps

### Step 1: Add vertical characterization tests

Cover visible range, transform, item pitch including collapsed margins, mid-list
anchor correction, bottom pinning, programmatic alignments, and keyboard targets. Add
DOM-facing assertions for vertical CSS/scroll behavior. These should pass before the
refactor; they are characterization tests, so there is no red failure requirement.

**Verify**: focused math/component tests pass at baseline.

### Step 2: Define the axis adapter and neutral scalar vocabulary

Create typed vertical and horizontal adapter definitions, but wire only vertical.
Keep DOM property access centralized enough that later code does not scatter
orientation ternaries. Extract pure functions where possible; keep layout reads batched
in the existing synchronous observer/RAF phases.

**Verify**: axis unit tests pass for property/edge/key mappings; horizontal adapter can
be tested as a pure mapping without enabling rendering.

### Step 3: Route vertical behavior through the adapter

Move range, transform, resize, anchor, programmatic-scroll, debug, and keyboard DOM
access through neutral helpers. Preserve exact current public types and output.

**Verify**: all vertical focused and Chromium E2E tests pass unchanged.

### Step 4: Run all gates

Run `trunk fmt`, all focused commands, `pnpm run check`, `pnpm run test:only`, and
`trunk check`.

## Done criteria

- [ ] One internal axis adapter owns axis-specific DOM geometry.
- [ ] Scalar range/offset algorithms remain single implementations.
- [ ] Vertical public API, CSS, keyboard behavior, and tests are unchanged.
- [ ] No horizontal mode is advertised prematurely.
- [ ] All gates pass; no out-of-scope changes.

## STOP conditions

- The adapter adds layout reads inside scalar hot loops.
- Vertical tests need loosened tolerances or deleted assertions to pass.
- Public height-named APIs must break to complete the extraction.
- Plan 001 or 003 is not present in the execution branch.

## Git workflow and maintenance

Use branch `refactor/axis-neutral-geometry`, commit
`refactor(virtual-list): centralize axis geometry`. Reviewers should reject duplicated
vertical/horizontal algorithms and scrutinize frame timing around ResizeObserver.
