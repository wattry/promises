# promises
A helper library to improve batched promise handling

## Overview

This library provides utilities for executing large numbers of promises with controlled concurrency to prevent rate limiting, resource exhaustion, and overwhelming external services. The concurrency level is automatically calculated based on your system's available CPU cores and memory.

## Classes

### `Batch`

Base class that manages promise batching with dynamic concurrency control.

**Constructor:**
```javascript
new Batch(taskType = 'api', options = {})
```

**Parameters:**
- `taskType` (string): Type of task - `'api'`, `'db'`, or `'cpu'` (default: `'api'`)
  - `'api'` and `'db'`: Uses 4x CPU cores multiplier for I/O-bound tasks
  - `'cpu'`: Uses 2x CPU cores multiplier for CPU-bound tasks
- `options` (object):
  - `debug` (boolean): Enable debug logging (default: `false`)

**Properties:**
- `results` (array): Read-only array of processed results
- `promises` (array): Read-only array of pending promises
- `concurrency` (number): Read-only calculated concurrency level
- `debug` (boolean): Read-only debug flag status

**Methods:**
- `add(promise)`: Add a promise to the batch queue
  - `promise` (Promise): An async promise to be processed

**Concurrency Calculation:**
The concurrency level is automatically calculated as:
```
concurrency = CPU_cores × multiplier × memory_usage_ratio
```

---

### `BatchAll`

Extends `Batch` to provide fail-fast promise execution using `Promise.all()`. If any promise rejects, the entire batch fails immediately.

**Constructor:**
```javascript
new BatchAll(taskType = 'api', options = {})
```

**Methods:**
- `done()`: Process all queued promises in batches
  - Returns: `Promise<void>`
  - Throws: Rejects on first promise failure
  - Results are stored in the `results` property

**Usage:**
```javascript
const batch = new BatchAll('api', { debug: true });

batch.add(fetch('https://api.example.com/1'));
batch.add(fetch('https://api.example.com/2'));
batch.add(fetch('https://api.example.com/3'));

try {
  await batch.done();
  console.log('All successful:', batch.results);
} catch (error) {
  console.error('Failed:', error);
}
```

---

### `BatchSettle`

Extends `Batch` to provide resilient promise execution using `Promise.allSettled()`. Continues processing even if some promises fail.

**Constructor:**
```javascript
new BatchSettle(taskType = 'api', options = {})
```

**Methods:**
- `done()`: Process all queued promises in batches
  - Returns: `Promise<void>`
  - Never rejects - collects both successes and failures
  - Results are stored in the `results` property
  - Failed promises will have their error/reason included in results

**Usage:**
```javascript
const batch = new BatchSettle('api', { debug: true });

batch.add(fetch('https://api.example.com/1'));
batch.add(fetch('https://api.example.com/2'));
batch.add(fetch('https://api.example.com/3'));

await batch.done();

// Process results - may include both values and errors
for (const result of batch.results) {
  if (result instanceof Error) {
    console.error('Failed:', result);
  } else {
    console.log('Success:', result);
  }
}
```

## Installation

```bash
npm install promises
```

## Importing

```javascript
// Import all classes
import { Batch, BatchAll, BatchSettle } from 'promises';

// Or import individual classes
import { BatchAll } from 'promises/batch-all';
import { BatchSettle } from 'promises/batch-all-settled';
```

## When to Use Each Class

- **`BatchAll`**: Use when all promises must succeed and you want to fail fast on the first error
- **`BatchSettle`**: Use when you want to process all promises regardless of failures and handle errors individually

## Task Types

Choose the appropriate task type for optimal concurrency:
- `'api'`: For HTTP requests and external API calls (high concurrency)
- `'db'`: For database operations (high concurrency)
- `'cpu'`: For CPU-intensive tasks like data processing (lower concurrency)