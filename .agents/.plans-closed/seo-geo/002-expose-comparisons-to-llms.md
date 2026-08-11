# Plan 002: Generate comparison Markdown and LLM discovery in docs-kit

> **Executor instructions**: Implement this plan in the clean docs-kit
> worktree supplied by the dispatcher. Run every verification command. Do not
> modify the dirty primary docs-kit checkout, the consumer repository, plan
> files, or git metadata. Stop rather than improvising across those boundaries.
>
> **Revision 2026-08-11**: The operator rejected a repo-local curated link list.
> Comparison mirrors and LLM discovery must be reusable docs-kit build output.
>
> **Drift check**: `git diff --stat 16556e6..HEAD -- src/lib/vite src/lib/types/compare.ts package.json`
> Any pre-existing diff in these paths is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `001-refresh-svelte-tiny-comparison.md`
- **Category**: direction
- **Planned at**: docs-kit commit `16556e6`, 2026-08-11

## Why this matters

Every docs-kit consumer with comparison data should receive machine-readable VS
content without maintaining a second Markdown link list. One pre-build bundle
must turn the existing `ComparisonOurs` and `Competitor[]` records into a
comparison index mirror, per-competitor `.md` mirrors, `llms.txt` discovery
links that target those mirrors, and comparison content in `llms-full.txt`.
Human links remain canonical HTML URLs.

## Current state

- `src/lib/types/compare.ts` defines the shared `ComparisonOurs`, `Competitor`,
  and feature shapes used by the rendered VS pages.
- `src/lib/vite/llms.ts` builds `static/llms.txt` from documentation and example
  mirrors during `buildStart`, but knows nothing about comparisons.
- `src/lib/vite/llms-full.ts` concatenates only `static/docs/*.md`.
- `src/lib/vite/index.ts` exports all public Vite plugins and option types.
- There is no test suite. Add focused Node tests for pure output generation and
  a package test script; do not introduce a testing dependency.

## Required public design

Extend `llmsPlugin` with one optional `comparisons` configuration object:

```ts
comparisons: {
    ours: ComparisonOurs
    competitors: Competitor[]
    priority?: string[]
    outputDir?: string // default static/compare
}
```

This is the single consumer input for the comparison pre-build bundle.
`priority` is an ordered list of competitor slugs; named slugs come first and
all remaining competitors retain source order. Reject duplicate or unknown
priority slugs with a clear `[docs-kit:llms]` error.

At `buildStart`, before rendering the LLM index, generate:

- `static/compare/index.md`
- `static/compare/<competitor.slug>.md` for every competitor
- a `## Comparisons` section in `static/llms.txt`, ordered by `priority`, whose
  Markdown link targets `${siteUrl}/compare/<slug>.md` and whose note after the
  llmstxt.org `:` separator is `${siteUrl}/compare/<slug>`.

Each per-competitor mirror must be self-contained and faithfully serialize the
existing record: source/canonical comment, H1, tagline, overview, metadata and
source links, complete feature table, both sides' strengths and limitations,
verdict, and keywords. Escape Markdown table pipes and normalize newlines.
Never inject download/star/version numbers that are absent from the source
record.

Extend `llmsFullPlugin` with an optional `comparisonMirrorsDir` (default
`static/compare`). When that directory exists, append its index and page
mirrors after docs with a clear comparison boundary. Existing consumers with no
comparison directory must produce byte-for-byte equivalent output.

## Scope

**In scope in the clean docs-kit worktree**:

- `src/lib/vite/llms.ts`
- `src/lib/vite/llms-full.ts`
- `src/lib/vite/compare-mirrors.ts` (create if separation improves clarity)
- `src/lib/vite/index.ts`
- focused `*.test.ts` files beside these modules
- `package.json` only to add a dependency-free test command

**Out of scope**:

- Rendered Svelte comparison components or their public props.
- Consumer repositories and their comparison data.
- Sitemap, social cards, IndexNow, and human route behavior.
- Publishing/version automation, which the guard handles after verification.

## Steps

1. Add red tests for comparison ordering, `.md` link targets with canonical
   HTML notes, complete mirror serialization/escaping, unknown priority errors,
   llms-full inclusion, and unchanged no-comparison behavior. Run them and
   confirm the new behavior fails because it is absent.
2. Implement a pure comparison mirror builder and filesystem writer. Ensure
   stale `<slug>.md` files are removed when competitors disappear, without
   deleting unrelated directories.
3. Add the optional `comparisons` bundle to `llmsPlugin`; generate mirrors
   before building the discovery index and watch relevant configured inputs in
   dev where applicable.
4. Teach `llmsFullPlugin` to include generated comparison mirrors when present.
5. Export any new public types/helpers needed by consumers and document the
   configuration in the existing module comments.
6. Run the full verification gate.

## Verification and done criteria

- [ ] `pnpm test` exits 0 with focused tests proving every required behavior.
- [ ] `pnpm check` exits 0 with no errors.
- [ ] `pnpm build` exits 0 and packages the new public types.
- [ ] `trunk fmt` and `trunk check` exit 0.
- [ ] A fixture invocation produces `compare/index.md`, one file per slug,
      `.md` targets plus canonical HTML notes in `llms.txt`, and comparison
      bodies in `llms-full.txt` from the single `comparisons` input.
- [ ] Omitting `comparisons` preserves existing llms output and behavior.
- [ ] Only in-scope docs-kit files change.

## STOP conditions

- The clean worktree contains pre-existing in-scope changes.
- Vite lifecycle ordering makes same-plugin generation unreadable in the same
  `buildStart`; report the concrete behavior instead of adding manual consumer
  ordering.
- The design requires a breaking change to existing options or output.
- Verification fails twice after a reasonable correction.

## Maintenance notes

Comparison records remain the single factual source. Consumers should update
their data after competitor releases; docs-kit owns deterministic serialization
and discovery. Review path validation carefully so slugs cannot escape the
configured output directory.
