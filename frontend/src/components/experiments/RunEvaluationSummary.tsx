import { useState } from 'react';
import { triggerEvaluation } from '../../features/experiments/evaluationApi';
import type { BatchEvaluationResponse } from '../../features/experiments/evaluationApi';
import styles from './Experiments.module.css';

interface RunEvaluationSummaryProps {
  /** The experiment run ID (used for display label only). */
  runId:        string;
  /** The linked dataset run ID — used to call the evaluation API. */
  datasetRunId: string;
  /** Pre-loaded evaluation from parent; null means not yet evaluated. */
  evaluation:   BatchEvaluationResponse | null;
  /** Called after a successful evaluation so the parent can update its state. */
  onEvaluated:  (result: BatchEvaluationResponse) => void;
}

function fmtScore(v: number | undefined): string {
  return v !== undefined ? v.toFixed(3) : '—';
}

function fmtPct(v: number | undefined): string {
  return v !== undefined ? `${Math.round(v * 100)}%` : '—';
}

export function RunEvaluationSummary({
  runId,
  datasetRunId,
  evaluation,
  onEvaluated,
}: RunEvaluationSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    try {
      const result = await triggerEvaluation(datasetRunId);
      onEvaluated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  }

  const s = evaluation?.summary;

  return (
    <div className={styles.evalRow}>
      {/* Run label */}
      <div className={styles.evalRunId} title={runId}>
        {runId.slice(0, 14)}…
      </div>

      {/* Metrics — shown only after evaluation */}
      {s ? (
        <>
          <EvalMetric label="Score">
            <span className={styles.evalScore}>{fmtScore(s.averageScore)}</span>
          </EvalMetric>

          <EvalMetric label="Success">
            <span className={styles.evalMetricValue}>{fmtPct(s.successRate)}</span>
          </EvalMetric>

          <EvalMetric label="Issues">
            <span className={s.issueCount > 0 ? styles.evalBad : styles.evalOk}>
              {s.issueCount}
            </span>
          </EvalMetric>

          <EvalMetric label="Errors">
            <span className={s.errorIssueCount > 0 ? styles.evalBad : styles.evalOk}>
              {s.errorIssueCount}
            </span>
          </EvalMetric>

          <EvalMetric label="Warnings">
            <span className={styles.evalMetricValue}>{s.warningIssueCount}</span>
          </EvalMetric>

          <EvalMetric label="Items">
            <span className={styles.evalMetricValue}>
              {s.evaluatedItems} / {s.totalItems}
            </span>
          </EvalMetric>
        </>
      ) : (
        <span className={styles.evalEmpty}>Not evaluated yet</span>
      )}

      {/* Action */}
      <div className={styles.evalActions}>
        {error && <span className={styles.evalError}>{error}</span>}
        <button
          className="btn btn-sm btn-secondary"
          onClick={handleEvaluate}
          disabled={loading}
        >
          {loading ? 'Evaluating…' : s ? 'Re-evaluate' : 'Evaluate'}
        </button>
      </div>
    </div>
  );
}

function EvalMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.evalMetric}>
      <span className={styles.evalMetricLabel}>{label}</span>
      {children}
    </div>
  );
}
