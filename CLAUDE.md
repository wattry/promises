# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# IMPORTANT
 - NEVER read files in `node_modules/**/*`
 - `package.json` is the source of truth for how the project works

## Project Overview

`@wattry/promises` — a dependency-free TypeScript library that runs large numbers of async tasks with controlled concurrency (to avoid rate limiting / resource exhaustion). Concurrency is derived at runtime from system parallelism and the kind of work being done.

The entire public API is a single generic `Batch<T>` class in `src/index.ts`. Earlier `Batch` / `BatchAll` / `BatchSettle` subclasses were collapsed into one class; failure behavior is now chosen per call (`settle()` vs `settleAll()`), not by class.

## Commands

```bash
pnpm build          # clean + tsc via tsconfig.build.json -> dist/
pnpm test           # vitest (passWithNoTests)
pnpm test:watch     # vitest watch
pnpm test:ci        # vitest with coverage + junit reporter
pnpm lint           # eslint src/**/*.ts (config in eslint.config.ts)
pnpm lint:fix       # eslint --fix
pnpm typecheck      # tsc --noEmit against tsconfig.json
pnpm dev            # tsx watch src/index.ts
pnpm build:pack     # build + pnpm pack (verify the publishable tarball)
```

Run a single test file / pattern:

```bash
pnpm vitest run <path-or-pattern>          # e.g. pnpm vitest run batch.settle
```

Tests are not yet written. Vitest only discovers them under `__tests__/**` or `test/**` (`*.{test,spec}.{ts,js}`) — see `vitest.config.ts` lineage. Node 24 + pnpm 11 are the expected toolchain (`devEngines` in `package.json`).

## Architecture

### Single class: `Batch<T>` (`src/index.ts`)

- Constructor takes `taskType: 'api' | 'db' | 'cpu'` (default `'api'`) and `{ debug }`.
  - `'api'` / `'db'` → **4×** multiplier (I/O-bound); `'cpu'` → **2×** (CPU-bound).
- **Concurrency** = `os.availableParallelism() * multiplier`, recomputed before *every* batch in `#setConcurrency()` (called from `#next()`). There is no memory-usage term — recalculating per batch lets concurrency adapt mid-run.
- **Lazy tasks**: `add(taskFn)` queues a `() => Promise<T>` callback (throws `ReferenceError` if not a function). Callbacks are invoked only when their batch runs, so nothing starts eagerly.
- **`#next()`** splices the next `concurrency`-sized slice off the queue and reports whether more remain.
- **Two drain strategies**, both recursive until the queue empties:
  - `settle()` — `Promise.all` per batch; a rejection is caught and pushed to `#errors`, then processing continues.
  - `settleAll()` — `Promise.allSettled` per batch; each result lands in `results` (fulfilled) or `errors` (rejected); never aborts.
- State exposed read-only via getters: `results`, `errors`, `size` (queued count), `concurrency`, `debug`. Plus `hasErrors()` and `cancel()` (clears the unprocessed queue).

### Build & packaging

- ES modules (`"type": "module"`). `tsconfig.json` extends `@wattry/tsconfig/base`; `tsconfig.build.json` narrows to `src` → `dist/`.
- `.ts.config.json` is the `@wattry/tsconfig` snapshot manifest (it regenerates `eslint.config.ts` / `vitest.config.ts` from upstream); treat those generated configs as managed by that tool.
- Releases run through **release-please** (`release-please-config.json`, `.release-please-manifest.json`) and GitHub Actions in `.github/workflows/` (`pr`, `publish`, `release`). Conventional Commits drive versioning.

### Known discrepancy (verify before publishing)

The root `index.js` still re-exports the deleted `./src/batch.js`, `batch-all.js`, `batch-all-settled.js`, and `package.json` `main`/`exports` point at `./index.js` while the build actually emits to `dist/`. The published entrypoint is currently broken and the `exports` map does not reference `dist`. Reconcile `package.json` `main`/`types`/`exports`/`files` with the real build output before relying on a publish.
