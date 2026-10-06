# Plan 001: Add measured header and footer snippets to SvelteVirtualList

> Follow the steps and verification gates in order. Stop on any STOP condition;
> do not expand scope. Update this batch's README status when finished.
>
> Drift check first:
> `git diff --stat c1d0389f044938ea99428dda9c49b644759623a0..HEAD -- src/lib src/routes/tests/other/header-footer tests/other/header-footer.spec.ts README.md docs/src/routes/docs/api`
> Compare affected symbols with the excerpts below if these paths changed.
> Stop if the coordinate or anchor contracts have changed materially.

## Status

- Priority: P1
- Effort: L (multi-day, including browser regression coverage)
- Risk: MED/HIGH: scroll geometry changes on both axes
- Depends on: none; fixed/known-size mode is not a prerequisite
- Category: direction
- Planned at: `c1d0389f044938ea99428dda9c49b644759623a0`, 2026-10-05
- Status: DONE — guard PASS at `8515135`, 2026-10-05

## Why this matters

Consumers need loaders, introductions, banners and end markers inside the list's
scrollable content without inserting fake data rows. Add optional Svelte snippets
that remain mounted outside the virtualized row window and whose measured sizes
participate in scrolling. Preserve existing behavior when neither snippet is used.
This is a general list feature; it does not introduce chat bottom gravity or merge
`@humanspeak/svelte-virtual-chat` into this package.

## Current state and conventions

This pnpm workspace contains a Svelte 5/TypeScript library at the root and a
SvelteKit documentation site in `docs`. The library uses runes, snippets, generic
item types, pure geometry utilities and browser integration tests. Physical axes
are vertical or horizontal LTR; grids, masonry, RTL and Svelte 3/4 are non-goals.
No separate ADR, PRODUCT or DESIGN document was found for this feature.

Relevant source at the planned commit:

- `src/lib/types.ts:64`: the only content snippet is
  `renderItem: Snippet<[item: TItem, index: number]>`.
- `src/lib/SvelteVirtualList.svelte:480`:
  `const currentMaxScrollTop = () => Math.max(0, heightManager.totalHeight - (height || 0))`.
- Component `:805`: `const totalHeight = $derived(heightManager.totalHeight)`;
  `:903`: `const contentHeight = $derived(Math.max(height, totalHeight))`.
- Component `:885`: `calculateVisibleRange` currently receives the physical
  viewport offset as `scrollTop`, viewport size as `viewportHeight`, and row total
  as `totalContentHeight`. Its memo can reuse a range after small scroll deltas.
- Component `:909`: `transformY` comes from `calculateTransformY` using only
  row offsets. `:1491` renders one sized content wrapper and translated rows.
- Component `:1115`: `atBottom` compares scroll offset with row total minus
  viewport size. Debug output uses `createDebugInfo` and must remain consistent.
- Component `:1251`: `scroll()` computes its target twice, before and after
  target measurement, using `calculateScrollTarget`. `scrollToOffset` at `:1397`
  is a raw physical offset, clamped using `currentMaxScrollTop`.
- Component `:509` and `:541`: measurement and keyed-mutation anchors differ.
  At physical start, keyed prepends deliberately remain at offset zero; at end,
  infinite loaders preserve reading position instead of following every append.
- `src/lib/utils/axis.ts:5` centralizes offset, extent, rect and transform access.
  Match its axis-neutral implementation instead of duplicating vertical math.
- `src/lib/utils/scrollCalculation.ts` owns item alignment and keyboard math;
  `src/lib/utils/virtualList.ts` owns row ranges and prefix-offset calculations.
- `src/lib/reactive-list-manager/ReactiveListManager.svelte.ts` owns row
  measurements/averages/block sums. Header/footer must never become fake rows.

Existing Svelte patterns to retain:

```svelte
<script lang="ts" generics="TItem = unknown">
    // Props are destructured from $props(); computed geometry uses $derived.
</script>

{@render renderItem(currentItemWithIndex.item, currentItemWithIndex.originalIndex)}
```

