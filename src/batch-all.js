/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import { Batch } from './batch.js';

export class BatchAll extends Batch {
  constructor(taskType = 'api', options) {
    super(taskType, options);
  }

  /**
   * Recursively process the promises based on the available memory and cpu at the time it is called.
   * Results will be stored in the instance .results for processing.
   * Errors the done must be handled in a try/catch block unlike with the BatchSettle.
   */
  async done() {
    const hasNext = this.promises.length > this.concurrency;
    const count = hasNext ? this.concurrency : this.promises.length;
    const next = this.promises.splice(0, count);

    if (this.debug) {
      console.debug('Processing batch:', count, 'remaining:', this.promises.length);
    }
    const items = await Promise.all(next);
    if (this.debug) {
      console.debug('Processed batch', 'remaining:', this.promises.length);
    }

    for (const item of items) {
      this.results.push(item);
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
  }
}
