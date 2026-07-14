# Plan 001: Make offset/range math block-accelerated — end-of-list scrolling stops paying O(n)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/perf-parity/README.md`.
>
> **Drift check (run first)**: `git diff --stat b5da256..HEAD -- src/lib/utils/virtualList.ts src/lib/utils/scrollCalculation.ts src/lib/reactive-list-manager/ReactiveListManager.svelte.ts src/lib/SvelteVirtualList.svelte`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `b5da256`, 2026-07-13

## Why this matters

The library advertises O(1) height management, and `ReactiveListManager` does maintain
running totals in O(1) — but every **positional** computation still walks item heights
linearly from index 0. The repo already contains a complete, unit-tested block prefix-sum
system (`buildBlockSums` in `src/lib/utils/virtualList.ts`, `getBlockSums()` on the
manager) that reduces those walks to O(blockSize) — and **no production code path ever
calls it** (verified by grep: the only callers are the manager itself and its tests).

Concretely, while smooth-scrolling near item 90,000 of a 100,000-item list, every visible-
range recompute walks ~90,000 sparse-object lookups to find the start index
(`calculateVisibleRange`), then `transformY` walks the same ~90,000 entries again
(`calculateTransformY` → `getScrollOffsetForIndex` with no `blockSums` argument), and every
ResizeObserver measurement batch does two more full-prefix walks (anchor capture + restore).
`scroll({ index: 90000 })` does two O(90k) walks. Scrolling near the top walks a handful of
entries — this is the mechanism that makes the end of a large list measurably slower than
the top. Wiring the existing acceleration through the four call sites plus a binary search
in `calculateVisibleRange` removes the asymmetry.

This plan also gates `updateDebugTailDistance()` (currently a `querySelector` + two
`getBoundingClientRect` forced-layout reads on **every scroll frame**, even with debug off)
because that noise would pollute the perf measurements this plan is judged by.

## Current state

Files and roles:

- `src/lib/utils/virtualList.ts` — pure math. Contains the O(n) walks AND the unused
  acceleration:
    - `calculateVisibleRange` (lines 106–165): finds `start` by a forward loop from index 0
      accumulating heights (lines 117–124), then walks forward for `end` (129–133), with an
      at-bottom backward pack (142–155). No `blockSums` support at all.
    - `calculateTransformY` (lines 179–191): calls `getScrollOffsetForIndex(heightCache, itemHeight, visibleStart)` — no `blockSums`, so the O(n) fallback.
    - `getScrollOffsetForIndex` (lines 287–319): ALREADY supports an optional `blockSums`
      param with an O(blockSize) fast path; the `if (!blockSums)` branch is the O(n) fallback
      every production caller currently hits.
    - `buildBlockSums` (lines 348–366): builds cumulative sums per completed block. With
      `blockSize=1000`, `sums[b]` = total height of items `0 .. (b+1)*1000 - 1`. The array has
      `blocks - 1` entries (the final partial block has no entry).
- `src/lib/reactive-list-manager/ReactiveListManager.svelte.ts` — height bookkeeping.
    - `getBlockSums()` (lines 443–454): lazily rebuilds `_blockSums` via `buildBlockSums(this._heightCache, this._averageHeight, this._itemLength, this._blockSize)` when `_blockSumsValid` is false. `_blockSize` is 1000 (line 68).
    - `invalidateBlockSumsFrom(index)` (lines 423–430): truncates sums; called by
      `processDirtyHeights` (line 519) and `setMeasuredHeight` (line 576). `updateItemLength`
      (line 544) resets them fully.
    - **Latent staleness bug you must fix in Step 3**: `recomputeDerivedHeights()` (lines
      70–86) can change `_averageHeight` (the hysteresis snap) **without invalidating
      `_blockSums`** — but the sums embed the average for every unmeasured item. A snap
      would leave sums computed with the old average marked valid.
- `src/lib/utils/scrollCalculation.ts` — `calculateTopToBottomScrollTarget` (lines
  292–327) computes `itemTop`/`itemBottom` via two `getScrollOffsetForIndex(heightCache, calculatedItemHeight, …)` calls (lines 305–306), no `blockSums`. Public wrapper is
  `calculateScrollTarget` (line 233) taking `ScrollTargetParams` (lines 193–203).
