/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import os from 'node:os';

/**
 * Task type for concurrency calculation
 */
export type TaskType = 'api' | 'db' | 'cpu';

/**
 * Options for Batch constructor
 */
export interface BatchOptions {
  /** Enable debug logging */
  debug?: boolean;
}

export type Task<T> = () => Promise<T>;

/**
 * Base class that manages promise batching with dynamic concurrency control
 */
export class Batch<T> {
  /** Holds the size of each batch */
  #concurrency: number = os.availableParallelism();
  /** Default multiplier   */
  #multiplier: number = 2;
  /** Stores the promise array to be spliced and processed */
  #tasks: Task<T>[] = [];
  /** Stores the resolved promises */
  #results: T[] = [];
  /** Stores errors from settling the promises */
  #errors: Error[] = [];
  /** Enable debug logging */
  #debug: boolean = false;

  /**
   * Creates a new Batch instance
   * @param taskType - Type of task ('api', 'db', or 'cpu')
   * @param options - Configuration options
   */
  constructor(taskType: TaskType = 'api', options: BatchOptions = { debug: false }) {
    if (taskType === 'api' || taskType === 'db') {
      this.#multiplier = 4;
    }

    if (options.debug) {
      this.#debug = true;
    }

    // Use the system to calculate the available concurrency
    this.#setConcurrency();
  }

  /**
   * Read-only array of processed results
   */
  get results() {
    return this.#results;
  }

  /**
   * Read-only array of processed results
   */
  get errors() {
    return this.#errors;
  }

  /**
   * Read-only array of pending promises
   */
  get size() {
    return this.#tasks.length;
  }

  /**
   * Read-only calculated concurrency level
   */
  get concurrency() {
    return this.#concurrency;
  }

  /**
   * Read-only debug flag status
   */
  get debug() {
    return this.#debug;
  }

  #setConcurrency() {
    this.#concurrency = os.availableParallelism() * this.#multiplier;

    if (this.#debug) {
      console.debug('Calculated concurrency:', this.#concurrency);
    }
  }

  hasErrors() {
    return this.#errors.length > 0;
  }

  /**
   * Add a promise to the batch queue
   * @param promiseFn - A callback that returns the work to be processed
   */
  add(promiseFn: Task<T>) {
    if (typeof promiseFn === 'function') {
      this.#tasks.push(promiseFn);
    } else {
      throw new ReferenceError('promiseFn must be a callback');
    }
  }

  /**
   * Calculate the next batch
   * @param next gets the next batch based on the size
   */
  #next(): { hasNext: boolean, next: Task<T>[] } {
    this.#setConcurrency();

    const hasNext = this.size > this.concurrency;
    const count = hasNext ? this.concurrency : this.size;
    const next = this.#tasks.splice(0, count);

    if (this.debug) {
      console.debug('Processing batch:', count, 'remaining:', this.size);
    }

    return { hasNext, next };
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors the done must be handled in a try/catch block unlike with the BatchSettle.
   */
  async settle() {
    try {
      const { next } = this.#next();
      // Converts all the callbacks for the batch into running promises
      const items: T[] = await Promise.all(next.map((task: Task<T>) => task()));

      if (this.debug) {
        console.debug('Processed batch', 'remaining:', this.size);
      }

      for (const item of items) {
        this.#results.push(item);
      }

    } catch (error) {
      this.#errors.push(error as Error);
    } finally {
      // Recursively call the done function to empty the promises

      if (this.size > 0) {
        if (this.debug) {
          console.debug('Starting next batch', 'remaining:', this.size);
        }

        await this.settle();

        if (this.debug) {
          console.debug('Next batch complete', 'remaining:', this.size);
        }
      }
    }
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors will have an error instance and values will be the result of the promise.
   * Make sure you either handle the errors in a wrapper function.
   */
  async settleAll() {
    const { next, hasNext } = this.#next();
    const items = await Promise.allSettled(next.map((task: Task<T>) => task()));

    for (const item of items) {
      if (item.status === 'fulfilled') {
        this.#results.push(item.value);
      } else {
        this.#errors.push(item.reason);
      }
    }

    if (hasNext) {
      if (this.debug) {
        console.debug('Starting next batch', 'remaining:', this.size);
      }

      // Recursively call the done function to empty the promises
      if (this.size > 0) {
        if (this.debug) {
          console.debug('Next batch complete', 'remaining:', this.size);
        }

        await this.settleAll();
      }
    }
  }

  /**
   * Cancel the batch that is processing by removing all entries from the array
   */
  cancel() {
    this.#tasks.splice(0, this.#tasks.length);
  }
}
