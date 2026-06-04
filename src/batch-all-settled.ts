/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import { Batch } from './batch.js';

import type { Task, TaskType, BatchOptions } from './batch.js';

export class BatchSettle<T> extends Batch<T> {
  constructor(taskType: TaskType = 'api', options: BatchOptions) {
    super(taskType, options);
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors will have an error instance and values will be the result of the promise.
   * Make sure you either handle the errors in a wrapper function.
   */
  async done() {
    const { next, hasNext } = this.next();

    const items = await Promise.allSettled(next.map((task: Task<T>) => task()));

    for (const item of items) {
      if (item.status === 'fulfilled') {
        this.results.push(item.value);
      } else {
        this.results.push(item.reason);
      }
    }

    if (hasNext) {
      if (this.debug) {
        console.debug('Starting next batch', 'remaining:', this.size);
      }

      // Recursively call the done function to empty the promises
      await this.done();

      if (this.debug) {
        console.debug('Next batch complete', 'remaining:', this.size);
      }
    }
  }
}
