import { Tracer } from '../index';

const tracer = new Tracer();

// 1. Start a trace for this session
tracer.startTrace('demo-session', { model: 'claude-sonnet-4-6', cost: 0 });

// 2. Planner step — the top-level orchestrator
const plannerStepId = tracer.startStep({
  type: 'planner',
  input: { goal: 'Answer user question about TypeScript generics' },
});

// 3. LLM step — child of the planner
const llmStepId = tracer.startStep({
  type: 'llm',
  parentId: plannerStepId,
  input: { prompt: 'Explain TypeScript generics with a practical example.' },
});

// 4. LLM step finishes
tracer.endStep(
  llmStepId,
  { text: 'Generics allow you to write reusable, type-safe code...' },
  'success',
  { promptTokens: 120, completionTokens: 340, totalTokens: 460 },
);

// 5. Planner step finishes after reviewing LLM output
tracer.endStep(
  plannerStepId,
  { decision: 'Response is satisfactory, return to user.' },
  'success',
);

// 6. Finalise and retrieve the complete trace
const trace = tracer.endTrace();

console.log(JSON.stringify(trace, null, 2));
