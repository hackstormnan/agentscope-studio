import type { ReplayResult, ReplayStatus } from '../../features/replay/types';
import styles from './ReplayPanel.module.css';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(start: string, end?: string): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function statusClass(status: ReplayStatus): string {
  if (status === 'success') return styles.statusSuccess;
  if (status === 'error')   return styles.statusError;
  if (status === 'running') return styles.statusRunning;
  return styles.statusPending;
}

interface ReplayHistoryItemProps {
  result: ReplayResult;
  isSelected: boolean;
  onClick: () => void;
}

export function ReplayHistoryItem({ result, isSelected, onClick }: ReplayHistoryItemProps) {
  const duration = fmtDuration(result.startedAt, result.completedAt);

  return (
    <button
      className={`${styles.historyItem}${isSelected ? ' ' + styles.historyItemSelected : ''}`}
      onClick={onClick}
      title={result.replayId}
    >
      <div className={styles.historyItemTop}>
        <span className={styles.historyReplayId}>
          {result.replayId.replace('replay_', '').slice(0, 14)}…
        </span>
        <span className={`${styles.statusBadge} ${statusClass(result.status)}`}>
          {result.status}
        </span>
      </div>

      <div className={styles.historyItemMeta}>
        <span>{fmtTime(result.startedAt)}</span>
        {duration && <span>· {duration}</span>}
      </div>

      <div className={styles.historyStepId} title={result.targetStepId}>
        step: {result.targetStepId.slice(0, 18)}…
      </div>
    </button>
  );
}
