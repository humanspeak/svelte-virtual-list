# Claude Handoff: BottomToTop Basic Slice

## Context

This handoff is for the current `bottomToTop` rewrite work in `@humanspeak/svelte-virtual-list`.

User direction shifted away from trying to fix everything at once. The current target is:

- use `http://localhost:8024/tests/list/bottomToTop/basic` as the design page
- implement only the simplest chat-style `bottomToTop` slice
- make the page visibly inspectable with live stats
- defer `freeScroll`, `programmaticScroll`, streaming correctness, and general parity

The user specifically wants the mental model to be:

1. create a large estimated top spacer
2. render an estimated tail window immediately
3. measure mounted tail items
4. adjust the top spacer
5. backfill heights in a hidden measurement lane
6. keep the visible tail bottom-locked while this happens

## Last Known Stable Checkpoint

If a rollback point is needed, the last explicitly-created checkpoint before the newest rewrite work was:

- commit `ab02aff`
- message: `fix: restore bottom-to-top baseline before final streaming lock`

That checkpoint did **not** include the newest `basic`-page instrumentation / simplified dedicated-path work described below.

## Current Worktree State

Current dirty files:

- [src/lib/SvelteVirtualList.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/SvelteVirtualList.svelte)
- [src/lib/reactive-list-manager/ReactiveListManager.svelte.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/reactive-list-manager/ReactiveListManager.svelte.ts)
- [src/lib/types.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/types.ts)
- [src/lib/utils/virtualListDebug.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/utils/virtualListDebug.ts)
- [src/routes/tests/list/bottomToTop/basic/+page.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/routes/tests/list/bottomToTop/basic/+page.svelte)
- [tests/bottomToTop/basic.spec.ts](/Users/jasonkummerl/Github/svelte-virtual-list/tests/bottomToTop/basic.spec.ts)
- new folder: [src/lib/bottom-to-top](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top)

Current new files in `src/lib/bottom-to-top/`:

- [BottomToTopController.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/BottomToTopController.ts)
- [BottomToTopMeasurementLane.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/BottomToTopMeasurementLane.svelte)
- [BottomToTopStateMachine.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/BottomToTopStateMachine.ts)
- [bottomToTopMapping.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/bottomToTopMapping.ts)

## What Changed In This Slice

### 1. Dedicated `bottomToTop` path was simplified

In [SvelteVirtualList.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/SvelteVirtualList.svelte):

- the dedicated `bottomToTop` path is still live
- active state machine was reduced to:
    - `initializing`
    - `lockedBottom`
- most live `freeScroll` / `programmaticScroll` branches were removed from the dedicated path
- the dedicated render branch now uses spacer flow during init instead of the earlier bottom-align hack:
    - top spacer
    - visible items
    - bottom spacer
    - hidden measurement lane
- there is a helper `shouldMaintainBottomToTopBottomLock()` which currently gates some “snap back to bottom” behavior when the user has scrolled away

### 2. Debug payload was expanded

In [types.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/types.ts):

- `SvelteVirtualListDebugInfo` was changed to a union:
    - `SvelteVirtualListBaseDebugInfo`
    - `SvelteVirtualListExtendedDebugInfo`

Reason:

- making every new field optional was weak
- union kept backward compatibility with old tests/callers
- the `basic` page can narrow to the richer type

In [virtualListDebug.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/utils/virtualListDebug.ts):

- `createDebugInfo(...)` now accepts rich `extras`
- emits:
    - engine
    - mode
    - bottomToTop state
    - mounted/rendered counts
    - measurement queue count
    - spacer sizes
    - physical/logical windows
    - DOM scroll metrics
    - gap from bottom

### 3. Basic page got a visible stats panel

In [basic/+page.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/routes/tests/list/bottomToTop/basic/+page.svelte):

- the page now has a compact stats strip above the list
- the list is still intended to be the focus
- stats test ids added:
    - `bottom-to-top-basic-stats`
    - `stats-state`
    - `stats-measured`
    - `stats-mounted`
    - `stats-window`
    - `stats-spacers`
    - `stats-scroll`
    - `stats-heights`
    - `stats-queue`

### 4. Basic Playwright spec was updated

In [basic.spec.ts](/Users/jasonkummerl/Github/svelte-virtual-list/tests/bottomToTop/basic.spec.ts):

- added a stats-panel assertion
- changed the “start position” expectation to the new slice model:
    - start near bottom rather than `scrollTop === 0`
- changed the scroll smoke test to scroll from a known bottom-aligned state first

## Important Debugging Discovery

### Playwright and the dev server were not exercising the same app instance

This caused confusion during debugging.

- dev page the user was looking at:
    - `http://localhost:8024/tests/list/bottomToTop/basic`
- Playwright config:
    - builds + runs preview on `http://localhost:4173`
    - file: [playwright.config.ts](/Users/jasonkummerl/Github/svelte-virtual-list/playwright.config.ts)

Also:

- local Playwright reuses existing preview when `CI` is not set
- a stale `vite preview` process on `4173` caused tests to hit old assets

