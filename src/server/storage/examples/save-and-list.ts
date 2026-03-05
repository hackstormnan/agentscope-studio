import { Tracer } from '../../../sdk/tracer';
import { FileTraceStore } from '../index';

async function main(): Promise<void> {
  const tracer = new Tracer();
  const store = new FileTraceStore(); // writes to data/traces/ relative to cwd

  // Build a trace
  tracer.startTrace('demo-session', { model: 'claude-sonnet-4-6', cost: 0.0012 });

  const plannerStepId = tracer.startStep({
    type: 'planner',
    input: { goal: 'Summarise recent news' },
  });

  const toolStepId = tracer.startStep({
    type: 'tool',
    parentId: plannerStepId,
    input: { tool: 'web_search', query: 'latest AI news' },
  });

  tracer.endStep(toolStepId, { results: ['Article A', 'Article B'] }, 'success');

  const llmStepId = tracer.startStep({
    type: 'llm',
    parentId: plannerStepId,
    input: { prompt: 'Summarise: Article A, Article B' },
  });

  tracer.endStep(
    llmStepId,
    { text: 'Here is a concise summary...' },
    'success',
    { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
  );

  tracer.endStep(plannerStepId, { decision: 'Done' }, 'success');

  const trace = tracer.endTrace();

  // Save
  await store.saveTrace(trace);
  console.log(`Saved trace: ${trace.traceId}`);

  // List
  const { items, nextCursor } = await store.listTraces({ limit: 5 });
  console.log('\n--- Trace Summaries (limit 5) ---');
  for (const summary of items) {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (nextCursor) {
    console.log(`\nMore results available. Next cursor: ${nextCursor}`);
  } else {
    console.log('\nNo more pages.');
  }
}

main().catch(console.error);
