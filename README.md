# promises

A dependency-free helper library for batched promise handling with dynamic concurrency control.

## Overview

This library executes large numbers of async tasks with controlled concurrency to prevent rate limiting, resource exhaustion, and overwhelming external services. The concurrency level is automatically calculated from your system's available parallelism and the type of work being done.

Everything is now provided by a single generic `Batch<T>` class. Instead of separate `BatchAll` / `BatchSettle` classes, you choose the failure behavior by calling either `settle()` (fail-fast) or `settleAll()` (resilient).

## `Batch<T>`

Manages task batching with dynamic concurrency control.

### Constructor

```typescript
new Batch<T>(taskType = 'api', options = { debug: false })
```

**Parameters:**
- `taskType` (`'api' | 'db' | 'cpu'`): Type of work (default: `'api'`)
  - `'api'` and `'db'`: use a **4×** parallelism multiplier (I/O-bound)
  - `'cpu'`: uses a **2×** parallelism multiplier (CPU-bound)
- `options` (object):
  - `debug` (boolean): enable debug logging (default: `false`)

### Concurrency Calculation

Batch size is recalculated before each batch is processed:

```
concurrency = os.availableParallelism() × multiplier
```

Recalculating per batch lets the concurrency adapt if `availableParallelism()` reports a different value during a long-running run.

### Properties (read-only)

- `results` (`T[]`): successfully resolved values
- `errors` (`Error[]`): errors collected during processing
- `size` (number): number of tasks still queued
- `concurrency` (number): current calculated batch size
- `debug` (boolean): debug flag status

### Methods

- `add(taskFn: () => Promise<T>)`: queue a task. **Pass a callback that returns a promise, not a live promise** — the task is invoked lazily when its batch runs. Throws `ReferenceError` if `taskFn` is not a function.
- `settle(): Promise<void>`: process all queued tasks in batches using `Promise.all`. If a task in a batch rejects, that batch's error is pushed to `errors` and processing continues with the remaining tasks.
- `settleAll(): Promise<void>`: process all queued tasks in batches using `Promise.allSettled`. Every task lands in `results` (fulfilled) or `errors` (rejected); never aborts a batch.
- `hasErrors(): boolean`: `true` if any errors were collected.
- `cancel(): void`: clear all queued tasks that have not yet been processed.

## Installation

```bash
npm install promises
```

## Importing

```typescript
import { Batch } from 'promises';
```

## Usage

### Resilient processing (`settleAll`)

Collects both successes and failures — no batch is aborted.

```typescript
import { Batch } from 'promises';

const batch = new Batch<Response>('api', { debug: true });

async function getRequest() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  return res.json();
}

for (let i = 0; i < 80; i += 1) {
  batch.add(getRequest);
}

await batch.settleAll();

console.log('Results:', batch.results);
if (batch.hasErrors()) {
  console.error('Errors:', batch.errors);
}
```

### Fail-fast processing (`settle`)

Uses `Promise.all` per batch; a rejection in a batch is recorded in `errors`.

```typescript
import { Batch } from 'promises';

const batch = new Batch<number>('cpu');

batch.add(() => compute(1));
batch.add(() => compute(2));
batch.add(() => compute(3));

await batch.settle();

console.log('Results:', batch.results);
console.log('Errors:', batch.errors);
```

## When to Use Each Method

- **`settle()`**: use `Promise.all` semantics — good when you want a batch to short-circuit on rejection. Errors are still captured in `errors` so the run completes.
- **`settleAll()`**: use `Promise.allSettled` semantics — process every task regardless of failures and inspect `results` and `errors` separately.

## Task Types

Choose the type that matches your workload for optimal concurrency:

- `'api'`: HTTP requests and external API calls (high concurrency, 4×)
- `'db'`: database operations (high concurrency, 4×)
- `'cpu'`: CPU-intensive work like data processing (lower concurrency, 2×)
