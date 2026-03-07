import { useState, useEffect } from 'react';
import type { AgentTrace } from '../../lib/api';
import { getTraceAnalysis } from '../../features/analysis/api';
import type { TraceAnalysisResult } from '../../features/analysis/types';
import styles from './PerformancePanel.module.css';

interface PerformancePanelProps {
  trace: AgentTrace;
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

export function PerformancePanel({ trace }: PerformancePanelProps) {
  const [analysis, setAnalysis] = useState<TraceAnalysisResult | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTraceAnalysis(trace.traceId)
      .then(setAnalysis)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load analysis'))
      .finally(() => setLoading(false));
  }, [trace.traceId]);

  if (loading) {
    return (
      <div className={styles.grid}>
        {[1, 0.7, 0.45, 0.25].map((opacity, i) => (
          <div key={i} className="skeleton" style={{ height: 76, borderRadius: 8, opacity }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyNote}>Failed to load performance data: {error}</div>
    );
  }

  if (!analysis) {
    return <div className={styles.emptyNote}>No analysis data available.</div>;
  }

  // Collect outlier step IDs with their tags
  const allOutliers: Array<{ stepId: string; tags: Array<'slow' | 'heavy'> }> = [];
  const outlierSet = new Set<string>();
  for (const id of analysis.latencyOutliers ?? []) {
    outlierSet.add(id);
    allOutliers.push({ stepId: id, tags: ['slow'] });
  }
  for (const id of analysis.tokenHeavySteps ?? []) {
    const existing = allOutliers.find((o) => o.stepId === id);
    if (existing) {
      existing.tags.push('heavy');
    } else {
      allOutliers.push({ stepId: id, tags: ['heavy'] });
    }
  }

  return (
    <div>
      {/* Metric cards */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Latency</div>
          <div className={styles.cardValue}>{fmtMs(analysis.totalLatency)}</div>
          <div className={styles.cardSub}>End-to-end trace duration</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Avg Step Latency</div>
          <div className={styles.cardValue}>
            {analysis.averageStepLatency != null ? fmtMs(analysis.averageStepLatency) : '—'}
          </div>
          <div className={styles.cardSub}>Per step, across {trace.steps.length} steps</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Tokens</div>
          <div className={styles.cardValue}>
            {analysis.totalTokens != null ? fmtTokens(analysis.totalTokens) : '—'}
          </div>
          <div className={styles.cardSub}>Prompt + completion tokens</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Estimated Cost</div>
          <div className={styles.cardValue}>
            {analysis.estimatedCost != null ? fmtCost(analysis.estimatedCost) : '—'}
          </div>
          <div className={styles.cardSub}>Heuristic ($0.000002 / token)</div>
        </div>
      </div>

      {/* Slowest step */}
      {analysis.slowestStepId && (
        <>
          <div className={styles.sectionHeader}>Slowest Step</div>
          <div className={styles.outlierList} style={{ marginBottom: 20 }}>
            <div className={`${styles.outlierRow} ${styles.outlierRowSlow}`}>
              <span className={styles.outlierStepId}>{analysis.slowestStepId}</span>
              {(() => {
                const s = trace.steps.find((s) => s.stepId === analysis.slowestStepId);
                return s ? (
                  <span className={`${styles.outlierTag} ${styles.tagSlow}`}>
                    {fmtMs(s.latency)}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        </>
      )}

      {/* Outlier steps */}
      {allOutliers.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Notable Steps</div>
          <div className={styles.outlierList}>
            {allOutliers.map(({ stepId, tags }) => (
              <div
                key={stepId}
                className={`${styles.outlierRow} ${
                  tags.includes('slow') ? styles.outlierRowSlow : styles.outlierRowHeavy
                }`}
              >
                <span className={styles.outlierStepId}>{stepId}</span>
                {tags.includes('slow') && (
                  <span className={`${styles.outlierTag} ${styles.tagSlow}`}>slow</span>
                )}
                {tags.includes('heavy') && (
                  <span className={`${styles.outlierTag} ${styles.tagHeavy}`}>token-heavy</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {allOutliers.length === 0 && !analysis.slowestStepId && (
        <div className={styles.emptyNote}>No performance issues detected.</div>
      )}
    </div>
  );
}