Use existing optional prop/JSDoc conventions in `src/lib/types.ts`. Use
`tests/other/scroll-compensation.spec.ts` as the browser assertion pattern:
DOM-based reading drift is at most 2 pixels, not an assertion on internal cache
values alone. `src/lib/component-types.test.ts` uses `ComponentProps` and
`expectTypeOf` to verify actual component exports.

Sibling reference, optional and read-only:
`/Users/jasonkummerl/Github/svelte-virtual-chat/src/lib/types.ts:62` declares
`header?: Snippet` and `footer?: Snippet`. Its component's `measureElement` at
`:995` observes border-box size and disconnects on destruction. Do not depend on
that checkout being present: the required behavior is specified below. Do not
copy chat's bottom-gravity, follow state, tail reserve or message policies.

## Feature contract

Add `header?: Snippet` and `footer?: Snippet`, with no snippet arguments.
They scroll with content, are always mounted while supplied, are not sticky, and
are outside the keyed row loop. Their physical order is header, rows, footer;
horizontal mode interprets them as leading/trailing content. They support runtime
replacement, removal, size changes and orientation changes.

Define geometry explicitly:

- `H`: measured header extent along the active axis; absent means zero.
- `R`: row total from the existing list manager; retain its estimate/measurement model.
- `F`: measured footer extent; absent means zero.
- `V`: physical viewport extent. `S`: physical viewport scroll offset.
- Actual content extent: `C = H + R + F`; laid-out extent is `max(V, C)`.
- Maximum offset: `max(0, C - V)`.
- Row i's content coordinate: `H + existingRowOffset(i)`.
- Header starts at zero; footer starts at `H + R`. Short lists remain top/start
  aligned; extra minimum-height space follows the footer, not between rows and footer.

Store non-item sizes at component level; never add them to the row cache, average,
block sums, items length, renderItem indices or range indices. Extract new pure
coordinate math into `src/lib/utils/contentGeometry.ts` and test it independently.
For the render window, project the viewport onto the row interval:
`rowStart = clamp(S-H, 0, R)`,
`rowEnd = clamp(S+V-H, rowStart, R)`,
`rowViewportSize = rowEnd-rowStart`. Feed row-relative inputs into range math.
Ensure header-only/footer-only views remain valid without division by zero;
retaining a bounded buffered row window is allowed, but no viewport-covering row
may be omitted when the viewport intersects rows. Keep start/end row indices in
bounds and preserve the exclusive-end convention.

All index alignment modes use the row's absolute content coordinate, including
both initial and post-measurement correction. Add an optional `contentStartOffset`
(default zero) to the internal scroll target utility if needed; add the offset
before alignment, never after clamping. Preserve existing auto/nearest semantics.
Raw `scrollToOffset({offset})` continues to address the entire content from zero.
Aligning the final row to the viewport end does not include the footer; reaching
physical end through raw scrolling or the End key does. `onRangeChange.atBottom`
and debug `atBottom` refer to physical content end, including the footer.
Debug `totalHeight` should describe C and be documented; row average/counts stay
row-only. With no snippets all fields retain their previous meaning/value.

Measurement wrappers must isolate child-margin collapse, have no implicit
spacing, and be measured by border box on the active physical axis. Re-read
geometry when switching orientation. Handle zero-size content, disconnect
observers on removal/unmount, and guard DOM work for SSR. Snippet code owns its
own visual dimensions; no new public estimated-header/footer props in this change.
Invalidate the visible-range memo whenever H/F or orientation changes.

For non-item resize: preserve a visible row's painted reading position when
scrolled away from the start/end, keep a pinned end pinned, and keep physical
start at zero. Capture before mutating measured non-item sizes, update derived
extent, then restore against new content geometry using the existing pre-paint
correction pattern. If no row is visible, preserve/clamp the physical offset
unless end-pinned. Prevent double-counting H in keyed anchors: common leading
offset cancels in row-to-row offset deltas; H changes need their own compensation.

Loading thresholds remain item-count based. Header/footer never consume item
indices or count as new data for stall detection. Existing load concurrency,
empty-result/retry guards and loading-edge anchor exceptions remain intact.

