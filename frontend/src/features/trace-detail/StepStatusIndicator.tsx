import type { AgentStep } from '../../lib/api';
import styles from './TraceDetail.module.css';

type StepStatus = AgentStep['status'];

interface StatusConfig {
  color: string;
  label: string;
}

const STATUS_CONFIG: Record<StepStatus, StatusConfig> = {
  success: { color: 'var(--success)', label: 'Success' },
  error:   { color: 'var(--error)',   label: 'Error'   },
  running: { color: 'var(--warning)', label: 'Running' },
};

interface StepStatusIndicatorProps {
  status: StepStatus;
}

export function StepStatusIndicator({ status }: StepStatusIndicatorProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`${styles.statusDot}${status === 'running' ? ' ' + styles.statusRunning : ''}`}
      style={{ background: cfg.color }}
      title={cfg.label}
      aria-label={cfg.label}
    />
  );
}
