import { useState, useEffect, useCallback } from 'react';
import type { AgentTrace, AgentStep } from '../../lib/api';
import type { EvaluationResult } from '../../features/evaluation/types';
import {
  runEvaluation,
  listTraceEvaluations,
  EvaluationApiError,
} from '../../features/evaluation/api';
import { Button } from '../ui/Button';
import { EvaluationHistoryList } from './EvaluationHistoryList';
import { EvaluationIssueList } from './EvaluationIssueList';
import styles from './EvaluationPanel.module.css';

interface EvaluationPanelProps {
  trace:      AgentTrace;
  activeStep: AgentStep | null;
}

function fmtScore(score: number | undefined): string {
  return score !== undefined ? score.toFixed(2) : '—';
}

function scoreStyle(score: number | undefined): React.CSSProperties {
  if (score === undefined) return { color: 'var(--text-subtle)' };
  if (score >= 0.8) return { color: 'var(--success)' };
  if (score >= 0.5) return { color: 'var(--warning)' };
  return { color: 'var(--error)' };
}

export function EvaluationPanel({ trace, activeStep }: EvaluationPanelProps) {
  const [history,        setHistory]        = useState<EvaluationResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [running,        setRunning]        = useState<'trace' | 'step' | null>(null);
  const [runError,       setRunError]       = useState<string | null>(null);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    listTraceEvaluations(trace.traceId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [trace.traceId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  function prependResult(result: EvaluationResult) {
    setHistory((prev) => {
      const exists = prev.some((r) => r.evaluationId === result.evaluationId);
      return exists ? prev.map((r) => r.evaluationId === result.evaluationId ? result : r) : [result, ...prev];
    });
    setSelectedId(result.evaluationId);
  }

  async function handleRunTrace() {
    setRunning('trace');
    setRunError(null);
    try {
      const result = await runEvaluation({ traceId: trace.traceId, targetType: 'trace' });
      prependResult(result);
    } catch (err) {
      setRunError(
        err instanceof EvaluationApiError ? err.message
          : err instanceof Error ? err.message : 'Unexpected error',
      );
    } finally { setRunning(null); }
  }

  async function handleRunStep() {
    if (!activeStep) return;
    setRunning('step');
    setRunError(null);
    try {
      const result = await runEvaluation({
        traceId:    trace.traceId,
        stepId:     activeStep.stepId,
        targetType: 'step',
      });
      prependResult(result);
    } catch (err) {
      setRunError(
        err instanceof EvaluationApiError ? err.message
          : err instanceof Error ? err.message : 'Unexpected error',
      );
    } finally { setRunning(null); }
  }

  const selectedResult = history.find((r) => r.evaluationId === selectedId) ?? null;
  const isRunning      = running !== null;

  return (
    <div className={styles.panel}>
      {/* Left column */}
      <div className={styles.formCol}>
        <div className={styles.sectionHeader}>Run Evaluation</div>

        <div className={styles.formBody}>
          {/* Action buttons */}
          <div className={styles.runActions}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunTrace}
              disabled={isRunning}
            >
              {running === 'trace' ? 'Running…' : 'Evaluate Trace'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunStep}
              disabled={isRunning || !activeStep}
              title={!activeStep ? 'Select a step in the timeline first' : undefined}
            >
              {running === 'step' ? 'Running…' : 'Evaluate Step'}
            </Button>
            {!activeStep && (
              <span className={styles.noStepHint}>Select a step to evaluate it</span>
            )}
          </div>

          {runError && (
            <div className={styles.runError}>
              <span>✕</span>
              <span>{runError}</span>
            </div>
          )}

          {/* Selected result detail */}
          {selectedResult ? (
            <div className={styles.resultDetail}>
              {/* Result summary row */}
              <div className={styles.resultMeta}>
                <div className={styles.resultMetaRow}>
                  <span className={styles.metaLabel}>Evaluator</span>
                  <span className={styles.metaMono}>{selectedResult.evaluatorName}</span>
                </div>
                <div className={styles.resultMetaRow}>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={`badge ${
                      selectedResult.status === 'success' ? 'badge-success' :
                      selectedResult.status === 'error'   ? 'badge-error'   : 'badge-default'
                    }`}
                    style={{ fontSize: 10 }}
                  >
                    {selectedResult.status}
                  </span>
                </div>
                <div className={styles.resultMetaRow}>
                  <span className={styles.metaLabel}>Score</span>
                  <span className={styles.scoreValue} style={scoreStyle(selectedResult.score)}>
                    {fmtScore(selectedResult.score)}
                  </span>
                </div>
                <div className={styles.resultMetaRow}>
                  <span className={styles.metaLabel}>Scope</span>
                  <span className="badge badge-default" style={{ fontSize: 10 }}>
                    {selectedResult.target.targetType}
                    {selectedResult.target.stepId && ` · step`}
                  </span>
                </div>
              </div>

              {selectedResult.summary && (
                <div className={styles.resultSummary}>{selectedResult.summary}</div>
              )}

              {selectedResult.errorMessage && (
                <div className={styles.runError}>
                  <span>✕</span>
                  <span>{selectedResult.errorMessage}</span>
                </div>
              )}

              {/* Issues */}
              <div className={styles.issuesHeader}>
                Issues
                <span className={styles.issuesCount}>
                  {selectedResult.issues.length}
                </span>
              </div>
              <EvaluationIssueList issues={selectedResult.issues} />
            </div>
          ) : (
            <div className={styles.noSelection}>
              Run an evaluation or select one from the history to see results.
            </div>
          )}
        </div>
      </div>

      {/* Right column — history */}
      <div className={styles.historyCol}>
        <div
          className={styles.sectionHeader}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>History</span>
          {history.length > 0 && (
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {history.length}
            </span>
          )}
        </div>
        <EvaluationHistoryList
          results={history}
          loading={historyLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  );
}
