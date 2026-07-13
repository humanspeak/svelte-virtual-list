# Plan 002: Expose visible-range/scroll-position state via a public `onRangeChange` callback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/perf-parity/README.md`.
>
> **Drift check (run first)**: `git diff --stat b5da256..HEAD -- src/lib/SvelteVirtualList.svelte src/lib/types.ts src/lib/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Plan 001 also edits
> SvelteVirtualList.svelte — if it landed first, expect its diff and only
> compare the excerpts relevant to THIS plan.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of 001; rebase if 001 landed first)
- **Category**: direction (parity)
- **Planned at**: commit `b5da256`, 2026-07-13

## Why this matters

Every comparison library ships a way for consumers to observe which items are visible —
TanStack Virtual (`onChange`, `isScrolling`), react-virtuoso (`rangeChanged`,
`atBottomStateChange`), virtua (`onScroll`/`onScrollEnd`), react-window
(`onRowsRendered`), svelte-tiny-virtual-list (`onListItemsUpdate`). This library already
COMPUTES all of it — `SvelteVirtualListDebugInfo` carries `startIndex`, `endIndex`,
`atTop`, `atBottom` — but the only delivery channel is `debugFunction`, gated behind
`debug=true` with console noise attached. Consumers who need "which items are visible"
(analytics/impression tracking, URL sync, read receipts, sticky toolbars, scroll-position
persistence) must abuse debug mode in production. This plan promotes a trimmed payload to
a first-class, documented prop. It is a small, additive change with outsized parity value.

## Current state

Files and roles:

- `src/lib/types.ts` — public prop types. `SvelteVirtualListProps` (lines 9–78) currently
  ends with `onLoadMore` / `loadMoreThreshold` / `hasMore`. `SvelteVirtualListDebugInfo`
  (lines 94–104) shows the fields already computed.
- `src/lib/SvelteVirtualList.svelte` — the component.
    - Props destructuring at lines 186–202 (add the new prop here).
    - The debug-info effect (lines 725–753) is the pattern to mirror — it reads
      `visibleItems` and calls `createDebugInfo(...)`, which derives
      `atTop = scrollTop <= 1` and `atBottom = scrollTop >= totalHeight - viewportHeight - 1`
      (see `src/lib/utils/virtualListDebug.ts:92-93`).
    - `visibleItems` is the `$derived` visible range `{start, end}` (lines 537–565);
      `totalHeight` is `$derived(heightManager.totalHeight)` (line 475); container height is
      the `height` state (line 212); scroll position is `heightManager.scrollTop`.
- `src/lib/index.ts` — public exports; types are re-exported at lines 2–14.

Excerpt — the existing debug effect whose shape you mirror
(`SvelteVirtualList.svelte:725-737`):

```ts
$effect(() => {
    if (!debug) return
    const currentVisibleRange = visibleItems
    if (
        !shouldShowDebugInfo(
            prevVisibleRange,
            currentVisibleRange,
            prevHeight,
            heightManager.averageHeight
        )
    )
        return
    ...
})
```

Conventions:

- Trunk for lint/format (`trunk fmt`, `trunk check`) — never prettier/eslint directly.
- Every public prop gets a JSDoc block in `types.ts` with `@default` where applicable —
  match the style of `onLoadMore` (types.ts:63-67).
- Unit tests use Vitest + @testing-library/svelte — model on
  `src/lib/SvelteVirtualList.test.ts` (it shows how to mount the component with a
  `renderItem` snippet in tests).
- E2E fixtures self-report stats in `[data-testid="stat-<name>"]`; specs read them via
  `stat`/`readStats` from `src/lib/test/utils/statsLine.ts`; wait-conditions must require
  a digit. Exemplar: `src/routes/tests/issues/issue-416/+page.svelte` and
  `tests/issues/issue-416.spec.ts`.

## Commands you will need

| Purpose         | Command                          | Expected on success  |
| --------------- | -------------------------------- | -------------------- |
| Install         | `pnpm install`                   | exit 0               |
| Typecheck       | `pnpm run check`                 | exit 0, 0 errors     |
| Unit tests      | `pnpm run test:only -- <filter>` | all pass             |
| Full unit suite | `pnpm test`                      | all pass             |
| E2E             | `pnpm run test:e2e`              | all pass (3 engines) |
| Lint            | `trunk check`                    | no new failures      |
| Format          | `trunk fmt`                      | exit 0               |

## Scope

**In scope** (the only files you should modify/create):

- `src/lib/types.ts`
- `src/lib/SvelteVirtualList.svelte`
- `src/lib/index.ts`
- `src/lib/SvelteVirtualList.test.ts`
- `README.md` (props table addition only)
- `src/routes/tests/other/range-callback/+page.svelte` (create)
- `tests/other/range-callback.spec.ts` (create)

**Out of scope** (do NOT touch):

- `debugFunction` / `SvelteVirtualListDebugInfo` — keep them exactly as-is (the verbose
  debug channel remains separate).
- Any `isScrolling` state, scroll-velocity, or `onScrollEnd` API — future work; do not
  gold-plate.
- `docs/` site pages — docs deploy is a separate workflow.

## Git workflow

- Branch off `main`: `feat/on-range-change-callback`
- Conventional commits, e.g. `feat(virtual-list): add public onRangeChange callback`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

(Net-new API — no red-first reproduction test; see Test plan for the justification.)

### Step 1: Add the type and prop

In `src/lib/types.ts`:

```ts
/**
 * Snapshot of the rendered range and scroll edges, delivered via `onRangeChange`.
 */
