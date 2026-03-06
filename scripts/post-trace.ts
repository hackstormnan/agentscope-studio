/**
 * Sanity script: build a trace with the Tracer SDK and POST it to the running API.
 *
 * Prerequisites: server must be running (npm run dev)
 * Run: npm run sanity:post
 */
import { Tracer } from '../src/sdk/tracer';

const BASE = 'http://localhost:4000';

async function main(): Promise<void> {
  const tracer = new Tracer();
  tracer.startTrace('sanity-session', { model: 'claude-sonnet-4-6', cost: 0 });

  const plannerStepId = tracer.startStep({
    type: 'planner',
    input: { goal: 'Sanity check the API end-to-end' },
  });

  const llmStepId = tracer.startStep({
    type: 'llm',
    parentId: plannerStepId,
    input: { prompt: 'Is the server healthy?' },
  });

  tracer.endStep(
    llmStepId,
    { text: 'Yes, all systems nominal.' },
    'success',
    { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
  );

  tracer.endStep(plannerStepId, { decision: 'Done' }, 'success');

  const trace = tracer.endTrace();
  console.log('Trace built:', trace.traceId);

  const res = await fetch(`${BASE}/api/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trace),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`POST /api/traces failed (${res.status}):`, body);
    process.exit(1);
  }

  const result = await res.json() as { success: boolean; traceId: string };
  console.log('Saved successfully:', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
