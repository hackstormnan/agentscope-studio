import { Badge } from '../../components/ui/Badge';
import type { AgentStep } from '../../lib/api';
import styles from './TraceDetail.module.css';

const STATUS_BADGE: Record<AgentStep['status'], 'success' | 'error' | 'warning'> = {
  success: 'success',
  error:   'error',
  running: 'warning',
};

const TYPE_COLOR: Record<AgentStep['type'], string> = {
  llm:        'var(--accent)',
  tool:       'var(--success)',
  planner:    'var(--warning)',
  memory:     '#a78bfa',
  reflection: '#fb923c',
};

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

interface StepListItemProps {
  step: AgentStep;
  active: boolean;
  isRoot: boolean;
  onClick: () => void;
}

export function StepListItem({ step, active, isRoot, onClick }: StepListItemProps) {
  return (
    <button
      className={`${styles.timelineStep}${active ? ' ' + styles.timelineStepActive : ''}`}
      style={{ paddingLeft: step.parentId ? 32 : 16 }}
      onClick={onClick}
      title={step.stepId}
    >
      <span
        className={styles.stepDot}
        style={{ background: TYPE_COLOR[step.type] }}
      />
      <span className={styles.stepTypeCell}>
        {step.type}
        {isRoot && <span className={styles.rootTag}>root</span>}
      </span>
      <span className={styles.stepId}>{step.stepId.slice(0, 8)}</span>
      <span className={styles.stepLatency}>{fmtMs(step.latency)}</span>
      <Badge variant={STATUS_BADGE[step.status]}>{step.status}</Badge>
    </button>
  );
}