- `src/lib/SvelteVirtualList.svelte` — the component. Call sites to rewire:
    - `visibleItems` derived (lines 537–565) → calls `calculateVisibleRange({...})` at 554.
    - `transformY` derived (lines 578–590) → calls `calculateTransformY(...)` at 583.
    - `captureViewportAnchor` (line 357) and `restoreViewportAnchor` (line 396) → each calls
      `getScrollOffsetForIndex(heightManager.getHeightCache(), heightManager.averageHeight, index)`.
    - `scroll()` (line 884) → calls `calculateScrollTarget({ ... heightCache: heightManager.getHeightCache() })`.
    - `updateDebugTailDistance()` (lines 479–491) — called **unconditionally** in the rAF
      scroll callback at line 636; only its `console.info` is gated by `INTERNAL_DEBUG`.

Key excerpt — the walk to replace in `calculateVisibleRange` (`virtualList.ts:117-124`):

```ts
let start = 0
let acc = 0
while (start < totalItems) {
    const h = getValidHeight(heightCache?.[start], itemHeight)
    if (acc + h > scrollTop) break
    acc += h
    start++
}
```

Key excerpt — the fast path that already exists in `getScrollOffsetForIndex`
(`virtualList.ts:307-318`), showing the blockSums convention to reuse:

```ts
const blockIdx = Math.floor(safeIdx / blockSize)
let offsetBase = 0
if (blockIdx > 0) {
    const base = blockSums[blockIdx - 1]
    offsetBase = Number.isFinite(base) ? (base as number) : 0
}
let offset = offsetBase
const start = blockIdx * blockSize
for (let i = start; i < safeIdx; i++) {
    offset += getValidHeight(heightCache[i], calculatedItemHeight)
}
return offset
```

Conventions:

- Trunk is the lint/format authority (`.trunk/trunk.yaml`); use `trunk fmt` / `trunk check`,
  NOT `pnpm lint` / prettier directly (see CLAUDE.md).
- Unit tests: Vitest, colocated `*.test.ts` — model on `src/lib/utils/virtualList.test.ts`.
- E2E fixtures self-report stats: pages render values in `[data-testid="stat-<name>"]`,
  specs assert them via `stat`/`readStats` from `src/lib/test/utils/statsLine.ts`. Exemplar
  fixture: `src/routes/tests/issues/issue-416/+page.svelte` (description block + red/green
  stat rows). Wait-conditions must require a digit (e.g. `/ratio=\d/`) because placeholders
  render `ratio=—`. Fixture backdrops for failure states are solid colors, not gradients.
- JSDoc on all exported functions; conventional commits.

## Commands you will need

| Purpose         | Command                          | Expected on success  |
| --------------- | -------------------------------- | -------------------- |
| Install         | `pnpm install`                   | exit 0               |
| Typecheck       | `pnpm run check`                 | exit 0, 0 errors     |
| Unit tests      | `pnpm run test:only -- <filter>` | all pass             |
| Full unit suite | `pnpm test`                      | all pass, coverage   |
| E2E             | `pnpm run test:e2e`              | all pass (3 engines) |
| Lint            | `trunk check`                    | no new failures      |
| Format          | `trunk fmt`                      | exit 0               |

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/utils/virtualList.ts`
- `src/lib/utils/virtualList.test.ts`
- `src/lib/utils/scrollCalculation.ts`
- `src/lib/utils/scrollCalculation.test.ts`
- `src/lib/reactive-list-manager/ReactiveListManager.svelte.ts`
- `src/lib/reactive-list-manager/ReactiveListManager.test.ts`
- `src/lib/SvelteVirtualList.svelte`
- `src/lib/utils/virtualList.perf-budget.test.ts` (create)
- `src/routes/tests/other/tail-scroll-cost/+page.svelte` (create)
- `tests/other/tail-scroll-cost.spec.ts` (create)

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/reactive-list-manager/RecomputeScheduler.ts` — scheduling is orthogonal.
- The `_measuredFlags` Uint8Array and `displayItems` allocation churn — separate findings,
  deliberately not bundled here.
- Changing the height-cache data structure (`Record<number, number>`) — explicitly deferred
  (finding PERF-06) until after this plan's results are measured.
- The public API surface (`src/lib/types.ts`, `src/lib/index.ts`) — no new exports needed;
  `blockSums` params are optional and internal.

