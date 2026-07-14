/**
 * Options for Batch constructor
 */
export interface BatchOptions {
  /** Enable debug logging */
  debug?: boolean;
}

export interface SettleOptions {
  /** 
   * Sets the behavior of the first error in the task queue when calling the settle method.
   * Default: true
   */
  failFast: boolean
}

export type TaskArguments = unknown[];

export type TaskHandler<T, A extends TaskArguments = TaskArguments> = (...args: A) => Promise<T>;
export type Task<T, A extends TaskArguments = TaskArguments> = {
  promiseFn: TaskHandler<T, A>;
  args: A;
};

/**
 * Base class that manages promise batching with dynamic concurrency control
 */
export class Batch<T, A extends TaskArguments = TaskArguments> {
  /** Holds the size of each batch */
  #concurrency: number = navigator.hardwareConcurrency;
  /** Default multiplier   */
  #multiplier: number = 2;
  /** Stores the promise array to be spliced and processed */
  #tasks: Task<T, A>[] = [];
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
  constructor(options: BatchOptions = { debug: false }) {
    if (options.debug) {
      console.info('Debug mode ON: Ensure you have set your console level to verbose')
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
    console.debug('Hardware concurrency:', navigator.hardwareConcurrency);
    this.#concurrency = navigator.hardwareConcurrency * this.#multiplier;

    if (this.#debug) {
      console.debug('Calculated new concurrency:', this.#concurrency);
    }
  }

  hasErrors() {
    return this.#errors.length > 0;
  }

  /**
   * Add a promise to the batch queue
   * @param promiseFn - A callback that returns the work to be processed
   * @param args - Arguments to pass to the promiseFn handler.
   */
  add(promiseFn: TaskHandler<T, A>, args?: A): void {
    if (typeof promiseFn === 'function') {
      this.#tasks.push({ promiseFn, args: args ?? ([] as unknown as A) });
    } else {
      throw new ReferenceError('promiseFn must be a callback');
    }
  }

  /**
   * Calculate the next batch
   * @param next gets the next batch based on the size
   */
  #next(): { hasNext: boolean, next: Task<T, A>[] } {
    this.#setConcurrency();

    const hasNext = this.size > this.concurrency;
    const count = hasNext ? this.concurrency : this.size;
    const next = this.#tasks.splice(0, count);

    if (this.#debug) {
      console.debug('Processing batch:', count, 'remaining:', this.size);
    }

    return { hasNext, next };
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors the done must be handled in a try/catch block unlike with the BatchSettle.
   */
  async settle(options: SettleOptions = { failFast: true }) {
    try {
      const { next } = this.#next();
      // Converts all the callbacks for the batch into running promises
      const items: T[] = await Promise.all(next.map(({ promiseFn, args }: Task<T, A>) => promiseFn(...args)));

      if (this.#debug) {
        console.debug('Processed batch', 'remaining:', this.size);
      }

      for (const item of items) {
        this.#results.push(item);
      }

    } catch (error) {
      if (this.#debug) {
        console.error('An error occurred in batch', this.size);
      }
      this.cancel();
      this.#errors.push(error as Error);

      throw error;
    } finally {
      // Recursively call the done function to empty the promises

      if (this.size > 0) {
        if (this.#debug) {
          console.debug('Starting next batch', 'remaining:', this.size);
        }

        await this.settle(options);

        if (this.#debug) {
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
    const items = await Promise.allSettled(next.map(({ promiseFn, args }: Task<T, A>) => promiseFn(...args)));

    for (const item of items) {
      if (item.status === 'fulfilled') {
        this.#results.push(item.value);
      } else {
        if (this.#debug) {
          console.error('An error occurred in batch', this.size);
        }
        this.#errors.push(item.reason);
      }
    }

    if (hasNext) {
      if (this.#debug) {
        console.debug('Starting next batch', 'remaining:', this.size);
      }

      // Recursively call the done function to empty the promises
      if (this.size > 0) {
        if (this.#debug) {
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
