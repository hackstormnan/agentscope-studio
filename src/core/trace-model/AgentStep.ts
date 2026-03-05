import type { TokenUsage } from './TokenUsage';

export type StepType = 'llm' | 'tool' | 'memory' | 'planner' | 'reflection';
export type StepStatus = 'running' | 'success' | 'error';

export interface AgentStep {
  stepId: string;
  parentId?: string;
  type: StepType;
  status: StepStatus;
  input: unknown;
  output: unknown;
  latency: number;
  tokens?: TokenUsage;
  children: string[];
}
