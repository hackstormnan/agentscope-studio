import { useState, useEffect } from 'react';
import { MetricCard }  from '../components/ui/MetricCard';
import { EmptyState }  from '../components/ui/EmptyState';
import { ErrorState }  from '../components/ui/ErrorState';
import { Button }      from '../components/ui/Button';
import { TraceTable }  from '../features/traces/TraceTable';
import { TraceFilters } from '../features/traces/TraceFilters';
import { useTraces }   from '../features/traces/useTraces';
import { QueryBuilderPanel } from '../components/query/QueryBuilderPanel';
import { QuerySummary }      from '../components/query/QuerySummary';
import { useQueryBuilder }   from '../features/query/useQueryBuilder';
import { listEvaluations }   from '../features/evaluation/api';
import type { EvaluationResult } from '../features/evaluation/types';
import styles from './TracesDashboardPage.module.css';
import qStyles from '../components/query/QueryBuilderPanel.module.css';

type DashboardMode = 'browse' | 'query';

function fmtRate(rate: number) { return `${(rate * 100).toFixed(1)}%`; }
function fmtMs(ms: number)     { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`; }
function fmtNum(n: number)     { return Math.round(n).toLocaleString(); }

function useEvalSummary() {
  const [evals,   setEvals]   = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEvaluations(100)
      .then(setEvals)
      .catch(() => setEvals([]))
      .finally(() => setLoading(false));
  }, []);

  const total        = evals.length;
  const withErrors   = evals.filter((e) => e.issues.some((i) => i.severity === 'error')).length;
  const withWarnings = evals.filter(
    (e) => !e.issues.some((i) => i.severity === 'error') && e.issues.some((i) => i.severity === 'warning'),
  ).length;
  const totalIssues  = evals.reduce((sum, e) => sum + e.issues.length, 0);

  return { total, withErrors, withWarnings, totalIssues, loading };
}

export default function TracesDashboardPage() {
  const [mode, setMode] = useState<DashboardMode>('browse');

  const browse = useTraces();
  const query  = useQueryBuilder();
  const evalSummary = useEvalSummary();

  // When switching to browse mode, keep query state intact so the user can
  // switch back without losing their filters.

  return (
    <div className="page">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="page-title">Traces</div>
          <div className="page-subtitle">All recorded agent sessions</div>
        </div>
        <Button variant="secondary" onClick={browse.refresh}>
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      {browse.statsError ? (
        <div className="mb-8">
          <ErrorState
            title="Failed to load stats"
            message={browse.statsError}
            onRetry={browse.refresh}
          />
        </div>
      ) : (
        <div className="grid-4 mb-8">
          <MetricCard
            label="Total Traces"
            loading={browse.statsLoading}
            value={browse.stats ? browse.stats.totalTraces.toLocaleString() : '—'}
            sub={browse.stats ? `${browse.stats.last24hTraces ?? 0} in last 24h` : undefined}
          />
          <MetricCard
            label="Error Rate"
            loading={browse.statsLoading}
            value={browse.stats ? fmtRate(browse.stats.errorRate) : '—'}
            sub={browse.stats ? `${browse.stats.errorTraces} traces with errors` : undefined}
            variant={!!browse.stats && browse.stats.errorRate > 0.1 ? 'error' : 'default'}
          />
          <MetricCard
            label="Avg Latency"
            loading={browse.statsLoading}
            value={browse.stats ? fmtMs(browse.stats.avgLatency) : '—'}
            sub="Per trace"
            variant="accent"
          />
          <MetricCard
            label="Avg Tokens"
            loading={browse.statsLoading}
            value={browse.stats ? fmtNum(browse.stats.avgTokens) : '—'}
            sub="Per trace"
          />
        </div>
      )}

      {/* Evaluation summary */}
      <div className={styles.evalSummary}>
        <span className={styles.evalSummaryLabel}>Evaluations</span>
        <div className={styles.evalSummaryStats}>
          <span className={styles.evalStat}>
            <span className={styles.evalStatValue}>
              {evalSummary.loading ? '…' : evalSummary.total}
            </span>
            <span className={styles.evalStatLabel}>total</span>
          </span>
          <span className={styles.evalDivider} />
          <span className={styles.evalStat}>
            <span
              className={styles.evalStatValue}
              style={evalSummary.withErrors > 0 ? { color: 'var(--error)' } : undefined}
            >
              {evalSummary.loading ? '…' : evalSummary.withErrors}
            </span>
            <span className={styles.evalStatLabel}>with errors</span>
          </span>
          <span className={styles.evalDivider} />
          <span className={styles.evalStat}>
            <span
              className={styles.evalStatValue}
              style={evalSummary.withWarnings > 0 ? { color: 'var(--warning)' } : undefined}
            >
              {evalSummary.loading ? '…' : evalSummary.withWarnings}
            </span>
            <span className={styles.evalStatLabel}>with warnings</span>
          </span>
          <span className={styles.evalDivider} />
          <span className={styles.evalStat}>
            <span className={styles.evalStatValue}>
              {evalSummary.loading ? '…' : evalSummary.totalIssues}
            </span>
            <span className={styles.evalStatLabel}>total issues</span>
          </span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className={qStyles.modeTabs}>
        <button
          type="button"
          className={`${qStyles.modeTab}${mode === 'browse' ? ' ' + qStyles.modeTabActive : ''}`}
          onClick={() => setMode('browse')}
        >
          Browse
        </button>
        <button
          type="button"
          className={`${qStyles.modeTab}${mode === 'query' ? ' ' + qStyles.modeTabActive : ''}`}
          onClick={() => setMode('query')}
        >
          Query Builder
        </button>
      </div>

      {/* ── Browse mode ─────────────────────────────────────────────────── */}
      {mode === 'browse' && (
        <>
          <div className="mb-4">
            <TraceFilters value={browse.filters} onChange={browse.setFilters} />
          </div>

          {browse.tracesError ? (
            <ErrorState
              title="Failed to load traces"
              message={browse.tracesError}
              onRetry={browse.refresh}
            />
          ) : browse.tracesLoading ? (
            <div className={styles.skeletonList}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
              ))}
            </div>
          ) : browse.traces.length === 0 ? (
            <EmptyState
              icon="◎"
              title="No traces yet"
              description="Run an agent or use the tracer SDK to capture your first trace. Results appear here automatically."
            />
          ) : (
            <>
              <TraceTable traces={browse.traces} />
              {browse.hasMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="secondary" onClick={browse.loadMore}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Query Builder mode ───────────────────────────────────────────── */}
      {mode === 'query' && (
        <>
          <QueryBuilderPanel builder={query} />

          {query.error && (
            <div className="mb-4">
              <ErrorState
                title="Query failed"
                message={query.error}
                onRetry={query.execute}
              />
            </div>
          )}

          {query.hasRun && !query.error && (
            <>
              <QuerySummary
                filters={query.filters}
                sort={query.sort}
                resultCount={query.items.length}
                loading={query.loading}
              />

              {query.loading ? (
                <div className={styles.skeletonList}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
                  ))}
                </div>
              ) : query.items.length === 0 ? (
                <EmptyState
                  icon="⊘"
                  title="No results"
                  description="No traces matched your query. Try adjusting the filters or removing some constraints."
                />
              ) : (
                <>
                  <TraceTable traces={query.items} />
                  {query.hasMore && (
                    <div className="flex justify-center mt-6">
                      <Button variant="secondary" onClick={query.loadMore}>
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!query.hasRun && !query.loading && (
            <EmptyState
              icon="⌕"
              title="Build your query"
              description="Add filters and click Run Query to search across all traces."
            />
          )}
        </>
      )}
    </div>
  );
}
