import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/Badge';
import type { AgentStep } from '../../lib/api';
import { JsonBlock } from './JsonBlock';
import styles from './TraceDetail.module.css';

const STATUS_BADGE: Record<AgentStep['status'], 'success' | 'error' | 'warning'> = {
  success: 'success',
  error:   'error',
  running: 'warning',
};

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

interface StepDetailPanelProps {
  step: AgentStep | null;
}

export function StepDetailPanel({ step }: StepDetailPanelProps) {
  if (!step) {
    return (
      <div className="placeholder-panel" style={{ minHeight: 300 }}>
        <div className="placeholder-panel-title">No step selected</div>
        <div>Click a step in the timeline to inspect it.</div>
      </div>
    );
  }

  return (
    <div className={styles.stepDetail}>
      <div className={styles.stepDetailHeader}>
        <span>{step.type}</span>
        <Badge variant={STATUS_BADGE[step.status]}>{step.status}</Badge>
      </div>

      <Section label="Step ID">
        <span className="text-mono text-muted">{step.stepId}</span>
      </Section>

      {step.parentId && (
        <Section label="Parent">
          <span className="text-mono text-muted">{step.parentId}</span>
        </Section>
      )}

      {step.children.length > 0 && (
        <Section label={`Children (${step.children.length})`}>
          <div className={styles.childrenList}>
            {step.children.map((id) => (
              <span key={id} className="text-mono text-muted text-sm">
                {id}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section label="Latency">
        <span>{fmtMs(step.latency)}</span>
      </Section>

      {step.tokens && (
        <Section label="Tokens">
          <span className="text-sm text-muted">
            {step.tokens.promptTokens.toLocaleString()} prompt
            {' + '}
            {step.tokens.completionTokens.toLocaleString()} completion
            {' = '}
            <strong style={{ color: 'var(--text)' }}>
              {step.tokens.totalTokens.toLocaleString()}
            </strong>
          </span>
        </Section>
      )}

      <Section label="Input">
        <JsonBlock value={step.input} />
      </Section>

      <Section label="Output">
        <JsonBlock value={step.output} />
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.detailSection}>
      <div className={styles.detailLabel}>{label}</div>
      {children}
    </div>
  );
}
