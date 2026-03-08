import type { ExperimentRunWithSummary } from '../../features/experiments/types';
import styles from './Experiments.module.css';

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface ExperimentRunTableProps {
  runs:       ExperimentRunWithSummary[];
  selected:   Set<string>;   // runIds currently selected for comparison
  onToggle:   (runId: string) => void;
}

export function ExperimentRunTable({
  runs,
  selected,
  onToggle,
}: ExperimentRunTableProps) {
  if (runs.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '16px 0' }}>
        No runs recorded for this experiment yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.runTable}>
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            <th>Run ID</th>
            <th>Dataset Run</th>
            <th>Prompt</th>
            <th>Model</th>
            <th>Status</th>
            <th>Size</th>
            <th>Errors</th>
            <th>Score</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(({ run, summary }) => {
            const isSelected = selected.has(run.runId);
            const disabled   = !isSelected && selected.size >= 2;

            return (
              <tr
                key={run.runId}
                className={`${styles.runTableRow}${isSelected ? ' ' + styles.runTableRowSelected : ''}`}
                onClick={() => !disabled && onToggle(run.runId)}
                style={disabled ? { opacity: 0.45, cursor: 'default' } : undefined}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onToggle(run.runId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: disabled ? 'default' : 'pointer', accentColor: 'var(--accent)' }}
                  />
                </td>
                <td className={styles.runIdCell}>{run.runId.slice(0, 14)}…</td>
                <td className={styles.runIdCell}>{run.datasetRunId.slice(0, 14)}…</td>
                <td>
                  {run.config?.promptVersion
                    ? <span className="badge badge-accent">{run.config.promptVersion}</span>
                    : <span style={{ color: 'var(--text-subtle)' }}>—</span>
                  }
                </td>
                <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {run.config?.model ?? '—'}
                </td>
                <td>
                  <StatusBadge status={run.status} />
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{summary.datasetSize}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: summary.errorCount > 0 ? 'var(--error)' : undefined }}>
                  {summary.errorCount}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {summary.evaluationScore !== undefined
                    ? summary.evaluationScore.toFixed(3)
                    : '—'
                  }
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                  {fmtDate(run.startedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success' ? 'badge badge-success'
    : status === 'error'   ? 'badge badge-error'
    : status === 'running' ? 'badge badge-accent'
    : 'badge badge-default';
  return <span className={cls}>{status}</span>;
}
