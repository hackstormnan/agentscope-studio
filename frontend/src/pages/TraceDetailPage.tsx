import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { getTrace } from '../lib/api';
import type { AgentTrace, AgentStep } from '../lib/api';
import styles from './TraceDetailPage.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

type StepStatus = AgentStep['status'];
type StepType   = AgentStep['type'];

const STATUS_BADGE: Record<StepStatus, 'success' | 'error' | 'warning'> = {
  success: 'success',
  error:   'error',
  running: 'warning',
};

const TYPE_COLOR: Record<StepType, string> = {
  llm:        'var(--accent)',
  tool:       'var(--success)',
  planner:    'var(--warning)',
  memory:     '#a78bfa',
  reflection: '#fb923c',
};

function fmtMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace,      setTrace]      = useState<AgentTrace | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeStep, setActiveStep] = useState<AgentStep | null>(null);
  const [activeTab,  setActiveTab]  = useState<'graph' | 'diff'>('graph');

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    getTrace(traceId)
      .then((t) => {
        setTrace(t);
        if (t?.steps[0]) setActiveStep(t.steps[0]);
      })
      .finally(() => setLoading(false));
  }, [traceId]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="page">
        <div className="flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (!trace) {
    return (
      <div className="page">
        <Link to="/traces" className="text-muted text-sm">← Back to Traces</Link>
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

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/traces" className="text-muted text-sm">
          ← Traces
        </Link>
      </div>

      {/* Trace header */}
      <div className={styles.traceHeader}>
        <div className="page-title">
          <span className="text-mono">{trace.traceId}</span>
        </div>
        <div className={styles.metaRow}>
          <span className="text-muted text-sm">
            Session <strong style={{ color: 'var(--text)' }}>{trace.sessionId}</strong>
          </span>
          <span className={styles.sep}>·</span>
          <span className="text-muted text-sm">
            Model <strong style={{ color: 'var(--text)' }}>{trace.metadata.model || '—'}</strong>
          </span>
          <span className={styles.sep}>·</span>
          <span className="text-muted text-sm">
            Latency <strong style={{ color: 'var(--text)' }}>{fmtMs(trace.metadata.totalLatency)}</strong>
          </span>
          <span className={styles.sep}>·</span>
          <span className="text-muted text-sm">
            Tokens <strong style={{ color: 'var(--text)' }}>{trace.metadata.totalTokens.toLocaleString()}</strong>
          </span>
          <span className={styles.sep}>·</span>
          <span className="text-muted text-sm">
            Cost <strong style={{ color: 'var(--text)' }}>${trace.metadata.cost.toFixed(4)}</strong>
          </span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className={styles.panels}>
        {/* Left — Execution timeline */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Execution Timeline</div>
          <div className={styles.timeline}>
            {trace.steps.map((step) => (
              <button
                key={step.stepId}
                className={`${styles.timelineStep}${activeStep?.stepId === step.stepId ? ' ' + styles.timelineStepActive : ''}`}
                style={{ paddingLeft: step.parentId ? 32 : 16 }}
                onClick={() => setActiveStep(step)}
              >
                <span
                  className={styles.stepDot}
                  style={{ background: TYPE_COLOR[step.type] }}
                />
                <span className={styles.stepType}>{step.type}</span>
                <span className={styles.stepLatency}>{fmtMs(step.latency)}</span>
                <Badge variant={STATUS_BADGE[step.status]}>{step.status}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Right — Step detail */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Step Detail</div>
          {activeStep ? (
            <div className={styles.stepDetail}>
              <div className={styles.stepDetailHeader}>
                <span>{activeStep.type}</span>
                <Badge variant={STATUS_BADGE[activeStep.status]}>{activeStep.status}</Badge>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Step ID</div>
                <span className="text-mono text-muted">{activeStep.stepId}</span>
              </div>

              {activeStep.parentId && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Parent</div>
                  <span className="text-mono text-muted">{activeStep.parentId}</span>
                </div>
              )}

              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Latency</div>
                <span>{fmtMs(activeStep.latency)}</span>
              </div>

              {activeStep.tokens && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>Tokens</div>
                  <span className="text-sm text-muted">
                    {activeStep.tokens.promptTokens} prompt
                    + {activeStep.tokens.completionTokens} completion
                    = <strong>{activeStep.tokens.totalTokens}</strong>
                  </span>
                </div>
              )}

              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Input</div>
                <pre className={styles.codeBlock}>
                  {JSON.stringify(activeStep.input, null, 2)}
                </pre>
              </div>

              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>Output</div>
                <pre className={styles.codeBlock}>
                  {JSON.stringify(activeStep.output, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="placeholder-panel" style={{ minHeight: 300 }}>
              <div className="placeholder-panel-title">No step selected</div>
              <div>Click a step in the timeline to inspect it.</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab section */}
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
        <div className="placeholder-panel">
          <div className="placeholder-panel-title">Reasoning Graph</div>
          <div>A visual DAG of step dependencies will render here.</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {trace.steps.length} nodes · root:{' '}
            <span className="text-mono">{trace.rootStepId.slice(0, 12)}…</span>
          </div>
        </div>
      )}

      {activeTab === 'diff' && (
        <div className="placeholder-panel">
          <div className="placeholder-panel-title">Prompt Diff Viewer</div>
          <div>
            Side-by-side diff of prompt mutations across LLM steps will render here.
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {llmStepCount} LLM step{llmStepCount !== 1 ? 's' : ''} detected
          </div>
        </div>
      )}
    </div>
  );
}
