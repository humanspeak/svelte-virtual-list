# Plan 011: Complete responsive horizontal behavior and public documentation

> **Executor instructions**: This plan completes the user-facing feature after static
> horizontal mode is stable. Run every browser gate and update the sibling README.
>
> **Revision 2026-08-09**: Issue #427 names `svelte-virtuallists` and
> `svelte-tiny-virtual-list` as alternatives. The latter already has a comparison page;
> add the missing `svelte-virtuallists` comparison and refresh both comparisons after
> horizontal support ships.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- src/lib src/routes/tests/issues/issue-427 tests/issues/issue-427.spec.ts README.md docs/src docs/static`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 010-horizontal-rendering.md
- **Category**: direction
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

Issue #427's actual use case is vertical on desktop and horizontal on mobile. Static
horizontal support alone does not satisfy that workflow: axis changes must discard
incompatible measurements, retain the user's logical location, remeasure before paint,
and expose appropriate keyboard behavior and documentation.

## Required behavior

- `orientation` can change reactively at runtime.
- Capture the first visible item's stable key (or index fallback) and its logical
  position; abort in-flight programmatic scroll; clear old-axis measurements; reset
  offset; apply new axis layout; remeasure; restore the anchor with no stale-axis cache.
- Horizontal keys: Left/Right move by the standard line step; Home/End go to logical
  start/end; Page Up/Page Down and Space use an explicitly documented policy. Up/Down
  must remain available to page/interactive content unless intentionally handled.
- Accessibility label/region and focus ring remain unchanged.
- LTR only. Docs must say RTL is not supported in the first release.

## Current-state exemplars

- `captureViewportAnchor` / `restoreViewportAnchor` contain vertical correction
  discipline and programmatic-scroll exclusion.
- `handleViewportKeydown` gates layout reads until a supported key is known and ignores
  events originating in interactive descendants; preserve both properties.
- Docs sidebar entries are defined in `docs/src/lib/utils/docsNav.ts`.
- Existing docs examples demonstrate the preferred Svelte 5 snippet style.

## Scope

In scope: component/types/utilities/tests from plan 010, README API tables/examples,
one docs guide and live responsive example, docs navigation, and generated static API
mirrors only if the repository's documented generation command owns them.

Out of scope: RTL, CSS scroll snap, carousel buttons/pagination, reverse lists,
bidirectional loading, grid virtualization, or a second horizontal component.

## Steps

### Step 1: Add red responsive-switch and keyboard E2E cases

Extend issue #427 fixture with a media-query-driven orientation binding or explicit
toggle. Start mid-list, switch both directions repeatedly, and assert anchor identity,
bounded DOM, no blank frame after settle, correct axis overflow, and no stale transform.
Add horizontal keyboard assertions plus interactive-child noninterference.

**Verify**: issue #427 Chromium spec fails at runtime switching/keyboard behavior.

### Step 2: Implement atomic runtime orientation switching

Create one transition path that aborts active scroll waits, captures logical anchor,
clears cache via plan 001 semantics, invalidates range memo/prefix state, applies the
new estimate/axis, waits only for the minimum Svelte/layout boundary required, and
restores the anchor. Guard against rapid repeated toggles using an abort/generation
token rather than racing async ticks.

**Verify**: responsive-switch cases pass in Chromium without relaxed geometry bounds.

### Step 3: Complete horizontal keyboard behavior

Generalize pure keyboard target calculation by orientation. Add unit matrices for
modifier handling, clamping, supported keys, Home/End, page movement, and events from
interactive children. Ensure unsupported keys cause no layout reads.

**Verify**: `pnpm exec vitest run src/lib/utils/scrollCalculation.test.ts src/lib/SvelteVirtualList.test.ts`
and issue #427 keyboard cases pass.

### Step 4: Document the final API and responsive pattern

Update README props and scrolling tables, add static and responsive examples, document
size-prop precedence, start/end semantics, LTR-only scope, dynamic widths, keyboard
behavior, infinite loading, and migration compatibility. Add a docs guide/demo and nav
entry. Add `svelte-virtuallists` to the comparison data/navigation so its generated
comparison page covers the API, maintenance posture, horizontal behavior, and
programmatic scrolling called out by issue #427. Refresh the existing
`svelte-tiny-virtual-list` comparison and all comparison summaries so they no longer
describe horizontal mode as an advantage over this package. Keep claims factual and
source-linked. Do not restore the deleted `PRD.md`.

**Verify**: `pnpm --filter docs check` and `pnpm --filter docs build` exit 0; manually
inspect desktop and mobile layouts in the docs preview.

### Step 5: Run full verification

Run `trunk fmt`, `pnpm run check`, `pnpm run test:only`, `pnpm run test:e2e`,
`pnpm --filter docs check`, `pnpm --filter docs test`, `pnpm build`, and `trunk check`.

## Done criteria

- [ ] Vertical ↔ horizontal switching preserves the same logical visible item.
- [ ] No height survives as a width or vice versa.
- [ ] Rapid toggles and in-flight smooth scrolls cannot reassert stale positions.
- [ ] Horizontal keyboard behavior is pure-tested and browser-tested.
- [ ] Interactive descendants retain native key behavior.
- [ ] README and docs show issue #427's desktop/mobile pattern and state LTR scope.
- [ ] `/compare/svelte-virtuallists` exists, and both issue-mentioned alternatives
      have accurate post-feature comparisons without stale horizontal-gap claims.
- [ ] Full library/docs/browser gates pass.

## STOP conditions

- Runtime switching requires exposing manager internals publicly.
- Stable identity from plan 002 is absent or incompatible with anchor restoration.
- Any browser needs RTL-specific handling for ordinary LTR mode.
- Documentation build rewrites broad generated assets without a deterministic command.
- Existing vertical E2E regresses or needs weaker assertions.

## Git workflow and maintenance

Use branch `feat/responsive-horizontal-list`; conventional commits by behavior slice.
Reviewers should test rapid viewport breakpoint changes and overlapping programmatic
scrolls. RTL should become a separate plan informed by browser normalization tests.
