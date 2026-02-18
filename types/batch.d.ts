/**
 * Task type for concurrency calculation
 */
export type TaskType = 'api' | 'db' | 'cpu';

/**
 * Options for Batch constructor
 */
export interface BatchOptions {
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Base class that manages promise batching with dynamic concurrency control
 */
export declare class Batch {
  /**
   * Creates a new Batch instance
   * @param taskType - Type of task ('api', 'db', or 'cpu')
   * @param options - Configuration options
   */
  constructor(taskType?: TaskType, options?: BatchOptions);

  /**
   * Read-only array of processed results
   */
  get results(): unknown[];

  /**
   * Read-only array of pending promises
   */
  get promises(): Promise<unknown>[];

  /**
   * Read-only calculated concurrency level
   */
  get concurrency(): number;

  /**
   * Read-only debug flag status
   */
  get debug(): boolean;

  /**
   * Add a promise to the batch queue
   * @param promise - An async promise to be processed
   */
  add(promise: Promise<unknown>): void;
}
