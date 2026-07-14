# Plan 003: Add `align: 'center'` and a `scrollToOffset()` method to the programmatic scroll API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/perf-parity/README.md`.
>
> **Drift check (run first)**: `git diff --stat 899ba3e..HEAD -- src/lib/types.ts src/lib/utils/scrollCalculation.ts src/lib/SvelteVirtualList.svelte`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Revision 2026-07-14 (guard):** Re-baselined from `b5da256` to `899ba3e`
> after plans 001 (block-sum acceleration, PR #423) and 002 (onRangeChange,
> PR #424) merged to main. All line anchors and excerpts below now describe
> main at `899ba3e`; `ScrollTargetParams` already carries an optional
> `blockSums` param that this plan's `maxScrollTop` addition composes with.
> Toolchain corrections baked in: Playwright runs 5 projects (not 3), e2e
> must run under `CI=1`, and `pnpm run test:only -- <filter>` does not
> actually filter (verify from per-file output of the full run instead).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none — plans 001 and 002 are both merged to main; this plan applies
  directly on top of `main`.
- **Category**: direction (parity)
- **Planned at**: commit `899ba3e`, 2026-07-14 (originally `b5da256`, 2026-07-13; re-baselined by guard)

## Why this matters

Two of the most common programmatic-scroll requests have no supported answer today:

1. **"Scroll to a search result, centered"** — GitHub issue **#165** explicitly asked for
   "top, **center**, or bottom" alignment; the current align union is only
   `'auto' | 'top' | 'bottom' | 'nearest'`. TanStack Virtual (`scrollToIndex` center),
   svelte-tiny-virtual-list (`scrollToAlignment: 'center'`), and react-virtuoso all
   support center alignment.
2. **"Restore the scroll position after navigation"** — GitHub issue **#66** hit this;
   there is no way to scroll to a raw pixel offset (TanStack `scrollToOffset`, virtua
   scroll restoration). Consumers can read `viewport.scrollTop` via the DOM but have no
   supported setter that cooperates with the component's abort/anchor machinery.

Both are additive, low-risk, and close visible checkboxes against every comparison
library. Initial-scroll-position props (`initialScrollIndex`) are deliberately deferred —
`scrollToOffset` + the existing promise-returning `scroll()` cover the restore use case.

## Current state

Files and roles:

- `src/lib/types.ts`:
    - Align union (line 129): `export type SvelteVirtualListScrollAlign = 'auto' | 'top' | 'bottom' | 'nearest'`
    - `SvelteVirtualListScrollOptions` (lines 114–123) and `DEFAULT_SCROLL_OPTIONS`
      (lines 128–132).
- `src/lib/utils/scrollCalculation.ts` — pure scroll-target math, well unit-tested
  (`scrollCalculation.test.ts`, 628 lines — the pattern to extend):
    - `calculateTopToBottomScrollTarget` (lines 298–343) computes
      `itemTop`/`itemBottom` via `getScrollOffsetForIndex`, then branches on `align`.
      The final branch is:

        ```ts
        if (align === 'top' || align === 'bottom' || align === 'nearest') {
            return alignToEdge(itemTop, itemBottom, scrollTop, height, align)
        }

        return null
        ```

        An unknown align value currently falls through to `return null` — which `scroll()`
        treats as "no scroll needed" and resolves silently. That is the current (broken)
        behavior for `'center'`.

    - `ScrollTargetParams` (lines 193–205) includes `itemsLength`, `heightCache`,
      `calculatedItemHeight`, `height`, `scrollTop`, and an optional `blockSums?: number[]`
      (line 204, landed with plan 001; `TopToBottomScrollParams` mirrors it at line 284) —
      but note `calculateTopToBottomScrollTarget` does NOT currently receive `itemsLength`,
      and neither function knows `maxScrollTop`. The `itemTop`/`itemBottom` computations are
      now multi-line `getScrollOffsetForIndex(...)` calls passing `blockSums` — keep passing
      it; your `maxScrollTop` param is additive alongside.
    - `clampValue` is imported from `./virtualList.js` (line 2).

- `src/lib/SvelteVirtualList.svelte`:
    - `scroll(options)` (lines 858–988): validates bounds, computes
      `scrollTarget = calculateScrollTarget({...})` (line 916; the params already include
      `blockSums: heightManager.getBlockSums()` at line 926 — keep it), handles the `null`
      early return just below, then runs the scroll machinery: increments
      `programmaticScrollDepth` (line 953), calls `heightManager.viewport.scrollTo({top, behavior})`
      (955–958), updates state in a rAF (~961–976, with an `INTERNAL_DEBUG` log block inside),
      and resolves via `waitForScrollEnd(...)` + `tick()` (980–987). Abort handling: lines
      864–869 create a fresh `AbortController` per call; the not-yet-mounted retry block
      follows at ~878–896.
    - `currentMaxScrollTop()` helper (line 335):
      `() => Math.max(0, heightManager.totalHeight - (height || 0))`.
- `tests/topToBottom/scroll.spec.ts` — e2e exemplar for scroll behavior specs.

Conventions:

- Trunk for lint/format (`trunk fmt`, `trunk check`).
- Pure math goes in `scrollCalculation.ts` with JSDoc + exhaustive unit tests; the
  component stays a thin caller. Match `alignToEdge`'s doc style.
- Issue fixtures: `src/routes/tests/issues/issue-NNN/+page.svelte` with a what/why/how
  description block and live red/green stat rows; specs assert the page's own stats via
  `stat`/`readStats` from `src/lib/test/utils/statsLine.ts` (digit-requiring wait
  patterns). Exemplar: `src/routes/tests/issues/issue-416/+page.svelte` +
  `tests/issues/issue-416.spec.ts`.

## Commands you will need

| Purpose         | Command                          | Expected on success   |
| --------------- | -------------------------------- | --------------------- |
| Install         | `pnpm install`                   | exit 0                |
| Typecheck       | `pnpm run check`                 | exit 0, 0 errors      |
| Unit tests      | `pnpm run test:only -- <filter>` | all pass              |
| Full unit suite | `pnpm test`                      | all pass              |
| E2E             | `CI=1 pnpm run test:e2e`         | all pass (5 projects) |
| Lint            | `trunk check`                    | no new failures       |
| Format          | `trunk fmt`                      | exit 0                |

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/types.ts`
- `src/lib/utils/scrollCalculation.ts`
- `src/lib/utils/scrollCalculation.test.ts`
- `src/lib/SvelteVirtualList.svelte`
- `src/lib/index.ts` (only if a new exported type is added)
- `README.md` (scroll API docs)
- `src/routes/tests/issues/issue-165/+page.svelte` (create)
- `tests/issues/issue-165.spec.ts` (create)
- `tests/topToBottom/scroll.spec.ts` (add cases)

**Out of scope** (do NOT touch):

- `initialScrollIndex` / `initialScrollOffset` props — deferred, see Maintenance notes.
- The deprecated `scrollToIndex` wrapper (lines 818–831) — leave exactly as-is.
- `waitForScrollEnd` (`src/lib/utils/scrollEnd.ts`) — reuse, don't modify.
- Bottom-to-top / reverse mode of any kind — deliberately removed in #395; chat lives in
  `@humanspeak/svelte-virtual-chat`.

## Git workflow

- Branch off `main`: `feat/165-center-align-scroll-to-offset`
- Conventional commits, e.g. `feat(virtual-list): support align center in scroll() (#165)`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing test for `align: 'center'` (red)

`'center'` is user-requested behavior the current code silently mishandles (falls through
to `null` = "already in place"), so it gets a red test. In
`src/lib/utils/scrollCalculation.test.ts`, following that file's existing
`calculateScrollTarget` test style, add:

```ts
it('centers the target item in the viewport for align center', () => {
    const target = calculateScrollTarget({
        align: 'center' as SvelteVirtualListScrollAlign,
        targetIndex: 50,
        itemsLength: 100,
        calculatedItemHeight: 40,
        height: 400,
        scrollTop: 0,
        firstVisibleIndex: 0,
        lastVisibleIndex: 10,
        heightCache: {}
    })
    // itemTop = 50*40 = 2000, itemHeight = 40, viewport = 400
    // centered: 2000 - (400 - 40) / 2 = 1820
    expect(target).toBe(1820)
})
```

(The `as SvelteVirtualListScrollAlign` cast is needed until Step 2 widens the union;
remove it in Step 2.)

**Verify**: `pnpm run test:only -- scrollCalculation` → the new test FAILS with
"expected null to be 1820". If it fails any other way, STOP and report.

### Step 2: Implement center alignment in the pure math

1. `src/lib/types.ts` line 129: widen the union to
   `'auto' | 'top' | 'bottom' | 'nearest' | 'center'` and update the
   `SvelteVirtualListScrollOptions.align` JSDoc (line 121) to list it.
2. `src/lib/utils/scrollCalculation.ts`: add `maxScrollTop?: number` to
   `ScrollTargetParams` AND `TopToBottomScrollParams` (pass it through in
   `calculateScrollTarget`), then handle center in
   `calculateTopToBottomScrollTarget` before the existing top/bottom/nearest branch:

    ```ts
    if (align === 'center') {
        const itemHeight = itemBottom - itemTop
        const target = itemTop - (height - itemHeight) / 2
        return Math.round(clampValue(target, 0, maxScrollTop ?? Infinity))
    }
    ```

    The upper clamp matters: centering an item near the end of the list would otherwise
    produce a target beyond the scrollable range, and `waitForScrollEnd` would be waiting
    for a position the browser can never reach.

3. `src/lib/SvelteVirtualList.svelte`: in `scroll()`, add
   `maxScrollTop: currentMaxScrollTop()` to the `calculateScrollTarget` params (line 916,
   alongside the existing `blockSums` entry).
4. Remove the Step-1 cast. Add unit tests: center for an item taller than the viewport
   (expect `itemTop`-anchored via the same formula — negative half-gap clamps at the
   right edge cases), center near index 0 (clamps to 0), center near the last index with
   `maxScrollTop` provided (clamps to `maxScrollTop`), and center with measured
   `heightCache` values (non-uniform heights).

**Verify**: `pnpm run test:only -- scrollCalculation` → all pass including the Step-1
test (now green). `pnpm run check` → exit 0.

### Step 3: Extract the shared scroll-execution tail

In `SvelteVirtualList.svelte`, `scrollToOffset` (Step 4) needs the exact machinery
`scroll()` runs after it knows its target. Extract lines 953–987 (from
`programmaticScrollDepth++` through the `waitForScrollEnd` chain) into a private helper
inside the script block:

```ts
const executeScrollToTarget = (
    scrollTarget: number,
    smoothScroll: boolean,
    signal: AbortSignal,
    resolve: () => void,
    reject: (reason?: unknown) => void
) => {
    programmaticScrollDepth++
    heightManager.viewport.scrollTo({
        top: scrollTarget,
        behavior: smoothScroll ? 'smooth' : 'auto'
    })
    requestAnimationFrame(() => {
        if (signal.aborted) return
        heightManager.scrollTop = scrollTarget
    })
    waitForScrollEnd(heightManager.viewport, scrollTarget, smoothScroll, signal)
        .then(async () => {
            await tick()
            resolve()
        }, reject)
        .finally(() => {
            programmaticScrollDepth = Math.max(0, programmaticScrollDepth - 1)
        })
}
```

Replace the tail of `scroll()` with a call to it, preserving the `INTERNAL_DEBUG`
logging blocks where they currently sit (keep them in `scroll()` before the call, or
inline in the helper — either is fine as long as behavior with `INTERNAL_DEBUG=false`
is identical). This is a pure refactor: no behavior change.

**Verify**: `pnpm test` → all pass. `pnpm run test:e2e -- tests/topToBottom/scroll.spec.ts` →
all pass (the scroll machinery is heavily covered there).

### Step 4: Add the `scrollToOffset` method

Below `scroll()`, add an exported method mirroring its structure (abort handling copied
from lines 864–869, mounted-check from ~878–896):

```ts
/**
 * Scrolls the viewport to a raw pixel offset. Complements {@link scroll}
 * (index-based): use this to restore a persisted scroll position.
 *
 * @returns Promise that resolves when scrolling has visually finished.
 */
export const scrollToOffset = (options: {
    offset: number
    smoothScroll?: boolean
}): Promise<void> => {
    const { offset, smoothScroll = true } = options
    scrollAbortController?.abort()
    const abortController = new AbortController()
    scrollAbortController = abortController
    const { signal } = abortController

    return new Promise<void>((resolve, reject) => {
        if (!heightManager.viewportElement) {
            tick().then(() => {
                if (signal.aborted || !heightManager.viewportElement) {
                    resolve()
                    return
                }
                scrollToOffset({ offset, smoothScroll }).then(resolve, reject)
            })
            return
        }
        const target = Math.round(clampValue(offset, 0, currentMaxScrollTop()))
        executeScrollToTarget(target, smoothScroll, signal, resolve, reject)
    })
}
```

Note: `clampValue` is already imported in the component (line 155–160 import block).

Add unit tests in `src/lib/SvelteVirtualList.test.ts` if that file already tests
`scroll()` through the component instance (mirror the pattern); otherwise cover
`scrollToOffset` in the e2e spec only and say so in the commit message.

**Verify**: `pnpm run check` → exit 0; `pnpm test` → all pass.

### Step 5: Fixture page + e2e specs (house ritual, issue #165)

Create `src/routes/tests/issues/issue-165/+page.svelte` modeled on
`src/routes/tests/issues/issue-416/+page.svelte`:

- What/why/how description: #165 asked for center alignment; pre-fix, `align: 'center'`
  fell through to a silent no-scroll.
- 1,000 fixed 40px items, `testId="issue-165-list"`, viewport ~400px.
- Probe: call `listRef.scroll({ index: 500, align: 'center', smoothScroll: false })`,
  await it, then measure the target item's rect center vs the viewport rect center;
  render `data-testid="stat-center"` with `centerDeltaPx=<abs delta rounded>` — pass when
  `centerDeltaPx <= 2`. Second probe: `scrollToOffset({ offset: 12345, smoothScroll: false })`,
  then render `data-testid="stat-offset"` with `scrollTopPx=<viewport.scrollTop rounded>` —
  pass when within 2px of 12345.

Create `tests/issues/issue-165.spec.ts` with `readStats`: wait for
`/centerDeltaPx=\d/` and `/scrollTopPx=\d/`, assert `centerDeltaPx <= 2` and
`Math.abs(scrollTopPx - 12345) <= 2`.

Also add two cases to `tests/topToBottom/scroll.spec.ts` following its existing style:
center-align an item mid-list and assert its bounding box is vertically centered in the
viewport (±2px); center-align index `items.length - 1` and assert the viewport is at
`scrollHeight - clientHeight` (clamp works end-to-end).

**Verify**: `pnpm run test:e2e -- tests/issues/issue-165.spec.ts tests/topToBottom/scroll.spec.ts`
→ all pass on all five Playwright projects.

### Step 6: README + full gate

Update `README.md`: find the scroll API docs via `grep -n "align" README.md`; add
`'center'` to the documented align values and document `scrollToOffset({ offset, smoothScroll })`
next to `scroll()`, matching the existing format.

**Verify**, in order:

1. `pnpm run check` → exit 0
2. `pnpm test` → all pass
3. `CI=1 pnpm run test:e2e` → all pass on all five projects
4. `trunk fmt` then `trunk check` → no new failures
5. `git status` → only in-scope files modified/created

## Test plan

- **Red-first anchor**: the Step-1 unit test demonstrates the current defect —
  `calculateScrollTarget` with `align: 'center'` returns `null` (expected `1820`) — and
  flips green in Step 2. `scrollToOffset` is net-new API (no red-first; covered by the
  Step-5 fixture + specs).
- Unit: center math for uniform heights, measured heights, item taller than viewport,
  clamp-at-0, clamp-at-max. Model on existing `calculateScrollTarget` tests in
  `scrollCalculation.test.ts`.
- E2E: issue-165 fixture stats (`centerDeltaPx`, `scrollTopPx`) + two scroll.spec.ts
  cases, all five Playwright projects (chromium, firefox, webkit, mobile-chrome, mobile-safari).
- Step 3's refactor is guarded by the existing `scroll.spec.ts` suite.

## Done criteria

- [ ] `pnpm run check` exits 0
- [ ] `pnpm test` exits 0; the Step-1 center test exists and passes (it failed at plan time)
- [ ] `pnpm run test:e2e` exits 0 including `tests/issues/issue-165.spec.ts`
- [ ] `grep -n "'center'" src/lib/types.ts` returns a match in the align union
- [ ] `grep -n "scrollToOffset" src/lib/SvelteVirtualList.svelte` shows the exported method
- [ ] `grep -n "center" README.md` and `grep -n "scrollToOffset" README.md` return matches
- [ ] The deprecated `scrollToIndex` is byte-identical to before (`git diff` shows no hunk touching lines 818–831's region)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `.agents/.plans/perf-parity/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The Step-1 test does not fail with "expected null to be 1820" before the fix.
- After the Step-3 refactor, any existing test in `tests/topToBottom/scroll.spec.ts` or
  `tests/issues/issue-414.spec.ts` (keyboard scroll aborts programmatic scroll) fails —
  the abort/depth machinery is subtle; report rather than reshuffle it.
- Implementing the clamp requires totalHeight knowledge inside `scrollCalculation.ts`
  beyond the optional `maxScrollTop` param — do not add an O(n) total computation there.
- `waitForScrollEnd` times out in the e2e fixture for the clamped end-of-list center case —
  that means the clamp isn't reaching the browser's real max; report with the measured
  `scrollHeight`/`clientHeight` values.

## Maintenance notes

- `initialScrollIndex`/`initialScrollOffset` props were deliberately deferred: they must
  interact with the estimate-correction pass (#413 anchor machinery) and deserve their own
  plan. `scrollToOffset` in `onMount` is the documented workaround.
- Reviewers should scrutinize the Step-3 extraction diff hardest: `programmaticScrollDepth`
  must be incremented before `scrollTo` and decremented exactly once per call in
  `finally` — an imbalance silently disables anchor preservation (or re-enables it
  mid-animation).
- If Plan 001 landed, `calculateScrollTarget` also carries `blockSums`; keep both optional
  params — they compose.
- Center alignment for items taller than the viewport intentionally anchors past-center
  (the formula's negative half-gap) then clamps; if users report wanting top-anchoring for
  oversized items (virtuoso's behavior), that's a one-line policy change in the center
  branch — record it as a follow-up, don't preempt it.
