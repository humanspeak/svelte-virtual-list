# Plan 003: Improve `/examples` CTR and contextual internal links

> **Executor instructions**: Follow every step and verification. Stop on a listed
> condition. Update `.agents/.plans/search-intent/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat a4c51b9..HEAD -- docs/src/routes/examples/+page.svelte docs/src/routes/compare docs/src/lib/compare-data.ts docs/e2e/demo.test.ts`
>
> Revision 2026-08-27: re-baselined after Plan 001 passed and added the shared
> install-intent E2E coverage plus the canonical `/install` destination.

## Status

- **Priority**: P1
- **Effort**: S (hours)
- **Risk**: LOW
- **Depends on**: `001-npm-install-intent.md`
- **Category**: direction
- **Planned at**: commit `a4c51b9`, 2026-08-27

## Why this matters

The supplied `/examples` metrics—157 impressions, one click, 0.64% CTR, average
position 20.8—show both a ranking and snippet problem. Metadata can improve CTR,
while descriptive internal links can reinforce what the page is about. Position 20
will still cap clicks, so judge the change on both position and CTR, not CTR alone.

## Current state

- `docs/src/routes/examples/+page.svelte:1-78` renders useful scenario copy but never
  calls `getSeoContext()`. With no route load title, the page falls back to the site
  name and generic site description in `SeoHead`.
- The H1 is produced by `BrutIndexV2` from `hero.title.accent`; despite a configured
  `prefix`, the component currently renders only the accent and end, so the visible
  H1 is effectively `examples.`. Do not patch docs-kit in this plan.
- Every `ComparisonPageV2` already includes a generic `examples` masthead link.
  Additional work must use descriptive anchors or genuinely contextual destinations,
  not duplicate that link.
- `docs/e2e/demo.test.ts` already exercises `/examples` navigation.

## Target search presentation

- Title: `Svelte Virtual List Examples — Svelte 5 Demos`
- Meta description: `Explore Svelte 5 virtual list examples for 10,000 items, variable heights, infinite scroll, horizontal lists, and programmatic scrolling.`
- H1 intent: visible accessible heading should include `Svelte Virtual List Examples`.

## Commands you will need

| Purpose     | Command                                                  | Expected on success |
| ----------- | -------------------------------------------------------- | ------------------- |
| Typecheck   | `pnpm --filter docs check`                               | exit 0              |
| Focused E2E | `pnpm --filter docs test:e2e -- --grep "examples index"` | selected tests pass |
| Build       | `pnpm --filter docs build`                               | exit 0              |
| Format/lint | `trunk fmt && trunk check`                               | both exit 0         |

## Scope

**In scope**:

- `docs/src/routes/examples/+page.svelte`
- `docs/src/routes/compare/[slug]/+page.svelte` only if docs-kit exposes a valid
  shared slot/prop for contextual resources
- `docs/src/lib/compare-data.ts` only if a typed, rendered field supports contextual links
- `docs/e2e/demo.test.ts`

**Out of scope**:

- Individual example implementation pages
- Editing or vendoring docs-kit
- Creating keyword-stuffed hidden text or duplicating generic links
- Link-building outside the repository

## Git workflow

Suggested branch `advisor/003-examples-ctr-links`; conventional commit
`docs(seo): improve examples search snippet`. Do not push unless instructed.

## Steps

### Step 1: Make examples metadata and linking tests red

Extend the existing examples-index E2E test to assert the exact target title,
description, self-canonical, and an accessible H1 containing
`Svelte Virtual List Examples`. Add an assertion that at least the svelte-tiny
comparison exposes a descriptive crawlable anchor to `/examples` (anchor accessible
name must contain `Svelte virtual list examples`, case-insensitive).

**Verify**: focused E2E → FAILS on metadata, H1, and descriptive anchor. If not, STOP.

### Step 2: Set route-specific metadata and clarify the H1

In `docs/src/routes/examples/+page.svelte`, call `getSeoContext()` synchronously and
set the exact target title/description plus appropriate existing OG fields. Adjust
the hero title inputs so the actually rendered H1—not an ignored type field—contains
`Svelte Virtual List Examples`. Keep the existing five scenario cards and ensure the
opening paragraph naturally mentions the concrete scenarios in the description.

**Verify**: focused E2E → metadata/H1 assertions pass.

### Step 3: Add contextual links without duplicate boilerplate

Inspect the live docs-kit component API after Plan 001. If it supports a typed
resource slot/CTA with custom labels, add a shared comparison-page link named
`Svelte virtual list examples` to `/examples`, ideally near the verdict/next-step
area. If the only available API remains `examplesHref` with a hard-coded generic
label, do not add duplicate custom markup: record this sub-step as blocked-by-upstream
and retain the already-present masthead link. Do not edit `node_modules`.

Where per-competitor destinations add value, link to the closest demo (for example,
the variable-height or horizontal demo) rather than always linking to the index, but
keep at least one descriptive anchor to `/examples` for the asserted hub signal.

**Verify**: focused E2E passes, or the descriptive-anchor assertion is explicitly
removed with a batch README BLOCKED note explaining the docs-kit API limitation.

### Step 4: Run SSR and full gates

Build and inspect prerendered `/examples`. Run typecheck, all docs E2E, Trunk format,
and Trunk lint. Confirm `/examples` remains in the sitemap and all five cards work.

**Verify**: all commands exit 0.

## Test plan

The expanded Playwright test must demonstrate the current generic metadata/H1 and
link-label gap before implementation, then go green. Existing navigation assertions
continue to protect the horizontal demo. Ranking/CTR changes are measured externally
at 14 and 28 days as documented in the batch README.

## Done criteria

- [ ] Exact target title and description appear in SSR HTML.
- [ ] Canonical is `https://virtuallist.svelte.page/examples`.
- [ ] One accessible H1 contains `Svelte Virtual List Examples`.
- [ ] All five existing example cards remain visible and crawlable.
- [ ] Comparison pages retain their existing examples CTA; a descriptive contextual
      link is added if the installed docs-kit API supports it without upstream edits.
- [ ] Build, docs checks/E2E, and Trunk pass.
- [ ] Batch README status is updated, including any upstream-link limitation.

## STOP conditions

- Meeting the H1 requirement requires changing docs-kit rather than route inputs.
- Contextual anchors require invalid markup, editing `node_modules`, or copying the
  entire shared comparison component.
- A build changes unrelated generated artifacts; report before committing them.

## Maintenance notes

Search engines may rewrite titles/descriptions; that alone does not mean the markup
is wrong. Hold copy stable for a full 28-day comparison window. When new demos are
added, update the examples count, metadata only if the intent materially changes,
and the existing navigation E2E.