## Git workflow

- Branch off `main`: `perf/block-sum-offset-acceleration`
- Conventional commits, e.g. `perf(virtual-list): wire block prefix sums into offset and range math`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write failing perf-budget tests (red)

Create `src/lib/utils/virtualList.perf-budget.test.ts`. These tests wrap the height cache
in a counting `Proxy` and assert a hard budget on property reads — the machine-checkable
form of "does not walk the whole prefix". Structure:

```ts
import { describe, expect, it } from 'vitest'
import { calculateScrollTarget } from './scrollCalculation.js'
import type { ScrollTargetParams } from './scrollCalculation.js'
import {
    buildBlockSums,
    calculateTransformY,
    calculateVisibleRange,
    type VisibleRangeOptions
} from './virtualList.js'

const TOTAL = 100_000
const HEIGHT = 40

const makeCountingCache = () => {
    const cache: Record<number, number> = {}
    for (let i = 0; i < TOTAL; i++) cache[i] = HEIGHT
    let reads = 0
    const proxy = new Proxy(cache, {
        get(target, prop, receiver) {
            reads += 1
            return Reflect.get(target, prop, receiver)
        }
    })
    return { proxy, readCount: () => reads }
}

describe('offset/range math read budgets (PERF-01/PERF-02)', () => {
    it('calculateVisibleRange near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount() // buildBlockSums legitimately reads everything once
        calculateVisibleRange({
            scrollTop: TOTAL * HEIGHT - 10_000,
            viewportHeight: 400,
            itemHeight: HEIGHT,
            totalItems: TOTAL,
            bufferSize: 20,
            totalContentHeight: TOTAL * HEIGHT,
            heightCache: proxy,
            blockSums
        } as unknown as VisibleRangeOptions)
        expect(readCount() - after).toBeLessThan(5_000)
    })

    it('calculateTransformY near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount()
        ;(calculateTransformY as unknown as (...args: unknown[]) => number)(
            TOTAL,
            90_000,
            HEIGHT,
            proxy,
            blockSums
        )
        expect(readCount() - after).toBeLessThan(5_000)
    })

    it('calculateScrollTarget near the end of 100k items stays within budget', () => {
        const { proxy, readCount } = makeCountingCache()
        const blockSums = buildBlockSums(proxy, HEIGHT, TOTAL)
        const after = readCount()
        calculateScrollTarget({
            align: 'top',
            targetIndex: 90_000,
            itemsLength: TOTAL,
            calculatedItemHeight: HEIGHT,
            height: 400,
            scrollTop: 0,
            firstVisibleIndex: 0,
            lastVisibleIndex: 10,
            heightCache: proxy,
            blockSums
        } as unknown as ScrollTargetParams)
        expect(readCount() - after).toBeLessThan(5_000)
    })
})
```

The `as unknown as` casts exist because the `blockSums` members don't exist on those
signatures yet — the current code silently ignores them, which is exactly the defect.
Step 4 makes the params real; a later step removes the casts.

**Verify**: `pnpm run test:only -- virtualList.perf-budget` → all 3 tests FAIL with
`expected N to be less than 5000` where N is a large read count (~90,000–200,000).
If any test passes, the reproduction is wrong: STOP and report.

### Step 2: Gate updateDebugTailDistance behind INTERNAL_DEBUG (PERF-03)

In `src/lib/SvelteVirtualList.svelte`, the rAF scroll callback (line 636) calls
`updateDebugTailDistance()` unconditionally; the function does
`viewport.querySelector('[data-original-index="…"]')` plus two `getBoundingClientRect()`
calls per scroll frame, and its only output is a `console.info` gated by `INTERNAL_DEBUG`
(line 488). Change the call site to:

```ts
if (INTERNAL_DEBUG) updateDebugTailDistance()
```

**Verify**: `pnpm test` → all pass (the function has no non-debug consumers).

### Step 3: Invalidate block sums when the published average changes

In `ReactiveListManager.svelte.ts`, `recomputeDerivedHeights()` (lines 70–86) can move
`_averageHeight` (hysteresis snap) without invalidating `_blockSums`, but `buildBlockSums`
bakes the average into every unmeasured item's contribution. At the end of
`recomputeDerivedHeights()`, if the value written to `this._averageHeight` differs from
the value it held on entry, clear the sums:

