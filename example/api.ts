import { Batch } from "../src/batch.js";

// const batch = new BatchSettle('api', { debug: true });
const batch = new Batch('api', { debug: true })

async function getRequest() {
  const result = await fetch('https://jsonplaceholder.typicode.com/posts/1');

  return result.json()
}

for (let i = 0; i < 80; i += 1) {
  batch.add(getRequest)
}

await batch.settleAll();

// console.log('Test', batch.results)