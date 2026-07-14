# Plan 001: Lint the test files and enable type-aware lint rules that catch floating promises

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/typed-lint/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat f89fd65..HEAD -- eslint.config.mjs`
> If `eslint.config.mjs` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none in this batch. Cross-batch soft ordering: prefer to run
  AFTER the `perf-parity` batch (001/002) merges — those plans add new test
  files that should get lint coverage, and running afterward triages them once.
- **Category**: dx
- **Planned at**: commit `f89fd65`, 2026-07-14
- **Provenance**: port of svelte-markdown's executed plan
  `streaming-component-hardening/009` (DONE there, verified in that repo's
  shipped `eslint.config.mjs`). All target-config shapes below are inlined —
  do not try to read the other repository.

## Why this matters

Two lint blind spots in a promise-heavy virtualization library:

1. `eslint.config.mjs` puts `'**/*.test.ts'` in the top-level `ignores`, so all
   **31** test/spec files (unit + Playwright) get **zero** static checking —
   the most async-heavy code in the repo (rAF waits, scroll-settle polling,
   ResizeObserver mocks, accidental `.only`, unawaited helpers) ships unlinted.
2. The config uses `ts.configs.recommended` (not `recommendedTypeChecked`) and
   never enables `projectService`/`project`, so no type information reaches any
   rule — `@typescript-eslint/no-floating-promises` and `no-misused-promises`
   are effectively off. Those are exactly the rules that catch a dropped
   `await`/`void` in this component's scroll machinery: `tick().then(...)`
   re-assertion, `Promise.resolve(onLoadMore()).finally(...)`, and the
   `waitForScrollEnd(...).then().finally()` completion chain.

This is real-bug prevention, not cosmetics. Effort M / risk MED because turning
the rules on surfaces a batch of pre-existing violations to triage (the six
known production sites are listed below so none of them surprises you).

## Current state

`eslint.config.mjs` (the only config file in scope), abridged with line markers
at commit `f89fd65`:

```js
export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            /* ... */
            '**/dist',
            '**/*.test.ts' // line 28 ← test files ignored entirely
        ]
    },
    js.configs.recommended,
    ...ts.configs.recommended, // line 32 ← NOT type-checked
    ...svelte.configs['flat/recommended'],
    prettier,
    ...svelte.configs['flat/prettier'],
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname // lines 38-40 ← no projectService/project
            },
            globals: { ...globals.browser, ...globals.node }
        },
        rules: {
            /* stylistic + unused-vars config, lines 46-92 */
        }
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts'], // lines 94-105
        languageOptions: { parserOptions: { parser: ts.parser } }
        /* no svelteConfig, no extraFileExtensions */
    },
    {
        /* shadcn override, lines 106-125 */
    }
]
```

Facts you rely on:

- The repo is a PNPM workspace; **`docs/` has its own `eslint.config.mjs`** and
  is governed by it, not by the root config. Leave docs alone.
- Trunk is the lint/format authority (`.trunk/trunk.yaml`, `eslint@10.4.0` in
  its enabled list). Never run `pnpm lint`, `pnpm run lint:fix`, `npx eslint`,
  or prettier directly (CLAUDE.md).
- Suppression house style is Trunk inline ignores, NOT `eslint-disable` —
  existing exemplar: `src/lib/types.ts:8`
  `/* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */`.
- `typescript-eslint` is v8.x (`package.json`), so `recommendedTypeChecked`,
  `disableTypeChecked`, and `projectService` are all available.
- Root-level config files are TypeScript (`vite.config.ts`,
  `playwright.config.ts`, `svelte.config.js`) — typed linting must not choke on
  them; the target shape below carves them out.

Known production sites the new rules WILL flag (all in
`src/lib/SvelteVirtualList.svelte`; verified by grep at `f89fd65`):

| Line    | Code                                                                | Expected fix                                                                    |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 413     | `tick().then(() => { ... })` in `restoreViewportAnchor`             | fire-and-forget re-assert; `void tick().then(...)` + one-line rationale comment |
| 439     | `Promise.resolve(onLoadMore()).finally(...)` inside `$effect`       | `$effect` can't await; `void` + rationale                                       |
| 847     | `tick().then(() => { ... })` inside the `scroll()` promise executor | `void` + rationale (resolution flows through the inner `scroll()` call)         |
| 858     | `scroll({...}).then(resolve, reject)`                               | result of `.then` unhandled; `void` it                                          |
| 947–954 | `waitForScrollEnd(...).then(...).finally(...)`                      | the `.finally()` result is unhandled; `void` the chain + rationale              |

If line numbers have shifted (e.g. the perf-parity batch landed), locate the
same expressions by content — the table is the contract, not the line numbers.

Target config shape (this is the shape that shipped in the exemplar repo,
adapted to this repo — produce this, adjusted to what triage genuinely
requires):

```js
// 1. ignores: DELETE the '**/*.test.ts' entry. Everything else stays.