## Commands and verification baseline

| Purpose                      | Command                                                                                                                                                                                                             | Success                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Dependencies, only if absent | `pnpm install --frozen-lockfile`                                                                                                                                                                                    | Exit 0; lockfile unchanged                |
| Typecheck                    | `pnpm run check`                                                                                                                                                                                                    | Exit 0, no errors                         |
| Unit tests                   | `pnpm test`                                                                                                                                                                                                         | All pass                                  |
| Focused unit tests           | `pnpm exec vitest run src/lib/utils/contentGeometry.test.ts src/lib/utils/scrollCalculation.test.ts src/lib/component-types.test.ts`                                                                                | All pass after implementation             |
| Focused browser tests        | `CI=1 pnpm exec playwright test tests/other/header-footer.spec.ts tests/other/scroll-compensation.spec.ts tests/other/load-more-stall.spec.ts tests/topToBottom/infiniteScroll.spec.ts --retries=0 --reporter=line` | All five configured browser projects pass |
| Complete browser suite       | `CI=1 pnpm exec playwright test --retries=0 --reporter=line`                                                                                                                                                        | All pass                                  |
| Library build                | `pnpm build`                                                                                                                                                                                                        | Exit 0, publint passes                    |
| Docs build                   | `pnpm --filter docs build`                                                                                                                                                                                          | Exit 0                                    |
| Formatting, executor only    | `trunk fmt <changed-files>`                                                                                                                                                                                         | Exit 0                                    |
| Lint                         | `trunk check <changed-files>`                                                                                                                                                                                       | Exit 0                                    |
| Whitespace                   | `git diff --check`                                                                                                                                                                                                  | No output, exit 0                         |

Playwright builds a production server on port 4173. Use CI mode to avoid silently
reusing an unrelated server; if the port is already occupied, report it rather
than killing another session's server. The previous focused exhaustion test
passed 15/15 across five browsers with retries disabled. Typecheck previously had
zero errors and 11 existing warnings. This is not a current full-suite baseline:
run baseline gates first and report unrelated failures separately without fixing
them here. Trunk, not package lint/format scripts, is the formatting authority.

## Scope

Only modify these paths:

- `src/lib/types.ts`, `src/lib/component-types.test.ts`.
- `src/lib/SvelteVirtualList.svelte`.
- `src/lib/utils/contentGeometry.ts`, `src/lib/utils/contentGeometry.test.ts` (new).
- `src/lib/utils/scrollCalculation.ts`, `src/lib/utils/scrollCalculation.test.ts`.
- `src/lib/utils/virtualList.ts`, `src/lib/utils/virtualList.test.ts` (only if the
  existing row-range helper cannot represent the projected viewport safely).
- `src/lib/utils/virtualListDebug.ts`, `src/lib/utils/virtualListDebug.test.ts`.
- `src/routes/tests/other/header-footer/+page.svelte` (new).
- `tests/other/header-footer.spec.ts` (new).
- `README.md`, `docs/src/routes/docs/api/props/+page.svx`,
  `docs/src/routes/docs/api/types/+page.svx`,
  `docs/src/routes/docs/scroll-methods/+page.svx`.
- This plan and its sibling index, for status/evidence updates only.

Do not change the sibling chat repo, list manager internals, package dependencies,
lockfile, exports, release workflow, competitive-intel state, existing test
assertions/tolerances, or public loading API. No sticky rows, document scrolling,
known-size mode, grids, chat wrapper, top-loading or follow-bottom changes.

## Git workflow

Execute in the operator-selected workspace; this plan grants no permission to
create another worktree. Current branch is `chore/fresh-main-2026-10-05`.
Use conventional commit messages if committing is separately authorized, e.g.
`feat: add measured header and footer snippets`. Do not push, publish or open a PR
unless instructed. Record any existing user changes before starting.

## Steps

### 1. Establish the baseline and geometry specification

