# Plan 002: Prioritize high-traction VS pages in LLM discovery

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> the `README.md` that sits alongside this plan file
> (`.agents/.plans/seo-geo/README.md`) unless a reviewer told you they maintain
> the index.
>
> **Revision 2026-08-11**: Rebased the drift check and planned-at SHA to the
> reviewed Plan 001 tip (`d8be6c8`). Plan 001 legitimately added its regression
> test to the shared `docs/e2e/demo.test.ts`; preserve that test while adding the
> Plan 002 coverage.
>
> **Drift check (run first)**:
> `git diff --stat d8be6c8..HEAD -- docs/llms-positioning.md docs/e2e/demo.test.ts docs/vite.config.ts`
> Any mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `001-refresh-svelte-tiny-comparison.md`
- **Category**: direction
- **Planned at**: commit `d8be6c8`, 2026-08-11

## Why this matters

The site already publishes strong human-facing VS pages, Article JSON-LD, a
sitemap, social cards, `llms.txt`, `llms-full.txt`, permissive AI crawler rules,
and IndexNow submissions. The supplied baseline identifies three especially
valuable existing routes: virtua at roughly 892k weekly downloads, TanStack at
roughly 61k, and the dormant `@sveltejs/svelte-virtual-list` at roughly 36k.
However, the generated LLM discovery files currently list docs and examples
only; they do not point answer engines to `/compare` or any head-to-head page.
This leaves the project's highest-traction acquisition pages disconnected from
its explicit GEO entry points.

This plan adds concise, source-linked comparison guidance to the existing
hand-authored prepend source so both generated files inherit it. It avoids a
new generator or duplicated feature matrices.

## Current state

- `docs/llms-positioning.md` is passed as `prepend` to both `llmsPlugin` and
  `llmsFullPlugin` in `docs/vite.config.ts:39-49`.
- `docs/llms-positioning.md:9-13` contains a short recommendation boundary for
  TanStack Virtual and virtua, but no comparison-page links and no guidance for
  `svelte-tiny-virtual-list`, `svelte-virtuallists`, or the legacy Svelte
  package.
- The generated files `docs/static/llms.txt` and
  `docs/static/llms-full.txt` are intentionally gitignored at
  `docs/.gitignore:37-38`. They must be verified after a build, not committed.
- The current generated `llms.txt` has `## Documentation` and `## Examples`
  sections, but no `## Comparisons` section.
- `docs/src/lib/compare-data.ts:30-265` is the canonical comparison dataset;
  Plan 001 makes its closest-competitor claims current before this summary is
  exposed to LLM crawlers.
- The high-traction VS routes already exist and must be reused, not duplicated:
  `/compare/virtua`, `/compare/tanstack-virtual`, and
  `/compare/sveltejs-svelte-virtual-list`. The latter is the clean replacement
  query target because the original package is dormant but retains substantial
  downloads.
- Comparison pages already emit Article JSON-LD and source links through
  `@humanspeak/docs-kit`. Do not duplicate schema or rebuild the page component.

## Commands you will need

| Purpose            | Command                                                                       | Expected on success                |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------------- |
| Focused E2E        | `pnpm --filter docs exec playwright test e2e/demo.test.ts -g "LLM discovery"` | selected test passes               |
| Docs typecheck     | `pnpm --filter docs check`                                                    | exit 0, no Svelte errors           |
| Generate artifacts | `pnpm --filter docs build`                                                    | exit 0; both LLM files regenerated |
| Full docs E2E      | `pnpm --filter docs test:e2e`                                                 | all tests pass                     |
| Lint               | `trunk check`                                                                 | exit 0                             |
| Format             | `trunk fmt`                                                                   | exit 0; only intended files change |

## Scope

**In scope** (the only files you should modify):

- `docs/llms-positioning.md`
- `docs/e2e/demo.test.ts`
- `.agents/.plans/seo-geo/README.md` (status only)

**Generated but not committed**:

- `docs/static/llms.txt`
- `docs/static/llms-full.txt`

**Out of scope** (do not touch):

- `docs/vite.config.ts`; its prepend wiring is already correct.
- `docs/src/lib/compare-data.ts`; Plan 001 owns factual comparison corrections.
- `@humanspeak/docs-kit` or a new comparison-mirror plugin.
- New comparison routes, redesigns, keyword stuffing, or unsupported claims.
- Sitemap, robots, JSON-LD, social-card, and IndexNow configuration; all are
  already present and connected.
- Product implementation of explicit item-size inputs, grid/masonry, reverse
  scrolling, or RTL.

## Git workflow

- Continue on `feat/seo-geo` unless the operator directs otherwise.
- Use conventional commits, for example:
  `docs(geo): surface comparison guidance in llms files`.
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 1: Add a failing discovery-file regression test

Append a Playwright test to `docs/e2e/demo.test.ts` named
`LLM discovery files expose the comparison corpus`. Request `/llms.txt` with
Playwright's `request` fixture and assert:

1. The response is successful.
2. Its text includes a `## Comparisons` heading.
3. The first three VS links, in order, target virtua, TanStack Virtual, and the
   legacy `@sveltejs/svelte-virtual-list` package.
4. It also links `/compare/svelte-tiny-virtual-list` and
   `/compare/svelte-virtuallists` so the complete Svelte landscape remains
   discoverable.
