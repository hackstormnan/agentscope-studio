import type { AgentStep } from './AgentStep';
import type { TraceMetadata } from './TraceMetadata';

export interface AgentTrace {
  traceId: string;
  sessionId: string;
  rootStepId: string;
  steps: AgentStep[];
  metadata: TraceMetadata;
}
