/**
 * An implementation of Promise.all to limit the number of promises that will be executed
 * at the same time to prevent ratelimiting and large volumes of requests
 */
import os from 'node:os';

export class Batch {
  /** The size of each batch */
  #concurrency = 10;
  #multiplier = 2;
  /** Stores the promise array to be spliced and processed */
  #promises = [];
  #results = [];
  #debug = false

  constructor(taskType = 'api', options = {}) {
    if (taskType === 'api' || taskType === 'db') {
      this.#multiplier = 4;
    }

    const { debug } = options;
    if (debug) {
      this.#debug = true;
    }

    const cpu = os.cpus();
    const total = os.totalmem();
    const free = os.freemem();
    const mem = (total - free) / total;

    this.#concurrency = Math.round(cpu.length * this.#multiplier * mem);
    if (debug) {
      console.debug('Calculated concurrency:', this.#concurrency);
    }
  }

  get results() {
    return this.#results;
  }

  get promises() {
    return this.#promises;
  }

  get concurrency() {
    return this.#concurrency;
  }

  get debug() {
    return this.#debug;
  }

  /**
   * Push a promise into the promise handler
   * @param {Promise<unknown>} promise Takes an async promise and adds it to the results array
   */
  add(promise) {
    this.#promises.push(promise);
  }
}
