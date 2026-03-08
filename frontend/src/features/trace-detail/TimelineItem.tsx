import type { AgentStep } from '../../lib/api';
import { StepTypeBadge, stepTypeColor } from './StepTypeBadge';
import { StepStatusIndicator } from './StepStatusIndicator';
import styles from './TraceDetail.module.css';

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

interface TimelineItemProps {
  step: AgentStep;
  active: boolean;
  isRoot: boolean;
  onClick: () => void;
}

export function TimelineItem({ step, active, isRoot, onClick }: TimelineItemProps) {
  return (
    <div className={styles.etItem}>
      {/* Dot on the track line */}
      <div className={styles.etDotCol}>
        <span
          className={styles.etDot}
          style={{ background: stepTypeColor(step.type) }}
        />
      </div>

      {/* Card */}
      <button
        className={`${styles.etCard}${active ? ' ' + styles.etCardActive : ''}`}
        onClick={onClick}
        title={step.stepId}
      >
        <div className={styles.etCardTop}>
          <div className={styles.etCardLeft}>
            <StepTypeBadge type={step.type} isRoot={isRoot} />
            {step.agentRole && (
              <span className={styles.agentRoleBadge}>{step.agentRole}</span>
            )}
          </div>
          <div className={styles.etCardRight}>
            <StepStatusIndicator status={step.status} />
            <span className={styles.etLatency}>{fmtMs(step.latency)}</span>
          </div>
        </div>
        <div className={styles.etStepId}>{step.stepId.slice(0, 16)}…</div>
      </button>
    </div>
  );
}