Useful commands:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
kill <pid>
CI=1 pnpm exec playwright test tests/bottomToTop/basic.spec.ts --project=chromium --workers=1
```

That fresh preview run is the trustworthy automated signal.

## Current Validation Status

### `pnpm run check`

Status:

- passes
- 0 errors
- 8 warnings

Warnings are the same style of existing Svelte `state_referenced_locally` warnings around captured initial values in [SvelteVirtualList.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/SvelteVirtualList.svelte) and one test helper file.

### Fresh preview Playwright run

Command used:

```bash
CI=1 pnpm exec playwright test tests/bottomToTop/basic.spec.ts --project=chromium --workers=1
```

Current result:

- 7 passed
- 2 failed

Failing tests:

1. [basic.spec.ts](/Users/jasonkummerl/Github/svelte-virtual-list/tests/bottomToTop/basic.spec.ts)
    - `should expose bottom-to-top stats on the basic page`
    - failure now is **not** “panel missing”
    - after fresh preview, the panel exists, but:
        - `gapFromBottomPx` is `440460`
        - expected `<= 2`

2. [basic.spec.ts](/Users/jasonkummerl/Github/svelte-virtual-list/tests/bottomToTop/basic.spec.ts)
    - `should handle scroll events in bottomToTop mode`
    - two observed failure modes across retries:
        - `scrollToMaxAndWait(...)` times out
        - visible indices do not change after upward scroll

## Current Behavior Problems

### 1. Init bottom lock is still wrong

This is the main remaining bug in the current slice.

Symptoms:

- in fresh preview, the stats panel can report a huge bottom gap (`440460px`)
- the dedicated init path is not actually landing at the bottom early enough
- the stats output on the dev route was also observed stuck at:
    - `Bottom Gap 0px scroll 0/0`
    - `Measured 0/10000 0%`
      while the real viewport already had a massive scroll range

Interpretation:

- the page-level stats surface is now good enough to show that init bottoming is not happening
- but some combination of:
    - `heightManager.scrollTop`
    - actual viewport `scrollTop`
    - debug snapshot timing
    - init measurement/reconcile timing
      is still inconsistent during early frames

### 2. Scroll smoke behavior is still unstable

Even after simplifying the dedicated path:

- upward wheel scroll on the `basic` page is not reliably changing the visible slice in preview

Likely causes:

- still too much bottom maintenance during early or near-bottom phases
- `scrollToMaxAndWait` expectation may still be fighting changing `scrollHeight`
- dedicated path is not yet transitioning from “initial correction” to “normal render” cleanly

### 3. Stats feedback loop happened once and was partially worked around

What happened:

- the page initially used `debugFunction={(info) => { stats = info }}`
- that created a reactive feedback loop
- user saw:
    - repeated `updated at:` spam
    - `effect_update_depth_exceeded`

What changed:

- inline callback was replaced
- then route state updates were changed again to poll `viewport.__svlDebug`
- [SvelteVirtualList.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/SvelteVirtualList.svelte) now writes the latest debug snapshot to:
    - `heightManager.viewportElement.__svlDebug`
- [basic/+page.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/routes/tests/list/bottomToTop/basic/+page.svelte) polls that on RAF

This removed the obvious page-level callback loop, but the early stats still appear stale/incomplete and need re-checking.

## Most Important Files To Read First

If continuing from the current worktree, read these in order:

1. [src/lib/SvelteVirtualList.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/SvelteVirtualList.svelte)
2. [src/routes/tests/list/bottomToTop/basic/+page.svelte](/Users/jasonkummerl/Github/svelte-virtual-list/src/routes/tests/list/bottomToTop/basic/+page.svelte)
3. [tests/bottomToTop/basic.spec.ts](/Users/jasonkummerl/Github/svelte-virtual-list/tests/bottomToTop/basic.spec.ts)
4. [src/lib/bottom-to-top/BottomToTopController.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/BottomToTopController.ts)
5. [src/lib/bottom-to-top/BottomToTopStateMachine.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/bottom-to-top/BottomToTopStateMachine.ts)
6. [src/lib/utils/virtualListDebug.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/utils/virtualListDebug.ts)
7. [src/lib/types.ts](/Users/jasonkummerl/Github/svelte-virtual-list/src/lib/types.ts)

## Suggested Next Steps For Claude

Do not try to fix streaming, loadItems, or parity yet. Stay on the `basic` slice.

### Step 1: Fix init bottoming before anything else

Focus only on the `basic` page and the fresh-preview `gapFromBottomPx` problem.

Suggested investigation:

- instrument when `initializeBottomToTopWindow()` actually runs
- confirm whether `syncScrollTop(getViewportMaxScrollTop(), true)` during init is using:
    - real DOM `scrollHeight`
    - estimated `totalHeight`
    - or stale `height`
- verify whether a later effect is resetting `heightManager.scrollTop` back to `0`
- compare:
    - `heightManager.scrollTop`
    - `viewport.scrollTop`
    - debug payload `scrollTopPx`
    - actual DOM `maxScroll`

The priority is:

- make the initial committed tail render actually land at the bottom
- then keep it there through the first visible measurement pass

### Step 2: Make the stats surface truthful

Right now the panel helped expose the bug, but the early values are still misleading.

Recommended:

- keep `__svlDebug` on the viewport
- avoid page->component callback feedback
- make sure the debug snapshot uses real viewport metrics on every emission
- confirm the stats panel updates from:
    - `0/0`
    - to real measured counts and real scroll metrics

### Step 3: Re-run only the `basic` slice

Primary command:

```bash
CI=1 pnpm exec playwright test tests/bottomToTop/basic.spec.ts --project=chromium --workers=1
```

Only after this is green should other bottom-to-top routes be revisited.

## Non-Goals For The Next Person

Do **not** broaden scope immediately into:

- `tests/bottomToTop/streaming.spec.ts`
- `tests/bottomToTop/loadItems.spec.ts`
- `issue-298`
- `issue-341`
- full `scroll({ index })`
- full free-scroll anchor preservation

That was the earlier failure mode.

## Short Summary

The repo now has:

- a simpler dedicated `bottomToTop` path
- a visible `basic`-page stats panel
- a richer debug contract
- a cleaner understanding of the preview-vs-dev mismatch

But the slice is **not done**.

The real blocker is still:

- initial bottom alignment on the `basic` page is not correct in fresh preview
- scroll smoke remains unstable afterward

Claude should continue from the `basic` page only and fix init bottoming before doing anything broader.