```ts
this._blockSums.length = 0
this._blockSumsValid = false
```

Add a unit test in `ReactiveListManager.test.ts` (model on the existing `getBlockSums`
tests there): construct a manager with a large `itemLength`, call `getBlockSums()`, then
feed `processDirtyHeights` measurements whose average moves beyond the 2% hysteresis band
(`AVERAGE_HYSTERESIS`, line 13), and assert a fresh `getBlockSums()` result reflects the
NEW average for unmeasured tail blocks (compare against a hand-computed expected sum).

**Verify**: `pnpm run test:only -- ReactiveListManager` → all pass including the new test.

### Step 4: Add blockSums support to the pure functions

In `src/lib/utils/virtualList.ts`:

1. Add `blockSums?: number[]` and `blockSize?: number` (default 1000) to
   `VisibleRangeOptions`. In `calculateVisibleRange`, when `blockSums` is present and
   non-empty, replace the from-zero walk with: binary-search for the smallest block index
   `b` with `blockSums[b] > scrollTop` (if none, `b = blockSums.length`); set
   `acc = b > 0 ? blockSums[b - 1] : 0` and `start = b * blockSize`; then continue the
   existing linear walk from there (≤ blockSize iterations). Everything downstream
   (`end` walk, at-bottom pack, buffers) stays byte-for-byte identical.
2. Add an optional 5th param `blockSums?: number[]` to `calculateTransformY` and pass it
   through to `getScrollOffsetForIndex`.

In `src/lib/utils/scrollCalculation.ts`: add `blockSums?: number[]` to
`ScrollTargetParams` and `TopToBottomScrollParams`, and pass it into both
`getScrollOffsetForIndex` calls (lines 305–306).

Add **equivalence tests** in `virtualList.test.ts` and `scrollCalculation.test.ts`: for a
randomized sparse height cache (seeded, e.g. ~30% of 10,000 items measured with heights
20–200), assert `calculateVisibleRange` with and without `blockSums` returns identical
`{start, end}` for a sweep of scrollTops (top, middle, near-bottom, exactly maxScrollTop),
and `calculateScrollTarget` returns identical targets with and without `blockSums` for
each align mode. Then remove the `as unknown as` casts from the Step 1 file.

**Verify**: `pnpm run test:only -- virtualList` and `pnpm run test:only -- scrollCalculation`
→ all pass, including the 3 Step-1 tests (now green) and the equivalence tests.

### Step 5: Thread heightManager.getBlockSums() through the component

In `src/lib/SvelteVirtualList.svelte`, pass `heightManager.getBlockSums()` at all five
call sites:

- `visibleItems` derived → add `blockSums: heightManager.getBlockSums()` to the
  `calculateVisibleRange` options (line 554).
- `transformY` derived → 5th argument to `calculateTransformY` (line 583).
- `captureViewportAnchor` → 4th argument to `getScrollOffsetForIndex` (line 357).
- `restoreViewportAnchor` → 4th argument to `getScrollOffsetForIndex` (line 396).
- `scroll()` → add `blockSums: heightManager.getBlockSums()` to the
  `calculateScrollTarget` params (line 884).

Note: `getBlockSums()` reads `_averageHeight` (a `$state`) and lazily rebuilds a plain
(non-reactive) array — calling it inside `$derived.by` is safe and adds the average as a
dependency, which those deriveds already have.

**Verify**: `pnpm test` → full unit suite passes. Then `pnpm run test:e2e` → full E2E
suite passes on chromium, firefox, and webkit — pay particular attention to
`tests/topToBottom/itemResize.spec.ts`, `tests/issues/issue-412.spec.ts`, and
`tests/issues/issue-413.spec.ts` (they exercise the anchor-restore path this rewires).

### Step 6: Perf fixture page + spec (house ritual)

Create `src/routes/tests/other/tail-scroll-cost/+page.svelte`, modeled structurally on
`src/routes/tests/issues/issue-416/+page.svelte` (what/why/how description block, live
stat rows with pass/fail lights, solid-color failure backdrop). Content:

- A 200,000-item list (fixed-content items, `testId="tail-cost-list"`).
- A probe that: settles at the top, performs N=15 scroll steps of ~1,000px each while
  timing `scrollTop += step` → `requestAnimationFrame` completion (like
  `tests/topToBottom/performance.spec.ts` does), records the median as `headMs`; then
  jumps to ~95% depth, repeats the same 15 steps, records median as `tailMs`; renders
  `data-testid="stat-tailcost"` with `headMs=<x> tailMs=<y> ratio=<y/x rounded to 2dp>`.
- Pass condition on the page: `ratio < 3`.

Create `tests/other/tail-scroll-cost.spec.ts` using `readStats` from
`src/lib/test/utils/statsLine.ts`: wait for `stat('tailcost')` to match `/ratio=[\d.]+/`
(digits required — the placeholder renders `ratio=—`), then assert
`stats.ratio < 3` and `stats.tailMs` is finite. Use a generous threshold (3×) —
this is a regression tripwire, not a benchmark; the read-budget unit tests from Step 1
are the precise gate.

**Verify**: `pnpm run test:e2e -- tests/other/tail-scroll-cost.spec.ts` → passes on all
three engines.

### Step 7: Full gate

**Verify**, in order:

1. `pnpm run check` → exit 0
2. `pnpm test` → all pass
3. `pnpm run test:e2e` → all pass (chromium + firefox + webkit)
4. `trunk fmt` then `trunk check` → no new failures
5. `git status` → only in-scope files modified/created

## Test plan

- **Red-first anchor**: the three Step-1 read-budget tests in
  `virtualList.perf-budget.test.ts` fail at plan time ("expected ~90000+ to be less than
  5000") and pass after Steps 4–5.
- Equivalence tests (Step 4): blockSums path ≡ legacy path for `calculateVisibleRange`
  (random sparse caches, scrollTop sweep incl. 0 and maxScrollTop) and
  `calculateScrollTarget` (every align mode).
- Manager staleness test (Step 3): block sums reflect a post-hysteresis-snap average.
- E2E tripwire (Step 6): tail/head scroll cost ratio < 3 on a 200k list, asserted from
  the fixture's own stats line.
- Pattern exemplars: `src/lib/utils/virtualList.test.ts` (unit),
  `tests/issues/issue-416.spec.ts` + `statsLine.ts` (e2e stats).

## Done criteria

- [ ] `pnpm run check` exits 0
- [ ] `pnpm test` exits 0; the 3 perf-budget tests exist and pass (they failed at plan time)
- [ ] Equivalence tests exist and pass
- [ ] `pnpm run test:e2e` exits 0 on all three engines, including the new tail-scroll-cost spec
- [ ] `grep -n "getBlockSums()" src/lib/SvelteVirtualList.svelte` shows ≥ 4 call sites
- [ ] `grep -n "if (INTERNAL_DEBUG) updateDebugTailDistance" src/lib/SvelteVirtualList.svelte` returns a match
- [ ] `trunk check` reports no new failures
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `.agents/.plans/perf-parity/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The Step-1 tests do not fail before the fix (reproduction wrong).
- An equivalence test finds ANY input where the blockSums path returns a different
  range/target than the legacy path — do not "fix" by loosening the assertion.
- `tests/topToBottom/itemResize.spec.ts`, `issue-412`, or `issue-413` e2e specs fail after
  Step 5 and a second look at the wiring doesn't reveal an obvious argument-order mistake —
  the anchor math may be sensitive to sums built mid-correction; report rather than patch.
- The fix appears to require changing `processDirtyHeights` semantics or the
  `RecomputeScheduler` — out of scope.
- The tail-scroll-cost fixture is flaky across engines after one threshold adjustment
  (raise to at most 4×; if still flaky, report — do not delete the spec).

## Maintenance notes

- Any future code path that mutates `_heightCache` or `_averageHeight` MUST invalidate
  block sums (`invalidateBlockSumsFrom` or full reset). Reviewers should check this
  whenever the manager gains a new mutator.
- Finding PERF-06 (replace the sparse `Record<number, number>` cache with a typed-array
  store) was deliberately deferred: re-measure after this lands — the remaining walks are
  ≤ blockSize, so it may no longer be worth the churn.
- If `blockSize` is ever tuned (currently 1000), the perf-budget thresholds (5,000 reads)
  must be revisited: worst case is ~2×blockSize + blocks reads per call.
- The `as unknown as` casts in the perf-budget test must be gone by the end of Step 4 —
  if a reviewer still sees them, Step 4 was incomplete.
