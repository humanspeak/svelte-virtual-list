# Plan 001: Make the svelte-tiny-virtual-list comparison accurate for v4

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> the `README.md` that sits alongside this plan file
> (`.agents/.plans/seo-geo/README.md`) unless a reviewer told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat 2dd2a8c..HEAD -- docs/src/lib/compare-data.ts docs/e2e/demo.test.ts`
> If either in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `2dd2a8c`, 2026-08-11

## Why this matters

`svelte-tiny-virtual-list` 4.0.0 shipped on 2026-08-11 with a Svelte 5 snippet
API. The existing comparison says the package lacks snippets and repeatedly
describes its API as slot-based. Those claims are now false on the closest
same-shape competitor page, weakening user trust and the factual grounding
search engines and answer engines derive from the page.

This plan updates only the claims invalidated by v4. It preserves the honest
differentiators that remain: automatic runtime measurement and built-in
infinite-loading behavior versus explicit size inputs and caller-composed
loading patterns.

## Current state

- `docs/src/lib/compare-data.ts` is the single data source for `/compare`, all
  five comparison pages, sitemap entries, social cards, and comparison JSON-LD.
- `docs/e2e/demo.test.ts` is the existing Playwright smoke suite for rendered
  docs-site behavior.
- `docs/src/lib/compare-data.ts:128-170` currently includes these stale v4
  claims:

    ```ts
    approach: ('Slot-based component with explicit size inputs',
        // ...
        { name: 'Svelte 5 snippets', us: true, them: false },
        // ...
        'Header and footer slots are useful for wrappers and loaders',
        // ...
        'API predates Svelte 5 snippets',
        // ...
        'Choose svelte-tiny-virtual-list for explicit size arrays/functions, sticky indices, or its older slot-style API. ...')
    ```

- `docs/src/lib/compare-data.ts:133` also calls its header and footer extension
  points "slots". Use "snippets" for the v4 API.
- The comparison component comes from `@humanspeak/docs-kit`; do not fork or
  modify it. Its feature table renders boolean `true` as `yes` and `false` as
  `no`, and its limitations section renders `consThem` verbatim.
- The competitive-intelligence baseline is stored in
  `.competitive-intel/state.json`; it is evidence for this work, not an input
  to render at runtime.

## Commands you will need

| Purpose        | Command                                                                     | Expected on success                 |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| Docs typecheck | `pnpm --filter docs check`                                                  | exit 0, no Svelte errors            |
| Focused E2E    | `pnpm --filter docs exec playwright test e2e/demo.test.ts -g "svelte-tiny"` | selected test passes                |
| Docs build     | `pnpm --filter docs build`                                                  | exit 0; comparison route prerenders |
| Full docs E2E  | `pnpm --filter docs test:e2e`                                               | all tests pass                      |
| Lint           | `trunk check`                                                               | exit 0                              |
| Format         | `trunk fmt`                                                                 | exit 0; only intended files change  |

## Scope

**In scope** (the only files you should modify):

- `docs/src/lib/compare-data.ts`
- `docs/e2e/demo.test.ts`
- `.agents/.plans/seo-geo/README.md` (status only)

**Out of scope** (do not touch):

- The public library API or `src/lib/**`.
- Adding an explicit item-size array/function API; that is a product decision,
  not an SEO correction.
- Grid, masonry, reverse scrolling, or RTL support; these are documented
  non-goals or separate product work.
- Download counts, stars, or version badges on the page; the comparison model
  currently does not render those values.
- `docs/node_modules/@humanspeak/docs-kit/**`; it is installed dependency code.
- Other competitor records unless a new factual error is independently proven.

## Git workflow

- Continue on `feat/seo-geo` unless the operator directs otherwise.
- Use conventional commits matching repository history, for example:
  `docs(compare): refresh svelte-tiny v4 claims`.
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 1: Add a failing rendered-page regression test

Append a Playwright test to `docs/e2e/demo.test.ts` named
`svelte-tiny comparison reflects its Svelte 5 snippet API`. Navigate to
`/compare/svelte-tiny-virtual-list` and assert all of the following from the
rendered page:

1. The `Svelte 5 snippets` table row reports `yes` for both packages. Scope the
   assertion to that row so another `yes` cannot satisfy it.
2. The page does not contain `API predates Svelte 5 snippets`.
3. The page does not contain `older slot-style API`.
4. The page still states the meaningful differentiator `Variable sizes from
array/function`.

Run the focused test against the current content. It must fail because the
competitor cell is `no` and both stale phrases are present. If it passes before
the data change, the test is not observing the intended route: STOP and report.

**Verify**:
`pnpm --filter docs exec playwright test e2e/demo.test.ts -g "svelte-tiny"`
→ FAILS on the snippet/stale-copy assertions for the expected content mismatch.

### Step 2: Refresh only the claims changed by v4

Edit the `svelte-tiny-virtual-list` object in
`docs/src/lib/compare-data.ts`. Make these semantic changes:

- Describe the current approach as a Svelte 5 snippet-based component with
  explicit size inputs.
- Change the `Svelte 5 snippets` competitor feature value from `false` to
  `true`.
- Replace references to header/footer slots with header/footer snippets.
- Remove or rewrite `API predates Svelte 5 snippets`; retain a truthful
  limitation about caller-supplied size data only if it does not duplicate the
  following `Variable sizes ...` limitation.
- Remove `older slot-style API` from the verdict. Keep the choice framing around
  explicit size arrays/functions and sticky indices versus automatic dynamic
  measurement, reactive orientation switching, SSR documentation, and built-in
  infinite loading.
- Keep the package/repository URLs, keywords, and unrelated feature cells
  unchanged.

Use careful wording such as "Svelte 5 snippet API with explicit size inputs";
do not claim that snippets are unique to this project after v4.

**Verify**:
`pnpm --filter docs exec playwright test e2e/demo.test.ts -g "svelte-tiny"`
→ the new test PASSES.

### Step 3: Format and run the full docs gate

Run Trunk formatting, confirm it did not modify out-of-scope files, then run
the docs typecheck, build, complete docs E2E suite, and Trunk checks.

**Verify**:

```bash
trunk fmt docs/src/lib/compare-data.ts docs/e2e/demo.test.ts .agents/.plans/seo-geo/README.md
git status --short
pnpm --filter docs check
pnpm --filter docs build
pnpm --filter docs test:e2e
trunk check
```

→ every command exits 0; `git status --short` lists only the two implementation
files plus the plan-index status update.

## Test plan

- The red-first Playwright test proves that the public, prerendered comparison
  page—not just its source object—reports snippet support accurately.
- It also prohibits the two exact stale claims identified by the 2026-08-11
  competitive-intelligence run while retaining the explicit-size
  differentiator.
- Model the test structure after the existing route assertions in
  `docs/e2e/demo.test.ts:8-31`.
- The full docs build checks prerendering, generated sitemap/social assets, and
  the comparison route; the complete docs E2E suite guards unrelated routes.

## Done criteria

- [ ] The new Playwright test failed against the pre-change comparison for the
      expected reason and passes after the content update.
- [ ] `/compare/svelte-tiny-virtual-list` shows `yes` for both packages in the
      `Svelte 5 snippets` row.
- [ ] `rg -n "API predates Svelte 5 snippets|older slot-style API|Header and footer slots|Slot-based component" docs/src/lib/compare-data.ts`
      returns no matches.
- [ ] The page still explains explicit sizes versus automatic measurement and
      caller-composed versus built-in infinite loading.
- [ ] `pnpm --filter docs check`, `pnpm --filter docs build`,
      `pnpm --filter docs test:e2e`, and `trunk check` all exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `.agents/.plans/seo-geo/README.md` marks Plan 001 DONE.

## STOP conditions

Stop and report rather than improvising if:

- The installed or linked v4 documentation does not actually expose snippets
  for item, header, and footer rendering.
- The comparison object or rendered table no longer matches the excerpts above.
- The rendered feature row cannot be selected reliably without modifying
  `@humanspeak/docs-kit`.
- Correcting the copy appears to require a public library API change.
- A verification command fails twice after a reasonable correction.

## Maintenance notes

- Future competitive-intelligence runs should treat
  `docs/src/lib/compare-data.ts` as the claim source and flag version-triggered
  drift before deployment.
- Reviewers should look for honest differentiation, not wording that merely
  moves the outdated snippet claim elsewhere.
- An explicit-size fast path is deliberately deferred; assess it separately on
  API complexity, performance evidence, and demand.
