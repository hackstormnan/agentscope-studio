import type { CSSProperties } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { AgentStep } from '../../lib/api';
import { StepTypeBadge } from './StepTypeBadge';
import { StepStatusIndicator } from './StepStatusIndicator';
import styles from './TraceDetail.module.css';

export interface GraphNodeData {
  step: AgentStep;
  isRoot: boolean;
  isActive: boolean;
}

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

const HANDLE_STYLE: CSSProperties = {
  width: 8,
  height: 8,
  background: 'var(--border)',
  border: '2px solid var(--surface)',
  borderRadius: '50%',
};

export function GraphNode({ data }: NodeProps<GraphNodeData>) {
  const { step, isRoot, isActive } = data;

  return (
    <div
      style={{
        width: 180,
        background: 'var(--surface)',
        border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: 'var(--font)',
        boxShadow: isActive ? '0 0 0 3px rgba(47, 129, 247, 0.15)' : 'none',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        cursor: 'pointer',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={HANDLE_STYLE}
      />

      {/* Top row: type badge + status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 7,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <StepTypeBadge type={step.type} isRoot={isRoot} />
        </div>
        <StepStatusIndicator status={step.status} />
      </div>

      {/* Bottom row: stepId + latency */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {step.stepId.slice(0, 12)}…
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          {fmtMs(step.latency)}
        </span>
      </div>

      {/* Agent label — only shown on multi-agent traces */}
      {(step.agentName ?? step.agentRole) && (
        <div
          className={styles.graphNodeAgent}
          style={{ marginTop: 5 }}
          title={[step.agentName, step.agentRole].filter(Boolean).join(' · ')}
        >
          {step.agentName ?? step.agentRole}
          {step.agentName && step.agentRole && (
            <span style={{ opacity: 0.6 }}> · {step.agentRole}</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        style={HANDLE_STYLE}
      />
    </div>
  );
}
