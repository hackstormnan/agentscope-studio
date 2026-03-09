/** Step / run / evaluation status mapped to a consistent styled badge. */
type Status = 'running' | 'success' | 'error' | 'warning' | 'pending' | string;

interface StatusBadgeProps {
  status: Status;
  /** Override the displayed label (defaults to the status string). */
  label?: string;
}

const STATUS_CLASS: Record<string, string> = {
  running: 'badge badge-accent',
  success: 'badge badge-success',
  error:   'badge badge-error',
  warning: 'badge badge-warning',
  pending: 'badge badge-default',
};

const STATUS_LABEL: Record<string, string> = {
  running: 'running',
  success: 'success',
  error:   'error',
  warning: 'warning',
  pending: 'pending',
};

/**
 * StatusBadge — maps a status string to a coloured badge.
 * Accepts any string; unknown statuses fall back to the default badge style.
 *
 * Usage:
 *   <StatusBadge status={step.status} />
 *   <StatusBadge status="error" label="failed" />
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const cls  = STATUS_CLASS[status]  ?? 'badge badge-default';
  const text = label ?? STATUS_LABEL[status] ?? status;
  return <span className={cls}>{text}</span>;
}
