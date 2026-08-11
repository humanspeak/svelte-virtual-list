# Guard report — 003 consume comparison bundle

**Recommendation: PASS** — the released shared bundle is integrated, complete
comparison mirrors are generated, and every consumer gate passes.
**Reviewed at** `7fbbd18` · 2026-08-11 09:52 · **Plan planned at** `61bafea`
with docs-kit tag `2026.8.1`
**Integrated** — committed on `feat/seo-geo`; no PR opened so the operator can
eye test first.

## Done criteria

| Criterion                              | Result | Evidence                                                                                                                 |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Released dependency                    | met    | `docs/package.json` pins `github:humanspeak/docs-kit#2026.8.1`; lockfile resolves verified `cb29390...`.                 |
| Pnpm build approval                    | met    | `pnpm-workspace.yaml` permits exactly the `cb29390...` tarball key with `true`; old key is absent.                       |
| Single comparison input                | met    | `docs/vite.config.ts` passes `ours`, `competitors`, and priority once through `llmsPlugin.comparisons`.                  |
| Five per-slug mirrors plus index       | met    | Fresh build produced 6 Markdown files under ignored `docs/static/compare/`.                                              |
| Markdown discovery and canonical notes | met    | `llms.txt` exact-line E2E assertions pass for every competitor; priority is virtua, TanStack, then legacy Svelte.        |
| Complete mirror content                | met    | E2E fetches all five mirrors and asserts every feature name and verdict from `compare-data.ts`.                          |
| Full-reference inclusion               | met    | E2E asserts every competitor verdict in `llms-full.txt`; guard found the comparison boundary and priority-page headings. |
| Generated outputs ignored              | met    | `git check-ignore` succeeds for comparison and both LLM artifacts; worktree is clean.                                    |
| Docs check                             | met    | `pnpm --filter docs check`: 0 errors and 6 pre-existing warnings.                                                        |
| Docs build                             | met    | `pnpm --filter docs build`: exit 0.                                                                                      |
| Docs E2E                               | met    | `pnpm --filter docs test:e2e`: 5 passed.                                                                                 |
| Trunk                                  | met    | `trunk check`: no issues across 18 branch-modified files.                                                                |

## Spirit

The consumer now supplies comparison facts once and receives all GEO artifacts
from docs-kit. Answer engines discover citation-friendly `.md` resources while
the same entries preserve canonical HTML destinations for humans. The most
valuable traction targets lead the discovery order without duplicating a manual
list in `llms-positioning.md`.

## Scope & conduct

- In-scope only? Yes, after two documented plan amendments for required pnpm
  approval and generated-output ignore files.
- STOP conditions respected? Yes; the executor stopped at each missing scope
  boundary instead of retaining unauthorized edits.
- Plan amendments: `pnpm-workspace.yaml` and `docs/.gitignore` added with exact,
  evidence-backed requirements.

## Residual risk / follow-ups

- Existing six Svelte warnings and Vite native-loader warnings are pre-existing
  and outside this SEO/GEO batch.
- Competitor facts still require periodic competitive-intelligence refreshes;
  generation and discovery are now automatic.
