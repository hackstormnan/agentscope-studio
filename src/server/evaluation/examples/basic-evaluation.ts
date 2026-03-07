/**
 * basic-evaluation.ts
 *
 * Demonstrates EvaluationService with four scenarios:
 *   1. Trace evaluation — clean trace (no issues expected)
 *   2. Trace evaluation — degraded trace (high error rate + high latency)
 *   3. Step evaluation  — healthy step
 *   4. Step evaluation  — slow step with missing output
 *
 * Run (from project root):
 *   npx ts-node src/server/evaluation/examples/basic-evaluation.ts
 */

import { Tracer } from '../../../sdk/tracer';
import { FileTraceStore } from '../../storage';
import { EvaluationService } from '../index';
import type { EvaluationTarget } from '../../../core/evaluation-model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function separator(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== ${title}`);
  console.log('='.repeat(60));
}

// ── Build traces ──────────────────────────────────────────────────────────────

async function buildCleanTrace(store: FileTraceStore): Promise<string> {
  const tracer = new Tracer();
  tracer.startTrace('eval-demo-clean', { model: 'claude-sonnet-4-6', cost: 0.001 });

  const planId = tracer.startStep({ type: 'planner', input: { goal: 'Summarise a document' } });
  tracer.endStep(planId, { plan: 'Read → Summarise → Return' }, 'success');

  const llmId = tracer.startStep({
    type:     'llm',
    parentId: planId,
    input:    { prompt: 'Summarise the following document…', model: 'claude-sonnet-4-6' },
  });
  tracer.endStep(
    llmId,
    { text: 'The document covers three main points…' },
    'success',
    { promptTokens: 200, completionTokens: 120, totalTokens: 320 },
  );

  const trace = tracer.endTrace();
  await store.saveTrace(trace);
  return trace.traceId;
}

async function buildDegradedTrace(store: FileTraceStore): Promise<string> {
  const tracer = new Tracer();
  // Manually mark high latency via metadata override is not directly exposed,
  // so we create a trace with many error steps to trigger the error-rate rule.
  tracer.startTrace('eval-demo-degraded', { model: 'claude-sonnet-4-6', cost: 0.003 });

  // 3 error steps + 1 success → 75% error rate → triggers TRACE_ERROR_RATE_HIGH
  for (let i = 0; i < 3; i++) {
    const id = tracer.startStep({ type: 'tool', input: { tool: `tool_${i}` } });
    tracer.endStep(id, null, 'error');
  }
  const okId = tracer.startStep({ type: 'llm', input: { prompt: 'Recover' } });
  tracer.endStep(okId, { text: 'Recovered.' }, 'success');

  const trace = tracer.endTrace();
  await store.saveTrace(trace);
  return trace.traceId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const store   = new FileTraceStore();
  const service = new EvaluationService(store);

  // ── Scenario 1: clean trace ─────────────────────────────────────────────────
  const cleanTraceId = await buildCleanTrace(store);
  separator('Scenario 1: Clean trace evaluation');
  console.log('traceId:', cleanTraceId);

  const target1: EvaluationTarget = { traceId: cleanTraceId, targetType: 'trace' };
  const result1 = await service.evaluate(target1);
  console.log(JSON.stringify(result1, null, 2));

  // ── Scenario 2: degraded trace ──────────────────────────────────────────────
  const badTraceId = await buildDegradedTrace(store);
  separator('Scenario 2: Degraded trace evaluation (high error rate)');
  console.log('traceId:', badTraceId);

  const target2: EvaluationTarget = { traceId: badTraceId, targetType: 'trace' };
  const result2 = await service.evaluate(target2);
  console.log(JSON.stringify(result2, null, 2));

  // ── Scenario 3: healthy step ────────────────────────────────────────────────
  // Re-load the clean trace to get its step IDs
  const cleanTrace = await store.getTrace(cleanTraceId);
  const healthyStep = cleanTrace!.steps[0];

  separator('Scenario 3: Healthy step evaluation');
  console.log('stepId:', healthyStep.stepId);

  const target3: EvaluationTarget = {
    traceId:    cleanTraceId,
    stepId:     healthyStep.stepId,
    targetType: 'step',
  };
  const result3 = await service.evaluate(target3);
  console.log(JSON.stringify(result3, null, 2));

  // ── Scenario 4: step with error status in degraded trace ───────────────────
  const badTrace  = await store.getTrace(badTraceId);
  const errorStep = badTrace!.steps.find((s) => s.status === 'error')!;

  separator('Scenario 4: Error step evaluation (error status + missing output)');
  console.log('stepId:', errorStep.stepId);

  const target4: EvaluationTarget = {
    traceId:    badTraceId,
    stepId:     errorStep.stepId,
    targetType: 'step',
  };
  const result4 = await service.evaluate(target4);
  console.log(JSON.stringify(result4, null, 2));

  // ── Scenario 5: missing trace ───────────────────────────────────────────────
  separator('Scenario 5: Missing trace (error result)');

  const target5: EvaluationTarget = { traceId: 'trace_does_not_exist', targetType: 'trace' };
  const result5 = await service.evaluate(target5);
  console.log(JSON.stringify(result5, null, 2));
}

main().catch(console.error);
