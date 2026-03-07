import type { EvaluationResult, EvaluationStatus } from '../../features/evaluation/types';
import styles from './EvaluationPanel.module.css';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtScore(score: number | undefined): string {
  return score !== undefined ? score.toFixed(2) : '—';
}

function statusClass(status: EvaluationStatus): string {
  if (status === 'success') return styles.statusSuccess;
  if (status === 'error')   return styles.statusError;
  if (status === 'running') return styles.statusRunning;
  return styles.statusPending;
}

function scoreClass(score: number | undefined): string {
  if (score === undefined) return '';
  if (score >= 0.8) return styles.scoreGood;
  if (score >= 0.5) return styles.scoreWarn;
  return styles.scoreBad;
}

interface EvaluationHistoryListProps {
  results:    EvaluationResult[];
  loading:    boolean;
  selectedId: string | null;
  onSelect:   (id: string) => void;
}

export function EvaluationHistoryList({
  results,
  loading,
  selectedId,
  onSelect,
}: EvaluationHistoryListProps) {
  if (loading) {
    return (
      <div className={styles.historyList}>
        {[1, 0.6, 0.35].map((opacity, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 52, margin: '0 0 1px', opacity, borderRadius: 0 }}
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return <div className={styles.historyEmpty}>No evaluations yet</div>;
  }

  return (
    <div className={styles.historyList}>
      {results.map((r) => {
        const isSelected = r.evaluationId === selectedId;
        const scope = r.target.targetType === 'step' ? 'step' : 'trace';
        return (
          <button
            key={r.evaluationId}
            className={`${styles.historyItem}${isSelected ? ' ' + styles.historyItemSelected : ''}`}
            onClick={() => onSelect(r.evaluationId)}
            title={r.evaluationId}
          >
            <div className={styles.historyItemTop}>
              <span className={styles.historyEvalId}>
                {r.evaluationId.replace('eval_', '').slice(0, 12)}…
              </span>
              <span className={`${styles.statusBadge} ${statusClass(r.status)}`}>
                {r.status}
              </span>
            </div>
            <div className={styles.historyItemMeta}>
              <span>{fmtTime(r.startedAt)}</span>
              <span>·</span>
              <span className={`badge badge-default`} style={{ fontSize: 9, padding: '1px 5px' }}>
                {scope}
              </span>
            </div>
            {r.score !== undefined && (
              <div className={`${styles.historyScore} ${scoreClass(r.score)}`}>
                score {fmtScore(r.score)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