// 2. Preset swap:
...ts.configs.recommendedTypeChecked,   // was: ts.configs.recommended

// 3. Main languageOptions block gains:
parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname
}

// 4. Main rules block gains (alongside the existing rules):
'@typescript-eslint/await-thenable': ['error'],
'@typescript-eslint/no-floating-promises': ['error'],
'@typescript-eslint/no-misused-promises': ['error'],
// Any recommendedTypeChecked rule you turn 'off' must be listed in your
// report with a one-line rationale and its violation count. The exemplar
// repo ended up disabling: no-unnecessary-type-assertion, no-unsafe-argument,
// no-unsafe-assignment, no-unsafe-call, no-unsafe-member-access,
// no-unsafe-return, require-await. Disable ONLY what triage actually forces.

// 5. New blocks, after the main block, to keep typed linting from choking on
//    plain JS and root-level TS config files:
{
    files: ['**/*.{js,mjs,cjs}'],
    ...ts.configs.disableTypeChecked
},
{
    files: ['*.ts'],                    // root-level configs only (vite/playwright)
    ...ts.configs.disableTypeChecked
},

// 6. The svelte override block gains the parser wiring typed linting needs:
{
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
        parserOptions: {
            extraFileExtensions: ['.svelte'],
            parser: ts.parser,
            svelteConfig                 // import svelteConfig from './svelte.config.js'
        }
    },
    rules: { /* existing svelte rules stay */ }
},

// 7. New test override (replaces the blanket ignore):
{
    files: ['**/*.test.ts'],
    rules: {
        camelcase: 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
    }
}
```

## Commands you will need

| Purpose       | Command                    | Expected on success |
| ------------- | -------------------------- | ------------------- |
| Install       | `pnpm install`             | exit 0              |
| Lint changed  | `trunk fmt && trunk check` | exit 0              |
| Lint one file | `trunk check <path>`       | exit 0              |
| Lint all      | `trunk check --all`        | exit 0              |
| Typecheck     | `pnpm run check`           | exit 0, 0 errors    |
| Unit tests    | `pnpm run test:only`       | all pass            |

Plain `trunk check` only inspects files changed relative to upstream — that
covers new/untracked scratch files from Step 3. Because this plan turns on
repo-wide rules, also run `trunk check --all` once before declaring done.

## Scope

**In scope** (the only files you should modify):

- `eslint.config.mjs` — the config changes above.
- Source and test files **only** to fix violations the newly-enabled rules
  surface — minimal, mechanical fixes (add `await`, `void` + rationale,
  restore a spy). `src/lib/SvelteVirtualList.svelte` is expected per the table.

**Out of scope** (do NOT touch):

- `docs/**` — separate workspace with its own eslint config.
- `tsconfig.json` compile behavior for the build (a lint-only include tweak is
  acceptable if `projectService` demands it; changing build output is not).
- `.trunk/trunk.yaml` — Trunk's linter roster is not this plan's business.
- Prettier config, `package.json` scripts.
- Rewriting tests beyond what a rule violation mechanically requires.
- The behavior of any promise chain: fixes annotate or await, they do not
  reorder or restructure the async logic.

## Git workflow

- Conventional commits; two commits preferred:
  `chore(lint): lint test files; enable type-aware promise rules` (config) and
  `fix(lint): triage violations surfaced by typed linting` (fixes).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

(Tooling plan with no runtime surface — no red-first unit test; Step 3 is the
proof-of-activation guard that plays that role. See Test plan.)

### Step 1: Lint test files with a sensible override

In `eslint.config.mjs`: delete `'**/*.test.ts'` from the top-level `ignores`
(line 28) and add the test override block (shape 7 above) at the end of the
config array, before the shadcn block or after it — match the existing array's
ordering style. Do NOT enable typed linting yet; keep this step's diff to the
ignore + override only, so violations from THIS step are attributable to
untyped rules on test files.

Triage what surfaces: fix violations minimally, or relax a clearly
test-inappropriate rule inside the override block (record each relaxation +
count for your report).

**Verify**: `trunk check src/lib/SvelteVirtualList.test.ts` reports (or passes)
instead of skipping — confirm test files are actually inspected by introducing
a temporary `var x = 1` in one test file and seeing `no-var` flag it, then
reverting. Then `trunk fmt && trunk check` → exit 0.

### Step 2: Enable type-aware linting for the promise rules

Apply shapes 2–6 from the target config: preset swap to
`recommendedTypeChecked`, `projectService: true`, the three promise rules as
errors, the `disableTypeChecked` carve-outs, and the svelte parser wiring
(including the `import svelteConfig from './svelte.config.js'` import at the
top of the file).

Triage the surfaced violations:

- Production sites: the five expected fixes in the table above. Prefer `await`
  where the surrounding function is async and ordering allows; otherwise
  `void <expr>` with a one-line comment saying why fire-and-forget is correct
  there. Never restructure the chain.
