import { BatchSettle } from "../src/batch-all-settled.js";
import { BatchAll } from "../src/batch-all.js";

// const batch = new BatchSettle('api', { debug: true });
const batch = new BatchAll('api', { debug: true })

async function getRequest() {
  const result = await fetch('https://jsonplaceholder.typicode.com/posts/1');

  return result.json()
}

for (let i = 0; i < 80; i += 1) {
  batch.add(getRequest())
}

await batch.done();

console.log('Test', batch.results)