Run typecheck, unit tests and the existing focused browser tests (omit the new
header/footer path until it exists). Record failures and tool availability in
this plan's execution notes. Add pure geometry tests before implementation:
H=60, five 40px rows, F=80, V=160 yields C=340 and max offset=180;
row 0 start-alignment is 60; row 4 end-alignment is 100; physical End is 180.
Cover zero extents, viewport entirely inside header/footer, partial row intersection,
short/empty lists and horizontal equivalents. Add scroll-target tests for each
alignment with a nonzero leading offset, keeping all default-zero tests intact.

This is a net-new API, so no pre-existing behavior is claimed broken. Tests may
initially fail because the new geometry module/parameter is absent; that is an
intentional development gate, not a claimed reproduction of a runtime bug.

Verify: focused unit command initially fails on the missing geometry contract or
wrong nonzero-offset targets; existing baseline tests pass or failures are recorded.

### 2. Implement and verify pure geometry

Create the content geometry helpers and extend the internal alignment parameter
with a backward-compatible default of zero. Do not scatter literal H additions
across alignment branches. Prove start/end/center/auto/nearest offsets and
clamping, especially last-row versus footer-end distinction.

Verify: focused unit command passes; all existing scroll calculation tests pass.

### 3. Integrate snippets, measurements and coordinate conversions

Add public optional snippet props and component type assertions. Render isolated
header/footer wrappers at the contract positions, outside the virtualized loop.
Implement lifecycle-safe axis measurements and the content extent derivations.
Audit every row-offset and full-scroll-offset boundary: range inputs, transforms,
initial/corrected programmatic targets, raw offsets, keyed/measurement anchors,
orientation-transition anchors, keyboard End/max offset, range callbacks and
public debug output. Keep the list manager row-only. Preserve loading guards.

Create the fixture and browser tests described below. Use DOM rectangle
assertions so agreement between two internal calculations cannot mask a bug.

Verify: `pnpm run check`, focused unit command and focused browser command pass.
No-snippet regression tests must pass without changing their assertions.

### 4. Exercise resize, replacement and mutation contracts

Complete the dynamic fixture controls and all scenarios in Test plan. Include
header/footer resize while reading, at start and at end; orientation change;
keyed prepend/reorder/trim; empty-to-populated transitions; and async loading.
Corrections must preserve the painted row within 2px after geometry settles and
must not cancel a travelling smooth scroll with an unsolicited instant write.

Verify: focused browser command passes across all five projects with retries
zero. If a failure reproduces, correct the implementation, not the tolerance.

### 5. Document and run the final gates

Document the snippets, content coordinates, horizontal behavior, raw offset
meaning, last-row/end distinction, nonsticky rendering, debug total extent,
margin-isolating wrappers and resize behavior. Include one Svelte 5 usage example.
Run formatting through Trunk and then typecheck, all units, complete E2E, library
build, docs build, Trunk check and diff check. Record commands/results and changed
paths; update the index to DONE only when every gate passes.

Verify: every command in the final gate exits zero; scoped git diff contains only
listed paths. Pre-existing unrelated failures require BLOCKED with their evidence,
not a silent DONE or weaker verification.

## Test plan

At minimum, independent parameterized browser tests cover both physical axes:

1. Header/footer exist with no rows; only their content is visible and scrollable
   when larger than the viewport. Indices remain `{start:0,end:0}`.
2. No-snippet behavior, header-only, footer-only and both; short/long lists.
3. DOM positions and total scroll extent use H+R+F exactly once.
4. Deep start/end/center/nearest/auto index alignment and raw offsets; last row
   aligned to end leaves a nonzero footer below, while End reaches full extent.
5. Visible-range changes and `atBottom`/debug agreement at the final row and footer.
6. Header/footer growth and shrink while reading, at offset zero, and at full end;
   dynamic row growth as well. A visible keyed row drifts no more than 2px.
7. Keyed prepend, reorder and trim with snippets preserve existing anchor rules.
8. Snippet removal/replacement and vertical-to-horizontal-to-vertical switching
   remeasure sizes, leave no stale offset, and maintain the responsive anchor.
9. Loading with footer UI terminates correctly; empty/failed loads do not spin or
   count snippet changes as arriving data; existing stall suite passes unchanged.
