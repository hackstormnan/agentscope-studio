import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTrace } from '../lib/api';
import type { AgentTrace, AgentStep } from '../lib/api';
import { ErrorState } from '../components/ui/ErrorState';
import { TraceHeader } from '../features/trace-detail/TraceHeader';
import { ExecutionTimeline } from '../features/trace-detail/ExecutionTimeline';
import { StepDetailPanel } from '../features/trace-detail/StepDetailPanel';
import { ReasoningGraph } from '../features/trace-detail/ReasoningGraph';
import styles from './TraceDetailPage.module.css';

export default function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();

  const [trace,      setTrace]      = useState<AgentTrace | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<AgentStep | null>(null);
  const [activeTab,  setActiveTab]  = useState<'graph' | 'diff'>('graph');

  useEffect(() => {
    if (!traceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTrace(traceId)
      .then((t) => {
        if (cancelled) return;
        setTrace(t);
        if (t) {
          // Prefer root step, fall back to first step in list
          const root = t.steps.find((s) => s.stepId === t.rootStepId) ?? t.steps[0];
          setActiveStep(root ?? null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load trace');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [traceId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/traces" className="text-muted text-sm">← Traces</Link>
        </div>
        <div className="flex-col gap-3">
          <div className="skeleton" style={{ height: 72, borderRadius: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/traces" className="text-muted text-sm">← Traces</Link>
        </div>
        <div style={{ marginTop: 32 }}>
          <ErrorState
            title="Failed to load trace"
            message={error}
            onRetry={() => {
              setError(null);
              setLoading(true);
              getTrace(traceId!)
                .then((t) => {
                  setTrace(t);
                  if (t) {
                    const root = t.steps.find((s) => s.stepId === t.rootStepId) ?? t.steps[0];
                    setActiveStep(root ?? null);
                  }
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load trace'))
                .finally(() => setLoading(false));
            }}
          />
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!trace) {
    return (
      <div className="page">
        <div className="mb-4">
          <Link to="/traces" className="text-muted text-sm">← Traces</Link>
        </div>
        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <div className="page-title text-muted">Trace not found</div>
          <div className="text-subtle text-sm" style={{ marginTop: 8 }}>
            No trace exists with ID{' '}
            <code className="text-mono">{traceId}</code>.
          </div>
        </div>
      </div>
    );
  }

  const llmStepCount = trace.steps.filter((s) => s.type === 'llm').length;
  // ↑ used by the Prompt Diff Viewer tab below

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/traces" className="text-muted text-sm">← Traces</Link>
      </div>

      {/* Trace metadata summary */}
      <TraceHeader trace={trace} />

      {/* Two-panel: step list + step detail */}
      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            Execution Timeline
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-subtle)' }}>
              ({trace.steps.length})
            </span>
          </div>
          <ExecutionTimeline
            steps={trace.steps}
            rootStepId={trace.rootStepId}
            activeStepId={activeStep?.stepId ?? null}
            onSelect={setActiveStep}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Step Detail</div>
          <StepDetailPanel step={activeStep} />
        </div>
      </div>

      {/* Bottom tabs: placeholder sections */}
      <div className="tabs">
        <button
          className={`tab${activeTab === 'graph' ? ' tab-active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Reasoning Graph
        </button>
        <button
          className={`tab${activeTab === 'diff' ? ' tab-active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Prompt Diff Viewer
        </button>
      </div>

      {activeTab === 'graph' && (
        <ReasoningGraph
          steps={trace.steps}
          rootStepId={trace.rootStepId}
          activeStepId={activeStep?.stepId ?? null}
          onSelect={setActiveStep}
        />
      )}

      {activeTab === 'diff' && (
        <div className="placeholder-panel">
          <div className="placeholder-panel-title">Prompt Diff Viewer</div>
          <div>Side-by-side diff of prompt mutations across LLM steps will render here.</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {llmStepCount} LLM step{llmStepCount !== 1 ? 's' : ''} detected
          </div>
        </div>
      )}
    </div>
  );
}
