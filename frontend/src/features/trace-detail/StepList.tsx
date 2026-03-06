import type { AgentStep } from '../../lib/api';
import { StepListItem } from './StepListItem';
import styles from './TraceDetail.module.css';

interface StepListProps {
  steps: AgentStep[];
  rootStepId: string;
  activeStepId: string | null;
  onSelect: (step: AgentStep) => void;
}

export function StepList({
  steps,
  rootStepId,
  activeStepId,
  onSelect,
}: StepListProps) {
  return (
    <div className={styles.timeline}>
      {steps.map((step) => (
        <StepListItem
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
