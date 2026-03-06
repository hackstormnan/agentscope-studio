/**
 * Example: fetch /api/stats and /api/traces from a running server.
 *
 * Prerequisites:
 *   npm run dev   (starts server on http://localhost:4000)
 *
 * Run this script with:
 *   npx ts-node src/server/api/examples/stats-and-list.ts
 *
 * Equivalent curl commands:
 *   curl http://localhost:4000/api/stats
 *   curl "http://localhost:4000/api/traces?limit=5"
 *   curl "http://localhost:4000/api/traces?sessionId=demo&hasError=false&limit=10"
 */

const BASE = 'http://localhost:4000';

// Requires Node 18+ for the built-in fetch API.
async function main(): Promise<void> {
  // --- Stats ---
  console.log('=== GET /api/stats ===');
  const statsRes = await fetch(`${BASE}/api/stats`);
  if (!statsRes.ok) {
    console.error(`Stats request failed: ${statsRes.status}`);
  } else {
    const stats = await statsRes.json();
    console.log(JSON.stringify(stats, null, 2));
  }

  // --- List (first page) ---
  console.log('\n=== GET /api/traces?limit=5 ===');
  const listRes = await fetch(`${BASE}/api/traces?limit=5`);
  if (!listRes.ok) {
    console.error(`List request failed: ${listRes.status}`);
  } else {
    const list = await listRes.json();
    console.log(JSON.stringify(list, null, 2));
  }

  // --- Filtered by sessionId ---
  console.log('\n=== GET /api/traces?sessionId=demo&limit=5 ===');
  const filteredRes = await fetch(`${BASE}/api/traces?sessionId=demo&limit=5`);
  if (!filteredRes.ok) {
    console.error(`Filtered request failed: ${filteredRes.status}`);
  } else {
    const filtered = await filteredRes.json();
    console.log(JSON.stringify(filtered, null, 2));
  }
}

main().catch(console.error);
