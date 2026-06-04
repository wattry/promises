# CLAUDE.md

# IMPORTANT
 - NEVER read files in the `node_modules/**/*`
 - project.json is the source of truth for how the project works

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A dependency-free promise batching library that manages concurrent promise execution with dynamic concurrency control based on system resources (CPU cores × multiplier × memory usage ratio).

- **API/DB tasks** use a 4x multiplier (I/O-bound)
- **CPU tasks** use a 2x multiplier (CPU-bound)

## Commands

No build step required — pure ES modules. No tests or lint configured yet.

```bash
# Run the example
node example/api.js

# Install dependencies (none currently, but for development)
pnpm install
```

## Architecture

### Class Hierarchy

```
Batch (src/batch.js)           — base class; concurrency calc, queue management
├── BatchAll (src/batch-all.js)           — fail-fast via Promise.all()
└── BatchSettle (src/batch-all-settled.js) — resilient via Promise.allSettled()
```

All three are re-exported from `index.js`.

### Key Design

- `Batch` calculates concurrency in the constructor using `os.cpus()` and `os.freemem()`/`os.totalmem()`.
- `add(promise)` queues promises; `done()` processes them in batch-sized chunks via recursion.
- `BatchSettle.done()` normalizes results: extracts `.value` from fulfilled and `.reason` from rejected entries.

### Module Format

Package uses `"type": "module"` (ES modules). TypeScript definitions live in `types/` and mirror the `src/` structure.
