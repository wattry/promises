/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import { Batch } from './batch.js';
import type { Task, TaskType, BatchOptions } from './batch.js';

export class BatchAll<T> extends Batch<T> {
  constructor(taskType: TaskType = 'api', options: BatchOptions) {
    super(taskType, options);
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors the done must be handled in a try/catch block unlike with the BatchSettle.
   */
  async done() {
    const { next, hasNext } = this.next();
    const items: T[] = await Promise.all(next.map((task: Task<T>) => task()));

    if (this.debug) {
      console.debug('Processed batch', 'remaining:', this.size);
    }

    for (const item of items) {
      this.results.push(item);
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
