/**
 * Describes a single agent participating in a multi-agent trace.
 * All fields except agentId are optional so single-agent and legacy
 * traces remain fully compatible.
 */
export interface AgentDescriptor {
  agentId: string;
  agentName?: string;
  agentRole?: string;
  metadata?: Record<string, unknown>;
}
