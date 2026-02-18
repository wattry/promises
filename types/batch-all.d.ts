import { Batch, TaskType, BatchOptions } from './batch.js';

/**
 * Extends Batch to provide fail-fast promise execution using Promise.all().
 * If any promise rejects, the entire batch fails immediately.
 */
export declare class BatchAll extends Batch {
  /**
   * Creates a new BatchAll instance
   * @param taskType - Type of task ('api', 'db', or 'cpu')
   * @param options - Configuration options
   */
  constructor(taskType?: TaskType, options?: BatchOptions);

  /**
   * Process all queued promises in batches
   * Results are stored in the results property
   * @throws Rejects on first promise failure
   */
  done(): Promise<void>;
}