- Tests: mechanical fixes (add `await`, `void`) only.
- A rule that produces a large, low-value violation set may be set `'off'` in
  the config — record rule, rationale, and count in your report. Never use
  `eslint-disable` comments; a genuinely needed one-off suppression uses the
  house style `// trunk-ignore(eslint/<rule>)` with a reason.

**Verify**: `trunk fmt && trunk check` → exit 0, and `pnpm run check` → exit 0.

### Step 3: Prove a floating promise is now caught (guard)

Create three scratch files, each containing a bare `Promise.resolve()`
statement (no `await`/`void`):

1. a plain `.ts` under `src/lib/` (e.g. `src/lib/scratch-lint-proof.ts`)
2. a `.test.ts` under `src/lib/` (e.g. `src/lib/scratch-lint-proof.test.ts`)
3. a `.svelte` under `src/lib/` with the statement inside `<script lang="ts">`

Run `trunk check <path>` on each and confirm each reports
`@typescript-eslint/no-floating-promises`. All three matter: each reaches type
info through a different parser path (plain TS, test override, svelte parser)
and any one can be silently inactive. Record the three outputs verbatim in
your report, then DELETE all three scratch files (never commit them).

**Verify**: all three scratch runs flag `no-floating-promises`; after deletion,
`trunk fmt && trunk check` → exit 0 and `git status` shows no scratch files.

### Step 4: Full gate

**Verify**, in order:

1. `pnpm run check` → exit 0
2. `pnpm run test:only` → all pass
3. `trunk check --all` → exit 0
4. `git status` → only in-scope files modified

## Test plan

- No new unit tests — tooling-only plan with no runtime surface (red-first
  exemption). The activation guard is Step 3: the rule provably fires through
  all three parser paths, recorded verbatim.
- The existing suite (`pnpm run test:only`) re-run after violation fixes proves
  the mechanical `await`/`void` edits changed no behavior.

## Done criteria

ALL must hold:

- [ ] `grep -n "\*\*/\*.test.ts" eslint.config.mjs` shows the pattern ONLY in a
      `files:` override, never in `ignores`.
- [ ] `grep -n "recommendedTypeChecked" eslint.config.mjs` returns a match;
      `grep -n "projectService" eslint.config.mjs` returns a match.
- [ ] `no-floating-promises` provably fired in all three Step-3 scratch paths
      (verbatim outputs in the report), scratch files deleted.
- [ ] `trunk fmt && trunk check` exits 0 AND `trunk check --all` exits 0 — with
      no `eslint-disable` comments introduced
      (`grep -rn "eslint-disable" src eslint.config.mjs` shows nothing new) and
      no rule switched off purely to force green without a reported rationale.
- [ ] Every `recommendedTypeChecked` rule set `'off'` in the config is listed
      in the report with a one-line rationale and its violation count.
- [ ] `pnpm run check` exits 0; `pnpm run test:only` exits 0.
- [ ] `docs/` untouched (`git status` shows nothing under `docs/`).
- [ ] `.agents/.plans/typed-lint/README.md` status row updated (unless the
      reviewer maintains the index).

## STOP conditions

Stop and report back (do not improvise) if:

- `eslint.config.mjs` no longer matches the "Current state" excerpt (drift).
- `projectService` cannot resolve `.svelte`/`.svelte.ts` files after the
  svelte parser wiring (shape 6), or full-repo lint time becomes unacceptable
  (exemplar data point: 574 files in ~39s was acceptable there) — report the
  exact error; Step 1 alone (untyped test-file linting) is still shippable and
  you should say so in the report.
- Typed linting starts flagging files under `docs/` — the boundary assumption
  is wrong; report rather than adding ignores.
- A surfaced violation reveals a REAL floating-promise bug in `src/lib/**`
  whose fix is not mechanical (i.e. behavior actually changes) — flag it
  prominently as a correctness find and STOP for review rather than fixing
  behavior under a lint plan.
- Fixing a violation seems to require changing test assertions or restructuring
  a promise chain — out of scope.

## Maintenance notes

- Once typed linting is on, `projectService` follows tsconfig membership — if a
  new source directory is added outside the tsconfig's include set, its files
  silently lose type-aware coverage. Reviewers of future PRs adding top-level
  dirs should check this.
- Reviewer checklist for THIS change: every `void`-marked promise has a
  one-line rationale and is genuinely safe to not await; no rule was
  blanket-disabled to force green; the `*.ts` root carve-out doesn't
  accidentally match `src/**` files (it must be root-relative, no `**/`).
- The in-flight `perf-parity` batch adds `src/lib/utils/virtualList.perf-budget.test.ts`
  and two e2e/fixture files; once both land, those get lint coverage from this
  change automatically — expect possible one-time triage there if this plan
  runs first.
- svelte-markdown's executed 009 is the reference implementation if a future
  maintainer wants to compare outcomes (same config skeleton, same rule set).