10. Smooth programmatic alignment survives changing non-item dimensions; unmount
    during observer activity causes no page errors. Verify SSR HTML/hydration with
    Playwright navigation response and no hydration console errors.

Use observable settling or `expect.poll`, not a fixed scroll-attempt budget.
Record console/page errors before navigation. The new pure helpers can use regular
Vitest tests; component API assertions follow existing `expectTypeOf` patterns.

## Done criteria

- [x] Public `header?: Snippet` and `footer?: Snippet` compile through ComponentProps.
- [x] New geometry/unit tests and all ten browser scenarios exist and pass.
- [x] Typecheck, all units, complete E2E with zero retries, both builds, Trunk and
      whitespace gates exit zero; existing warnings are separately listed.
- [x] Row count/indices/averages exclude snippets; DOM and reported total include them.
- [x] No source files outside Scope were changed (`git diff --name-only`).
- [x] Execution notes include baseline SHA, exact commands and results.
- [x] Batch README status is updated truthfully.

## STOP conditions

Stop and report if source excerpts/anchor contracts drift; an in-scope verification
fails twice after a reasonable implementation correction; the work requires list
manager internals, dependencies or any out-of-scope file; proposed wrappers alter
row pitch/margin behavior; row-index versus physical-content semantics cannot meet
the contract; or the implementation needs chat follow policies to pass list tests.
Do not resolve these by copying chat wholesale or relaxing existing assertions.

## Maintenance notes

Keep one conversion boundary between row and full-content coordinates. Future
known-size, window-scroll or leading-loading features must use this boundary.
Review header resize invalidation and orientation-transition anchors particularly
carefully: stale memos and double-counted leading size can pass simple demos while
breaking deep scrolling. A future shared chat engine is a separate initiative with
its own characterization tests; no consolidation is authorized by this plan.

## Execution notes — 2026-10-05

Source baseline `c1d0389f044938ea99428dda9c49b644759623a0`; plan commit `1ed9523`.
Sol implemented the feature; guard snapshot `33a64ab` reproduced a composed
end-anchor defect on both axes (200px gap). A separate Sol correction passed
targeted tests; guard reviewed final source snapshot
`851513520cdf6e41d3ff16eb4d674b4350f51be9`. No plan scope or criteria changed.

Executor baseline: `pnpm run check` exited 0 with 11 existing warnings;
`pnpm test` passed 361 tests. The existing focused browser command (without the
new header/footer path) passed 105/105 across five projects. New geometry tests
initially failed on the missing module/nonzero-offset contract before implementation.

Guard independently reproduced final gates:

- `pnpm run check`: exit 0, zero errors, the same 11 warnings.
- `pnpm test`: exit 0, 20 files / 381 tests passed.
- `pnpm exec vitest run src/lib/utils/contentGeometry.test.ts src/lib/utils/scrollCalculation.test.ts src/lib/component-types.test.ts`:
  exit 0, 3 files / 102 tests passed.
- `CI=1 pnpm exec playwright test --retries=0 --reporter=line`: exit 0,
  670 passed / 5 existing external-docs smoke skips / zero failures, 20.8 minutes.
  This includes all 130 new header/footer cases and the entire 235-case focused
  group on the final snapshot; a duplicate focused browser run was unnecessary.
- `pnpm build`: exit 0, publint passed.
- `pnpm --filter docs build`: exit 0, favicon verification passed.
- `trunk check` on all 15 changed source/test/docs paths: exit 0, no issues.
  Executor Trunk formatting and snapshot pre-commit formatting/checks also passed.
- `git diff --check` and the source scope audit: clean.

The unchanged external-docs smoke test expects old homepage demo selectors;
the built homepage returns HTTP 200 but lacks both selectors, so its existing
conditional skip remains. No assertions were relaxed. The extra docs dev-server
attempt failed on missing generated `docs/static/docs/api/events.md`; production
build/preview succeeded. These existing docs-test/dev limitations are follow-ups,
not failures of the required build or library gates. See the sibling guard report
for warnings, scope, correction evidence and residual risk. No PR or push performed.
