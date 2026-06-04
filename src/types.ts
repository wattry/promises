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