export type SvelteVirtualListRangeInfo = {
    /** Index of the first rendered item (includes buffer). */
    start: number
    /** Index one past the last rendered item (includes buffer). */
    end: number
    /** True when the viewport is scrolled to the very top. */
    atTop: boolean
    /** True when the viewport is scrolled to the very bottom. */
    atBottom: boolean
}
```

Add to `SvelteVirtualListProps` (JSDoc style matching `onLoadMore`):

```ts
/**
 * Called whenever the rendered item range or the at-top/at-bottom state
 * changes. Fires once after mount with the initial range. Use for
 * impression tracking, URL sync, or scroll-position persistence.
 */
onRangeChange?: (_range: SvelteVirtualListRangeInfo) => void
```

In `src/lib/index.ts`, add `SvelteVirtualListRangeInfo` to the type import and re-export
lists (lines 2–14).

**Verify**: `pnpm run check` → exit 0.

### Step 2: Fire the callback from an effect

In `src/lib/SvelteVirtualList.svelte`: destructure `onRangeChange` in the props block
(lines 186–202). Below the existing debug effect, add a non-reactive tracker and effect:

```ts
let lastRangeInfo: SvelteVirtualListRangeInfo | null = null

$effect(() => {
    if (!onRangeChange) return
    const range = visibleItems
    const viewportHeight = height || 0
    const atTop = heightManager.scrollTop <= 1
    const atBottom = heightManager.scrollTop >= totalHeight - viewportHeight - 1
    if (
        lastRangeInfo &&
        lastRangeInfo.start === range.start &&
        lastRangeInfo.end === range.end &&
        lastRangeInfo.atTop === atTop &&
        lastRangeInfo.atBottom === atBottom
    )
        return
    lastRangeInfo = { start: range.start, end: range.end, atTop, atBottom }
    onRangeChange(lastRangeInfo)
})
```

Notes that matter:

- `lastRangeInfo` is a plain `let`, NOT `$state` — writing `$state` inside an effect that
  also reads it would loop.
- The `atTop`/`atBottom` math intentionally matches `createDebugInfo`
  (`virtualListDebug.ts:92-93`) so the two channels can never disagree.
- Import `SvelteVirtualListRangeInfo` alongside the existing type imports from
  `$lib/types.js` (line 147–152).
- Pass a fresh object each call (as above) — never a mutated shared reference.

**Verify**: `pnpm run check` → exit 0; `pnpm test` → existing suite still passes.

### Step 3: Unit tests

In `src/lib/SvelteVirtualList.test.ts`, following the existing mounting pattern in that
file, add a describe block covering:

1. **Initial fire**: mount with 100 items and an `onRangeChange` spy → the spy is called
   at least once, and the last call's payload has `start === 0`, `end > 0`, `atTop === true`.
2. **Dedupe**: after settling, record the call count; force an unrelated re-render (e.g.
   re-set the same props/state the test harness allows); assert the count did not grow
   (identical payloads are not re-delivered).
3. **Payload shape**: every call's payload has exactly `{start, end, atTop, atBottom}`
   with correct types.
4. **Not provided**: mounting WITHOUT `onRangeChange` does not throw or warn.

**Verify**: `pnpm run test:only -- SvelteVirtualList` → all pass, including 4 new tests.

### Step 4: Fixture page + e2e spec (house ritual)

Create `src/routes/tests/other/range-callback/+page.svelte` modeled on
`src/routes/tests/issues/issue-416/+page.svelte` (description block, live stat rows):

- 1,000 items, `testId="range-callback-list"`, an `onRangeChange` handler that counts
  calls and records the latest payload.
- Stat row `data-testid="stat-range"` rendering
  `calls=<n> start=<s> end=<e> atTop=<0|1> atBottom=<0|1>`.
- A probe that after mount scrolls the viewport to the bottom (`scrollTop = scrollHeight`),
  waits, then updates the stats.

Create `tests/other/range-callback.spec.ts` using `readStats`:

- Wait for `stat('range')` to match `/calls=\d/`.
- Assert initial state: `start === 0`, `atTop === 1`.
- After the probe scrolls to bottom (wait for `atBottom=1` in the stats line):
  `atBottom === 1`, `end === 1000`, and `calls` increased.

**Verify**: `pnpm run test:e2e -- tests/other/range-callback.spec.ts` → passes on all
three engines.

### Step 5: README + full gate

Add `onRangeChange` to the props documentation in `README.md` — find the props table with
`grep -n "onLoadMore" README.md` and match its row/section format exactly, including a
short usage snippet if neighboring props have one.

**Verify**, in order:

1. `pnpm run check` → exit 0
2. `pnpm test` → all pass
3. `pnpm run test:e2e` → all pass
4. `trunk fmt` then `trunk check` → no new failures
5. `git status` → only in-scope files modified/created

## Test plan

- **Red-first exemption**: this is a net-new API — there is no current behavior to pin
  with a failing test (the prop does not exist). Coverage is written alongside the
  feature instead: 4 unit tests (Step 3) + a stats-driven e2e fixture (Step 4).
- Unit tests model on `src/lib/SvelteVirtualList.test.ts`; e2e models on
  `tests/issues/issue-416.spec.ts` + `statsLine.ts`.
- Verification: `pnpm test` → all pass including 4 new tests; new e2e spec green on
  chromium, firefox, webkit.

## Done criteria

- [ ] `pnpm run check` exits 0
- [ ] `pnpm test` exits 0; the 4 new unit tests exist and pass
- [ ] `pnpm run test:e2e` exits 0 including `tests/other/range-callback.spec.ts`
- [ ] `grep -n "SvelteVirtualListRangeInfo" src/lib/index.ts` returns a match (type exported)
- [ ] `grep -n "onRangeChange" README.md` returns a match
- [ ] `debugFunction` behavior unchanged (`grep -n "debugFunction" src/lib/SvelteVirtualList.svelte` shows the same call sites as before)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `.agents/.plans/perf-parity/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The effect re-fires in a loop (call count grows without scroll/props changes) and the
  dedupe guard doesn't stop it — that means the payload reads are triggering reactive
  writes somewhere; report the cycle, don't add `untrack` speculatively.
- Svelte raises `state_unsafe_mutation` when the consumer callback writes `$state` — the
  existing `debugFunction` effect (lines 723–753) documents this hazard; if the same
  pattern doesn't resolve it, report.
- Adding the prop requires touching `ReactiveListManager` — it must not.
- The code at the cited lines doesn't match the excerpts (drift).

## Maintenance notes

- If a future `isScrolling`/`onScrollEnd` API is added, deliver it through this same
  payload/dedupe mechanism rather than a second parallel channel.
- Reviewers should check the callback is NOT invoked during SSR (effects don't run
  server-side — this falls out of `$effect`, but a refactor away from `$effect` would
  break it).
- Plan 001 touches the same component file; whichever lands second rebases — there is no
  logical conflict (different regions).
- Deliberately deferred: exposing `visibleStart`/`visibleEnd` (buffer-excluded indices) —
  the internal range currently includes buffer; documenting that honestly (as done in the
  JSDoc above) was chosen over computing a second unbuffered range.
