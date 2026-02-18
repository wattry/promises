import { Batch, TaskType, BatchOptions } from './batch.js';

/**
 * Extends Batch to provide resilient promise execution using Promise.allSettled().
 * Continues processing even if some promises fail.
 */
export declare class BatchSettle extends Batch {
  /**
   * Creates a new BatchSettle instance
   * @param taskType - Type of task ('api', 'db', or 'cpu')
   * @param options - Configuration options
   */
  constructor(taskType?: TaskType, options?: BatchOptions);

  /**
   * Process all queued promises in batches
   * Results are stored in the results property
   * Never rejects - collects both successes and failures
   * Failed promises will have their error/reason included in results
   */
  done(): Promise<void>;
}