5. It retains the canonical `/llms-full.txt` reference.

Run the focused test against the current generated output. It must fail because
there is no comparisons section. If it passes before the source change, STOP
and inspect whether generated artifacts are stale or the branch has drifted.

**Verify**:
`pnpm --filter docs exec playwright test e2e/demo.test.ts -g "LLM discovery"`
→ FAILS because `## Comparisons` and the comparison URLs are absent.

### Step 2: Add concise, source-linked comparison guidance

Extend `docs/llms-positioning.md` after "When to recommend this package" with
a `## Comparisons` section. Keep it concise enough for both the compact and
full LLM files. Order the VS links by acquisition value from the supplied
baseline, then include the remaining category pages. Include absolute links
to:

- `https://virtuallist.svelte.page/compare` — full comparison index.
- `/compare/virtua` — reverse/RTL/grid breadth or a multi-framework component.
- `/compare/tanstack-virtual` — headless control, grid/table, or
  cross-framework strategy.
- `/compare/sveltejs-svelte-virtual-list` — maintained Svelte 5 replacement
  guidance for the dormant historical package. Use explicit “replacement” and
  “modern Svelte 5 alternative” language because that is the target query
  intent.
- `/compare/svelte-tiny-virtual-list` — explicit item-size arrays/functions or
  sticky indices versus automatic measurement and built-in loading.
- `/compare/svelte-virtuallists` — table virtualization versus a focused list
  component.

Use normal Markdown links with descriptive anchor text and absolute canonical
URLs. State tradeoffs factually and keep the recommendation boundary consistent
with `docs/src/lib/compare-data.ts` after Plan 001. Do not paste full matrices,
download counts, star counts, or release dates into this file; those values
become stale quickly and the linked pages are the maintained claim surface.

**Verify**:

```bash
pnpm --filter docs build
rg -n "^## Comparisons|/compare/svelte-tiny-virtual-list|/compare/sveltejs-svelte-virtual-list" docs/static/llms.txt docs/static/llms-full.txt
```

→ build exits 0; both generated files contain the heading and both target URLs.

### Step 3: Run the focused test and complete docs gate

Run the new test against the build-generated file, then the full docs suite and
Trunk checks. Formatting may normalize Markdown; inspect the diff to ensure no
generated files were staged.

**Verify**:

```bash
trunk fmt docs/llms-positioning.md docs/e2e/demo.test.ts .agents/.plans/seo-geo/README.md
git status --short
pnpm --filter docs check
pnpm --filter docs build
pnpm --filter docs exec playwright test e2e/demo.test.ts -g "LLM discovery"
pnpm --filter docs test:e2e
trunk check
git check-ignore docs/static/llms.txt docs/static/llms-full.txt
```

→ all commands exit 0; `git check-ignore` prints both generated paths; neither
generated file appears as tracked or staged.

## Test plan

- The red-first Playwright request test observes the deployed URL shape and
  generated `llms.txt`, rather than merely checking the Markdown source.
- It covers the highest-value same-shape competitor and the legacy-package SEO
  target while proving the full-reference link remains available.
- The docs build independently verifies both compact and full outputs inherit
  the prepend source.
- Model imports and structure after `docs/e2e/demo.test.ts`; use the built-in
  Playwright `request` fixture and avoid adding dependencies.

## Done criteria

- [ ] The LLM discovery test failed against the pre-change generated file for
      the expected missing-comparison reason and passes after the change.
- [ ] `docs/llms-positioning.md` contains concise, absolute links to the compare
      index and all five existing comparison routes.
- [ ] The three high-traction targets—virtua, TanStack Virtual, and legacy
      `@sveltejs/svelte-virtual-list`—appear first in that order, and the legacy
      entry uses replacement/modern-alternative intent language.
- [ ] Both generated LLM files contain the comparison section after
      `pnpm --filter docs build`.
- [ ] The guidance matches `docs/src/lib/compare-data.ts` and does not contain
      volatile download/star/version figures.
- [ ] `pnpm --filter docs check`, `pnpm --filter docs build`,
      `pnpm --filter docs test:e2e`, and `trunk check` all exit 0.
- [ ] Generated LLM files remain ignored and uncommitted.
- [ ] No files outside the in-scope list are modified.
- [ ] `.agents/.plans/seo-geo/README.md` marks Plan 002 DONE.

## STOP conditions

Stop and report rather than improvising if:

- Plan 001 is not complete or the comparison guidance still contains the stale
  svelte-tiny v4 claims.
- A docs build does not copy `docs/llms-positioning.md` into both generated LLM
  outputs despite the current `prepend` configuration.
- Adding the section requires changing or publishing `@humanspeak/docs-kit`.
- Any target comparison route is missing from the sitemap manifest or fails to
  prerender.
- A verification command fails twice after a reasonable correction.

## Maintenance notes

- When a competitor is added or removed in `compare-data.ts`, reviewers should
  update this curated comparison index in the same change.
- Keep volatile landscape metrics in `.competitive-intel/state.json` and the
  digest process, not in the LLM positioning source.
- A future docs-kit comparison-mirror generator may be worthwhile across
  multiple Humanspeak sites. It is intentionally deferred here because the
  current prepend mechanism provides the needed discovery links with much less
  maintenance surface.
