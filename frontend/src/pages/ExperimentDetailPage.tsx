import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ErrorState }            from '../components/ui/ErrorState';
import { LoadingState }          from '../components/ui/LoadingState';
import { ExperimentRunTable }    from '../components/experiments/ExperimentRunTable';
import { RunComparisonPanel }    from '../components/experiments/RunComparisonPanel';
import { RunEvaluationSummary }  from '../components/experiments/RunEvaluationSummary';
import { getExperimentDetail }   from '../features/experiments/api';
import { fetchStoredEvaluation } from '../features/experiments/evaluationApi';
import type { ExperimentDetail, ExperimentRunWithSummary } from '../features/experiments/types';
import type { BatchEvaluationResponse } from '../features/experiments/evaluationApi';
import styles from '../components/experiments/Experiments.module.css';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ExperimentDetailPage() {
  const { experimentId } = useParams<{ experimentId: string }>();

  const [detail,  setDetail]  = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Comparison selection — max 2 runIds
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Evaluation results keyed by datasetRunId
  const [evalMap, setEvalMap] = useState<Record<string, BatchEvaluationResponse | null>>({});

  function load() {
    if (!experimentId) return;
    setLoading(true);
    setError(null);
    getExperimentDetail(experimentId)
      .then((d) => {
        setDetail(d);
        // Fire-and-forget: fetch stored evaluations for all runs in parallel.
        d.runs.forEach(({ run }) => {
          fetchStoredEvaluation(run.datasetRunId)
            .then((evalResult) => {
              setEvalMap((prev) => ({ ...prev, [run.datasetRunId]: evalResult }));
            })
            .catch(() => {
              // Silently ignore; row shows "Not evaluated yet".
            });
        });
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load experiment'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, [experimentId]);

  const toggleRun = (runId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else if (next.size < 2) {
        next.add(runId);
      }
      return next;
    });
  };

  const handleEvaluated = (datasetRunId: string) => (result: BatchEvaluationResponse) => {
    setEvalMap((prev) => ({ ...prev, [datasetRunId]: result }));
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/experiments" className="text-muted text-sm">← Experiments</Link>
        </div>
        <LoadingState rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/experiments" className="text-muted text-sm">← Experiments</Link>
        </div>
        <ErrorState title="Failed to load experiment" message={error} onRetry={load} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/experiments" className="text-muted text-sm">← Experiments</Link>
        </div>
        <div style={{ marginTop: 56, textAlign: 'center', color: 'var(--text-subtle)' }}>
          Experiment not found.
        </div>
      </div>
    );
  }

  const { experiment, runs } = detail;

  const selectedRuns = runs.filter((r) => selected.has(r.run.runId));
  const [runA, runB]: [ExperimentRunWithSummary | undefined, ExperimentRunWithSummary | undefined] =
    selectedRuns.length === 2 ? [selectedRuns[0], selectedRuns[1]] : [undefined, undefined];

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/experiments" className="text-muted text-sm">← Experiments</Link>
      </div>

      {/* Experiment header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>{experiment.name}</div>
        {experiment.description && (
          <div className={styles.detailDesc}>{experiment.description}</div>
        )}
        <div className={styles.detailMeta}>
          <span className={styles.detailMetaItem}>
            ID: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{experiment.experimentId}</span>
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span className={styles.detailMetaItem}>Created {fmtDate(experiment.createdAt)}</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span className={styles.detailMetaItem}>{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="divider" />

      {/* Run table */}
      <div style={{ marginTop: 20 }}>
        <div className={styles.sectionTitle}>
          Runs
          {selected.size > 0 && (
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-subtle)', textTransform: 'none', letterSpacing: 0 }}>
              — {selected.size} / 2 selected for comparison
            </span>
          )}
        </div>
        <ExperimentRunTable
          runs={runs}
          selected={selected}
          onToggle={toggleRun}
        />
      </div>

      {/* Comparison panel or prompt */}
      {runA && runB ? (
        <RunComparisonPanel
          runA={runA}
          runB={runB}
          onClear={() => setSelected(new Set())}
        />
      ) : (
        <div className={styles.compPrompt}>
          <span className={styles.compPromptIcon}>⊞</span>
          <span>
            Select exactly two runs using the checkboxes above to compare their metrics side-by-side.
          </span>
        </div>
      )}

      {/* Batch evaluation panel */}
      {runs.length > 0 && (
        <div className={styles.evalPanel}>
          <div className={styles.evalPanelHeader}>
            <span className={styles.evalPanelTitle}>Batch Evaluation</span>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
              RuleBasedEvaluator · per-run
            </span>
          </div>
          {runs.map(({ run }) => (
            <RunEvaluationSummary
              key={run.runId}
              runId={run.runId}
              datasetRunId={run.datasetRunId}
              evaluation={evalMap[run.datasetRunId] ?? null}
              onEvaluated={handleEvaluated(run.datasetRunId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
