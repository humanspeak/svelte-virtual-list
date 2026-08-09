# Plan 005: Make the docs Playwright smoke test exercise a real server

> **Executor instructions**: Run each verification and update the sibling README.
>
> **Drift check (run first)**:
> `git diff --stat 0e343e5..HEAD -- playwright.config.ts tests/docs-visit.spec.ts docs/playwright.config.ts docs/e2e`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0e343e5`, 2026-08-09

## Why this matters

Root Playwright starts the package preview on port 4173, while the alleged docs smoke
test visits 5175 and catches every failure as a skip. CI can therefore report success
without checking the target. The test must belong to, and use, the server that owns it.

## Current state

- `playwright.config.ts:16-26` starts root preview at `http://localhost:4173`.
- `tests/docs-visit.spec.ts:3-12` hard-codes 5175 and turns failures into `test.skip`.
- `docs/playwright.config.ts` and `docs/e2e/` are the alternative home if this truly
  verifies the docs application.

## Scope and decision

Determine whether the selectors in `docs-visit.spec.ts` exist in the root test app or
the docs app. Move the test to the owning Playwright project and use that project's
configured `baseURL`. Do not start a second hidden server from the test. Never catch an
assertion/navigation failure merely to skip it.

In scope: drift-check paths. Out of scope: changing production components or adding
general visual-regression infrastructure.

## Steps

1. Run the current test in its current project and record that it skips or targets the
   wrong server. **Verify**: `pnpm exec playwright test tests/docs-visit.spec.ts --project=chromium`
   does not execute all assertions against a matching server.
2. Move or rewrite the test to use the owning config's `baseURL`; remove the catch/skip.
   If moved into `docs/e2e`, update only the minimum scripts/config needed to include it.
   **Verify**: the owning package's focused Chromium command passes and reports one
   executed test, zero skipped.
3. Prove failures are real by temporarily using an impossible selector, observe a
   failed test, then revert that temporary change.
4. Run `pnpm run check`, the root focused suite as applicable, the docs focused suite
   as applicable, and `trunk check` after `trunk fmt`.

## Done criteria

- [ ] No smoke test hard-codes port 5175.
- [ ] The test executes, rather than skips, in CI-compatible configuration.
- [ ] A broken assertion fails the test.
- [ ] All scoped gates pass and unrelated tests/config remain untouched.

## STOP conditions

- Neither application contains the asserted demo/selectors.
- Correct ownership requires deploying or calling the public website.
- Local Playwright cannot start the owning server using existing scripts.

## Git workflow and maintenance

Use branch `test/real-docs-smoke`, commit `test(e2e): run docs smoke against its server`.
Do not make the smoke test network-dependent.
