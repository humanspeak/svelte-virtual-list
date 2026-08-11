# Plan 003: Consume the released docs-kit comparison bundle

> **Executor instructions**: Follow this plan only after Plan 002 is verified,
> pushed to docs-kit `main`, and the GA automation has created a consumable tag.
> Do not use a local path or unpublished commit in the final dependency.
>
> **Revision 2026-08-11**: Docs-kit Plan 002 passed at `cb29390`; GA workflow
> `31496812608` published tag `2026.8.1`. Use that exact tag.
>
> **Drift check**:
> `git diff --stat cac2749..HEAD -- docs/package.json pnpm-lock.yaml docs/vite.config.ts docs/e2e/demo.test.ts`
> Any mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `002-expose-comparisons-to-llms.md`
- **Category**: docs
- **Planned at**: commit `cac2749`, docs-kit tag `2026.8.1`, 2026-08-11

## Why this matters

This repository should provide its existing comparison records once and receive
all machine-readable comparison artifacts from docs-kit. The final build must
serve `/compare/<slug>.md`, advertise those mirrors from `llms.txt`, and include
them in `llms-full.txt`, with high-traction targets ordered first.

## Scope

**In scope**:

- `docs/package.json`
- `pnpm-lock.yaml`
- `docs/vite.config.ts`
- `docs/e2e/demo.test.ts`
- `.agents/.plans/seo-geo/README.md` (status only)

**Out of scope**:

- Manual comparison links in `docs/llms-positioning.md`.
- Generated ignored files under `docs/static/compare` and `docs/static/llms*`.
- Comparison facts in `docs/src/lib/compare-data.ts`; Plan 001 owns those.

## Steps

1. Add a failing Playwright request test proving `/llms.txt` links the three
   prioritized `.md` targets in order and every comparison mirror responds with
   its complete feature/verdict content.
2. Update `@humanspeak/docs-kit` to the GA-created tag and lockfile resolution.
3. Pass `ours`, `competitors`, and priority slugs `virtua`,
   `tanstack-virtual`, `sveltejs-svelte-virtual-list` to the single docs-kit
   comparison bundle option in `llmsPlugin`. Do not duplicate data or links.
4. Build and verify `docs/static/compare/index.md`, all five slug mirrors,
   `.md` discovery links with canonical HTML notes, and comparison inclusion in
   `llms-full.txt`.
5. Run `pnpm --filter docs check`, `pnpm --filter docs build`,
   `pnpm --filter docs test:e2e`, `trunk fmt`, and `trunk check`; all must pass.

## Done criteria

- [ ] Dependency references the GA-created docs-kit tag, not a local path.
- [ ] One `comparisons` configuration supplies all comparison artifacts.
- [ ] `/compare/<slug>.md` exists for all five records and contains the complete
      corresponding feature matrix and verdict.
- [ ] `llms.txt` links `.md` mirrors, notes canonical HTML pages, and prioritizes
      virtua, TanStack, then the legacy Svelte package.
- [ ] `llms-full.txt` includes the comparison corpus.
- [ ] All docs verification commands pass and generated files remain ignored.

## STOP conditions

- The GA tag does not contain Plan 002's verified commit.
- The released public types differ from Plan 002's contract.
- Any solution requires manual link duplication in `llms-positioning.md`.
