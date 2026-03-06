/**
 * basic-replay.ts
 *
 * Demonstrates ReplayService.runReplay() with three scenarios:
 *   1. Plain replay — no overrides (baseline, reproduces original inputs)
 *   2. Prompt override — replace just the prompt field
 *   3. Full input override — replace the entire input object
 *
 * Run (from project root):
 *   npx ts-node --esm src/server/replay/examples/basic-replay.ts
 */

import { Tracer } from '../../../sdk/tracer';
import { FileTraceStore } from '../../storage';
import { ReplayService } from '../index';
import type { ReplayRequest } from '../../../core/replay-model';

async function main(): Promise<void> {
  // ── Build a sample trace ────────────────────────────────────────────────────
  const tracer = new Tracer();
  tracer.startTrace('replay-demo-session', { model: 'claude-sonnet-4-6', cost: 0.0008 });

  const plannerStepId = tracer.startStep({
    type:  'planner',
    input: { goal: 'Answer a user question about the weather' },
  });

  const llmStepId = tracer.startStep({
    type:     'llm',
    parentId: plannerStepId,
    input:    { prompt: 'What is the weather in London?', model: 'claude-sonnet-4-6' },
  });

  tracer.endStep(
    llmStepId,
    { text: 'The weather in London is currently cloudy with light rain.' },
    'success',
    { promptTokens: 120, completionTokens: 80, totalTokens: 200 },
  );

  tracer.endStep(plannerStepId, { decision: 'Done' }, 'success');

  const trace = tracer.endTrace();

  // ── Save the trace so the store can retrieve it ─────────────────────────────
  const store   = new FileTraceStore();
  const service = new ReplayService(store);

  await store.saveTrace(trace);
  console.log(`Saved trace: ${trace.traceId}`);
  console.log(`Target step: ${llmStepId}\n`);

  // ── Scenario 1: plain replay (no overrides) ─────────────────────────────────
  const req1: ReplayRequest = {
    traceId:      trace.traceId,
    targetStepId: llmStepId,
  };

  const result1 = await service.runReplay(req1);
  console.log('=== Scenario 1: Plain replay ===');
  console.log(JSON.stringify(result1, null, 2));

  // ── Scenario 2: override prompt only ───────────────────────────────────────
  const req2: ReplayRequest = {
    traceId:      trace.traceId,
    targetStepId: llmStepId,
    overrides: {
      overridePrompt: 'What is the weather in Tokyo?',
    },
    metadata: {
      requestedBy: 'evaluator',
      reason:      'Test different city',
      requestedAt: new Date().toISOString(),
    },
  };

  const result2 = await service.runReplay(req2);
  console.log('\n=== Scenario 2: Prompt override ===');
  console.log(JSON.stringify(result2, null, 2));

  // ── Scenario 3: full input override ────────────────────────────────────────
  const req3: ReplayRequest = {
    traceId:      trace.traceId,
    targetStepId: llmStepId,
    overrides: {
      overrideInput: {
        prompt: 'Explain quantum entanglement in simple terms.',
        model:  'claude-opus-4-6',
      },
    },
  };

  const result3 = await service.runReplay(req3);
  console.log('\n=== Scenario 3: Full input override ===');
  console.log(JSON.stringify(result3, null, 2));

  // ── Scenario 4: error — bad traceId ────────────────────────────────────────
  const req4: ReplayRequest = {
    traceId:      'trace_nonexistent',
    targetStepId: llmStepId,
  };

  const result4 = await service.runReplay(req4);
  console.log('\n=== Scenario 4: Missing trace (error) ===');
  console.log(JSON.stringify(result4, null, 2));
}

main().catch(console.error);
