# Plan 010: Render and measure LTR horizontal virtual lists

> **Executor instructions**: Implement static LTR horizontal mode only. Runtime axis
> switching, comprehensive keyboard behavior, and public docs belong to plan 011.
> Update the sibling README.
>
> **Revision 2026-08-09**: Rebased after guarded completion of Plans 001–003 and 009
> at `93d35fb`. Red browser coverage is mandatory before implementation. The issue
> fixture must be loud, deterministic, and visibly measurable as specified below; a
> visually ambiguous demo or assertions hidden only in the test runner are not enough.
>
> **Drift check (run first)**:
> `git diff --stat 93d35fb..HEAD -- src/lib/types.ts src/lib/SvelteVirtualList.svelte src/lib/SvelteVirtualList.test.ts src/lib/utils src/lib/reactive-list-manager src/routes/tests tests`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 002-item-mutation-cache.md, 009-axis-foundation.md
- **Category**: direction
- **Planned at**: commit `93d35fb`, 2026-08-09

## Why this matters

Users need large, dynamically sized horizontal lists without adopting a second
virtualizer, and issue #427 specifically praises this component's programmatic API.
The axis foundation allows this without forking algorithms, while this phase limits
risk to a static left-to-right orientation.

## Public contract

```ts
type VirtualListOrientation = 'vertical' | 'horizontal'

orientation?: VirtualListOrientation // default 'vertical'
defaultEstimatedItemSize?: number
defaultEstimatedItemHeight?: number // compatibility alias
```

Resolution rules must be deterministic:

- `defaultEstimatedItemSize` wins when provided.
- Otherwise vertical uses `defaultEstimatedItemHeight` or 40.
- Horizontal without either neutral size or legacy alias uses 40.
- In development/debug mode, conflicting explicit values emit one useful warning.

Add semantic scroll alignment `'start' | 'end'`; preserve `'top' | 'bottom'` for
vertical compatibility. For horizontal LTR, start means left and end means right.

## Current-state constraints

- Content currently receives only `style:height`; items use `translateY` and full-width
  block wrappers.
- Vertical item pitch uses sibling `top` deltas so collapsed margins are counted.
- Horizontal pitch must use sibling `left` deltas (or parent right edge for the last
  rendered item), including margins/gap, and fall back to border-box width.
- Infinite loading is range-based, so it should remain logically axis-neutral.

## Scope

In scope: public types, component, axis/measurement/scroll utilities, unit tests, a new
`src/routes/tests/issues/issue-427/+page.svelte`, and matching
`tests/issues/issue-427.spec.ts`.

Out of scope: RTL, vertical writing modes, two-dimensional grids, reverse order,
window scrolling, runtime orientation changes, touch snapping/carousel controls, and
docs-site marketing pages.

## Steps

### Step 1: Create a failing issue #427 fixture and E2E spec

Build a fixed-container horizontal list of at least 10,000 variably wide items with
labels below boxes, matching the issue's mobile use case. Assert initial window size,
horizontal overflow, absence of vertical list overflow, deep manual scroll, rendered
indices, bounded DOM count, variable-width transform accuracy, and programmatic scroll
for start/end/nearest/center. Show and manually inspect the red fixture before fixing,
following the repository's issue-fixture ritual.

The page itself must expose an always-visible diagnostics panel with a large RED/GREEN
overall state and numeric rows for orientation, `scrollLeft`, `clientWidth`,
`scrollWidth`, `clientHeight`, `scrollHeight`, rendered count, first/last rendered
index, transform X, and anchor/index error. Use fixed deterministic item widths and
stable test IDs/data attributes; no randomness, timing-dependent labels, or console-
only evidence. Add explicit controls for deep manual scroll and every programmatic
alignment. Capture a red screenshot before implementation and a green screenshot after
implementation so a reviewer can understand failure/success without reading code.

**Verify**: `pnpm exec playwright test tests/issues/issue-427.spec.ts --project=chromium`
fails because horizontal orientation is unsupported.

### Step 2: Add public types and compatibility resolution

Add orientation, estimated-size, and semantic alignment types with component-type
tests. Keep existing vertical calls source-compatible. Export new public types through
the same path used by current types.

**Verify**: `pnpm exec vitest run src/lib/component-types.test.ts src/lib/types.test.ts`
passes, including compile-time compatibility cases.

### Step 3: Implement horizontal content layout and scrolling

Use the axis adapter for `scrollLeft/clientWidth/scrollWidth`, content width,
`translateX`, and item flex/inline layout. Component-owned styles must work when users
replace class props; use stable attributes/data-orientation for indispensable rules,
as the focus ring already does for replaceable viewport classes.

**Verify**: issue #427 E2E passes fixed-width and manual/deep-scroll assertions.

### Step 4: Implement dynamic width measurement and anchor correction

Generalize pitch measurement/collection to the active axis. Preserve synchronous
ResizeObserver timing, mid-list anchor, end pinning, prefix invalidation, and average
hysteresis. Add unit tests for horizontal margins/gaps and browser tests where a visible
item widens after mount.

**Verify**: issue #427 E2E passes variable-width, resize, anchor, and bounded-DOM cases.

### Step 5: Complete static horizontal programmatic and infinite scrolling

Route `scroll()`, `scrollToOffset()`, edge/range callbacks, debug metrics, and
`onLoadMore` through active-axis scalar geometry. Verify all alignments and end loading.
Do not implement runtime orientation change yet.

**Verify**: issue #427 spec and relevant top-to-bottom scroll/infinite specs pass.

### Step 6: Run the cross-browser gate

Run `trunk fmt`, `pnpm run check`, `pnpm run test:only`, issue #427 across Chromium,
Firefox, WebKit, mobile Chrome, and mobile Safari, existing vertical Chromium E2E, and
`trunk check`.

## Done criteria

- [ ] The red issue #427 fixture is reviewed before implementation and green afterward.
- [ ] The issue page visibly reports RED/GREEN plus exact geometry/index metrics, and
      red/green screenshots make the browser result reviewable without test-runner logs.
- [ ] 10k variable-width items maintain bounded rendered DOM.
- [ ] Manual, smooth, index, offset, and all supported alignments work horizontally.
- [ ] Dynamic width changes preserve the visible anchor and end pinning.
- [ ] Infinite load/range callbacks use the horizontal end correctly.
- [ ] Existing vertical API and tests remain green.
- [ ] All five Playwright projects pass the new focused spec.

## STOP conditions

- Plan 009's adapter is bypassed by repeated orientation branches.
- Horizontal correctness requires browser-specific RTL normalization.
- User class replacement can disable required layout without a stable internal selector.
- Variable-width correction cannot preserve the anchor using current cache semantics.

## Git workflow and maintenance

Use branch `feat/horizontal-list`, commit logical slices with conventional messages.
Do not advertise RTL. Reviewers should inspect measurement pitch, class replacement,
scroll alignment, and vertical regression results before API aesthetics.
