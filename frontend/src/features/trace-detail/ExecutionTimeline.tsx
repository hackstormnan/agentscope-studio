import type { AgentStep } from '../../lib/api';
import { TimelineItem } from './TimelineItem';
import styles from './TraceDetail.module.css';

interface ExecutionTimelineProps {
  steps: AgentStep[];
  rootStepId: string;
  activeStepId: string | null;
  onSelect: (step: AgentStep) => void;
}

export function ExecutionTimeline({
  steps,
  rootStepId,
  activeStepId,
  onSelect,
}: ExecutionTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className={styles.etContainer}>
        <div className="placeholder-panel" style={{ minHeight: 120 }}>
          <div>No steps recorded.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.etContainer}>
      {/* Vertical track line — rendered behind all items */}
      <div className={styles.etTrack} />

      {steps.map((step) => (
        <TimelineItem
          key={step.stepId}
          step={step}
          active={activeStepId === step.stepId}
          isRoot={step.stepId === rootStepId}
          onClick={() => onSelect(step)}
        />
      ))}
    </div>
  );
}
