/**
 * Sanity script: list traces and fetch the first one in full detail.
 *
 * Prerequisites: server must be running (npm run dev)
 * Run: npm run sanity:get
 */

const BASE = 'http://localhost:4000';

interface TraceSummary {
  traceId: string;
  sessionId: string;
  createdAt: string;
  totalLatency: number;
  totalTokens: number;
  hasError: boolean;
}

interface ListResult {
  items: TraceSummary[];
  nextCursor?: string;
}

async function main(): Promise<void> {
  // --- List ---
  console.log('=== GET /api/traces?limit=5 ===');
  const listRes = await fetch(`${BASE}/api/traces?limit=5`);
  if (!listRes.ok) {
    console.error(`List failed (${listRes.status}):`, await listRes.text());
    process.exit(1);
  }
  const list = await listRes.json() as ListResult;
  console.log(JSON.stringify(list, null, 2));

  if (list.items.length === 0) {
    console.log('\nNo traces found — run "npm run sanity:post" first.');
    return;
  }

  // --- Detail for the most recent trace ---
  const { traceId } = list.items[0];
  console.log(`\n=== GET /api/traces/${traceId} ===`);
  const detailRes = await fetch(`${BASE}/api/traces/${traceId}`);
  if (!detailRes.ok) {
    console.error(`Detail failed (${detailRes.status}):`, await detailRes.text());
    process.exit(1);
  }
  const trace = await detailRes.json();
  console.log(JSON.stringify(trace, null, 2));

  // --- Stats ---
  console.log('\n=== GET /api/stats ===');
  const statsRes = await fetch(`${BASE}/api/stats`);
  if (!statsRes.ok) {
    console.error(`Stats failed (${statsRes.status}):`, await statsRes.text());
    process.exit(1);
  }
  const stats = await statsRes.json();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
