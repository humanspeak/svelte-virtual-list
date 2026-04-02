# Claude Handoff: BottomToTop Dedicated Engine

## Current State

Branch: `fix/pr-378-deferred-issues`, commit `5f558c4`

### What Works (24/24 e2e tests pass)

- **basic page** (13 tests): 10000 items, bottom-locked on init, backfill measures all items, scroll anchoring when scrolled away, mouse wheel works, no effect_update_depth_exceeded
- **smallItems page** (11 tests): 2 items in 500px viewport, items at bottom via flexbox, no phantom scroll range (overflow:clip on short-content CSS class), correct DOM structure

### What Doesn't Work

- **firstItemHeightChange page**: When a visible item resizes (Item 1 grows to 100px), the list jumps by ~2300px and takes ~500ms to recover
- **loadItems** (3 failures): Dynamic item addition doesn't maintain bottom-lock
- **streaming** (1 failure, 1 flaky): Same as loadItems — mutation path
- **infiniteScroll** (1 flaky): Scroll position after loading

### Test Results Summary (full bottomToTop suite)

```
80 passed, 4 failed, 5 flaky (from 86 total)
```

## The Root Problem: averageHeight Cascade

Every piece of the dedicated engine uses `heightManager.averageHeight` for unmeasured items. With 10000 items and only ~300 measured, `averageHeight` is volatile. When ONE item changes height:

1. `averageHeight` shifts (e.g., 20.0 → 20.27, a +0.27px change)
2. This cascades through ~9700 unmeasured items: `9700 × 0.27 = ~2600px totalHeight change`
3. Spacers resize by ~2600px
4. `scrollHeight` changes by ~2600px
5. `scrollTop` doesn't compensate → massive visible jump

This affects:

- `totalHeight` computation in `ReactiveListManager.recomputeDerivedHeights()` (line 67)
- `blockSums` in `getBlockSums()` (line 423) — used by `getScrollOffsetForIndex`
- `calculateBottomToTopSpacers()` — passes `averageHeight` to offset calculations
- `calculateBottomToTopPhysicalWindow()` — window calculation depends on `averageHeight`
- `buildBottomToTopEstimatedTailWindow()` — init window estimation

### Why Bandaid Approaches Failed

We tried:

1. **Scroll compensation after flushRecompute** — browser clamps scrollTop to current DOM scrollHeight (spacers haven't updated yet)
2. **flushSync to force Svelte re-render** — re-renders with old scrollTop, showing wrong items for one frame
3. **Direct DOM spacer manipulation** — Svelte's microtask re-render overwrites it
4. **$effect on totalHeight to snap to max** — works for bottom-lock but doesn't help scrolled-away state, and can't fire before the bad frame
5. **Persistent reconcile loop** — reduces recovery time but can't prevent the initial spike
6. **Wrapper ResizeObserver** — creates feedback loops with backfill

### The Correct Fix (Not Yet Implemented)

Use the fixed `defaultEstimatedItemHeight` (the prop, e.g., 22px) instead of the volatile `averageHeight` for ALL unmeasured item calculations in the dedicated bottomToTop engine. This eliminates the cascade entirely:

- When backfill measures a 37px item estimated at 22px, `totalHeight` changes by +15px (not +2600px)
- Spacers shift by ~15px per measurement
- `scrollTop` compensation of 15px is trivial

**But this must be applied consistently across ALL of:**

1. `ReactiveListManager.recomputeDerivedHeights()` — `_totalHeight` calculation
2. `ReactiveListManager.getBlockSums()` — `buildBlockSums` fallback height
3. `getScrollOffsetForIndex()` — the `calculatedItemHeight` parameter at every call site
4. `calculateBottomToTopSpacers()` — the `averageHeight` parameter
5. `calculateBottomToTopPhysicalWindow()` — the `itemHeight` parameter
6. `buildBottomToTopEstimatedTailWindow()` — the `estimatedItemHeight` parameter

**The partial implementation we tried (changing some but not all) made things much worse** because `totalHeight`, spacers, and offset calculations were using different height estimates, producing inconsistent scroll geometry.

The implementation should:

- Add a `useFixedEstimateForUnmeasured` flag to `ReactiveListManager`
- When true, use `_itemHeight` instead of `_averageHeight` in `recomputeDerivedHeights()` AND `getBlockSums()`
- Pass `heightManager.itemHeight` instead of `heightManager.averageHeight` to all dedicated engine call sites
- Keep `_averageHeight` computed (for tolerances, debug display, window sizing where item count matters)
- Only enable for the dedicated bottomToTop engine (topToBottom is unaffected)

## Architecture Notes

### Key Files

| File                                                          | Role                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/lib/SvelteVirtualList.svelte`                            | Main component, dedicated engine effects and handlers                |
| `src/lib/reactive-list-manager/ReactiveListManager.svelte.ts` | Height cache, averageHeight, totalHeight, blockSums                  |
| `src/lib/bottom-to-top/BottomToTopController.ts`              | Pure functions for window, spacer, backfill calculations             |
| `src/lib/bottom-to-top/BottomToTopMeasurementLane.svelte`     | Hidden measurement lane component                                    |
| `src/lib/bottom-to-top/BottomToTopStateMachine.ts`            | 2-state machine (initializing → lockedBottom)                        |
| `src/lib/bottom-to-top/bottomToTopMapping.ts`                 | Physical/logical index mapping                                       |
| `src/lib/utils/virtualList.ts`                                | `getScrollOffsetForIndex`, `buildBlockSums`, `calculateVisibleRange` |

### Key Effects in SvelteVirtualList.svelte (dedicated engine)

| Line  | Purpose                | Dependencies                                                 |
| ----- | ---------------------- | ------------------------------------------------------------ |
| ~1396 | Init trigger           | `bottomToTopModeState`, `heightManager.isReady`              |
| ~1402 | Measurement sync       | `getBottomToTopCurrentWindow()` (wraps mutations in untrack) |
| ~1432 | Init completion check  | Height cache, `bottomToTopInitWindow`                        |
| ~1456 | Backfill scheduling    | `isScrolling`, `bottomToTopMeasurementQueue.size`            |
| ~1479 | Items diff (mutations) | `items` (reads `bottomToTopPreviousItems` in untrack)        |

### Key Handlers

| Function                        | Called From               | Purpose                                         |
| ------------------------------- | ------------------------- | ----------------------------------------------- |
| `handleBottomToTopMeasurement`  | Measurement lane callback | Processes backfill measurements, anchors scroll |
| `reconcileBottomToTopToBottom`  | Multiple callers          | RAF loop that snaps scrollTop to max            |
| `handleScroll` (dedicated path) | `onscroll`                | Detects user scroll-away, cancels reconcile     |

### Test Pages

| Page                  | Items | Heights                       | Stats Panel |
| --------------------- | ----- | ----------------------------- | ----------- |
| basic                 | 10000 | Natural (~37px)               | Yes         |
| smallItems            | 2     | 20px explicit                 | Yes         |
| firstItemHeightChange | 10000 | Natural, Item 1 → 100px at 1s | Yes         |

### Debug

All test pages poll `viewport.__svlDebug` via RAF and display stats. The debug payload includes engine, mode, state, measured count, spacers, scroll position, window range, queue status.

### Playwright/Preview Mismatch

- Dev server: `http://localhost:8024`
- Playwright preview: `http://localhost:4173` (builds fresh)
- Use `CI=1` prefix for trustworthy automated results
- Check for stale `vite preview` processes: `lsof -nP -iTCP:4173 -sTCP:LISTEN`

## Commands

```bash
pnpm run check                    # TypeScript validation (0 errors expected)
pnpm test                         # Unit tests (325 pass)

# E2E (basic + smallItems — known passing)
CI=1 pnpm exec playwright test tests/bottomToTop/basic.spec.ts tests/bottomToTop/smallItems.spec.ts --project=chromium --workers=1

# Full bottomToTop suite (80 pass, 4 fail, 5 flaky)
CI=1 pnpm exec playwright test tests/bottomToTop/ --project=chromium --workers=1

# Visual debugging
# Navigate Playwright to http://localhost:8024/tests/list/bottomToTop/firstItemHeightChange
# Watch stats panel for gap, spacers, measured count
```
