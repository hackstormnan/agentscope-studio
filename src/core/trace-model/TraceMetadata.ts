import type { AgentDescriptor } from './AgentDescriptor';

export interface TraceMetadata {
  model: string;
  totalLatency: number;
  totalTokens: number;
  cost: number;
  // Multi-agent: list of agents that participated in this trace
  agents?: AgentDescriptor[];
}
