import type { AgentStep } from '../../lib/api';
import styles from './TraceDetail.module.css';

type StepType = AgentStep['type'];

interface TypeConfig {
  label: string;
  color: string;
  background: string;
  borderColor: string;
}

const TYPE_CONFIG: Record<StepType, TypeConfig> = {
  llm: {
    label: 'LLM',
    color: 'var(--accent)',
    background: 'var(--accent-bg)',
    borderColor: 'rgba(47, 129, 247, 0.3)',
  },
  tool: {
    label: 'Tool',
    color: 'var(--success)',
    background: 'var(--success-bg)',
    borderColor: 'rgba(63, 185, 80, 0.3)',
  },
  planner: {
    label: 'Planner',
    color: 'var(--warning)',
    background: 'var(--warning-bg)',
    borderColor: 'rgba(227, 179, 65, 0.3)',
  },
  memory: {
    label: 'Memory',
    color: '#a78bfa',
    background: 'rgba(167, 139, 250, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  reflection: {
    label: 'Reflect',
    color: '#fb923c',
    background: 'rgba(251, 146, 60, 0.12)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
};

interface StepTypeBadgeProps {
  type: StepType;
  isRoot?: boolean;
}

export function StepTypeBadge({ type, isRoot }: StepTypeBadgeProps) {
  const cfg = TYPE_CONFIG[type];
  return (
    <>
      <span
        className={styles.typeBadge}
        style={{
          color: cfg.color,
          background: cfg.background,
          borderColor: cfg.borderColor,
        }}
      >
        {cfg.label}
      </span>
      {isRoot && <span className={styles.rootChip}>root</span>}
    </>
  );
}

/** Returns the dot color for a given step type — used by TimelineItem dot. */
export function stepTypeColor(type: StepType): string {
  return TYPE_CONFIG[type].color;
}
