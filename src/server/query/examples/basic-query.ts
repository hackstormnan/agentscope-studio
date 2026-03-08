/**
 * basic-query.ts
 *
 * Runnable examples showing how to use TraceQueryService directly (no HTTP).
 *
 * Usage:
 *   npx ts-node src/server/query/examples/basic-query.ts
 *
 * The examples use the default FileTraceStore pointed at data/traces/, so
 * run from the project root after ingesting at least a few traces.
 */

import { FileTraceStore } from '../../storage/FileTraceStore';
import { TraceQueryService } from '../TraceQueryService';
import type { TraceQuery } from '../../../core/query-model';

async function run(): Promise<void> {
  const store   = new FileTraceStore('data/traces');
  const service = new TraceQueryService(store);

  // ── Example 1: Traces with errors ─────────────────────────────────────────
  const errQuery: TraceQuery = {
    filters: [{ field: 'hasError', operator: 'eq', value: true }],
    limit: 10,
  };
  const errResult = await service.execute(errQuery);
  console.log('\n── Example 1: hasError = true ──');
  console.log(`  Matched ${errResult.items.length} trace(s)`);
  errResult.items.forEach(t => console.log(`  ${t.traceId}  latency=${t.totalLatency}ms`));

  // ── Example 2: High-latency traces ────────────────────────────────────────
  const latencyQuery: TraceQuery = {
    filters: [{ field: 'totalLatency', operator: 'gt', value: 1000 }],
    limit: 10,
  };
  const latencyResult = await service.execute(latencyQuery);
  console.log('\n── Example 2: totalLatency > 1000 ms ──');
  console.log(`  Matched ${latencyResult.items.length} trace(s)`);
  latencyResult.items.forEach(t => console.log(`  ${t.traceId}  latency=${t.totalLatency}ms`));

  // ── Example 3: Session ID substring match ─────────────────────────────────
  const sessionQuery: TraceQuery = {
    filters: [{ field: 'sessionId', operator: 'contains', value: 'demo' }],
    limit: 10,
  };
  const sessionResult = await service.execute(sessionQuery);
  console.log('\n── Example 3: sessionId contains "demo" ──');
  console.log(`  Matched ${sessionResult.items.length} trace(s)`);
  sessionResult.items.forEach(t => console.log(`  ${t.traceId}  session=${t.sessionId}`));

  // ── Example 4: Sort by totalTokens descending ─────────────────────────────
  const tokenQuery: TraceQuery = {
    filters: [],
    sort: { field: 'totalTokens', direction: 'desc' },
    limit: 5,
  };
  const tokenResult = await service.execute(tokenQuery);
  console.log('\n── Example 4: all traces, sorted by totalTokens desc ──');
  tokenResult.items.forEach(t => console.log(`  ${t.traceId}  tokens=${t.totalTokens}`));

  // ── Example 5: Pagination ─────────────────────────────────────────────────
  const page1Query: TraceQuery = { filters: [], limit: 2 };
  const page1 = await service.execute(page1Query);
  console.log('\n── Example 5: page 1 (limit=2) ──');
  page1.items.forEach(t => console.log(`  ${t.traceId}`));

  if (page1.nextCursor) {
    const page2Query: TraceQuery = { filters: [], limit: 2, cursor: page1.nextCursor };
    const page2 = await service.execute(page2Query);
    console.log('── Example 5: page 2 ──');
    page2.items.forEach(t => console.log(`  ${t.traceId}`));
    console.log(`  nextCursor: ${page2.nextCursor ?? '(none — last page)'}`);
  } else {
    console.log('  (only one page of results)');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
