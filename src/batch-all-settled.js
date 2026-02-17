/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import { Batch } from './batch.js';

export class BatchSettle extends Batch {
  constructor(taskType = 'api', options) {
    super(taskType, options);
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors will have an error instance and values will be the result of the promise.
   * Make sure you either handle the errors in a wrapper function.
   */
  async done() {
    const hasNext = this.promises.length > this.concurrency;
    const count = hasNext ? this.concurrency : this.promises.length;
    const next = this.promises.splice(0, count);

    if (this.debug) {
      console.debug('Processing batch:', count, 'remaining:', this.promises.length);
    }
    const items = await Promise.allSettled(next);
    if (this.debug) {
      console.debug('Processed batch:', count, 'remaining:', this.promises.length);
    }

    for (const item of items) {
      if (item.status === 'fulfilled') {
        this.results.push(item.value);
      } else {
        this.results.push(item.reason);
      }
    }

    if (hasNext) {
      if (this.debug) {
        console.debug('Starting next batch', 'remaining:', this.promises.length);
      }
      await this.done();
      if (this.debug) {
        console.debug('Next batch complete', 'remaining:', this.promises.length);
      }
    }

    return;
  }
}
