import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { TraceTable } from '../features/traces/TraceTable';
import { TraceFilters } from '../features/traces/TraceFilters';
import { useTraces } from '../features/traces/useTraces';
import styles from './TracesDashboardPage.module.css';

function fmtRate(rate: number) { return `${(rate * 100).toFixed(1)}%`; }
function fmtMs(ms: number)     { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`; }
function fmtNum(n: number)     { return Math.round(n).toLocaleString(); }

export default function TracesDashboardPage() {
  const {
    stats, statsLoading, statsError,
    traces, tracesLoading, tracesError,
    hasMore, filters, setFilters,
    refresh, loadMore,
  } = useTraces();

  return (
    <div className="page">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="page-title">Traces</div>
          <div className="page-subtitle">All recorded agent sessions</div>
        </div>
        <Button variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      {statsError ? (
        <div className="mb-8">
          <ErrorState
            title="Failed to load stats"
            message={statsError}
            onRetry={refresh}
          />
        </div>
      ) : (
        <div className="grid-4 mb-8">
          <StatCard
            label="Total Traces"
            loading={statsLoading}
            value={stats ? stats.totalTraces.toLocaleString() : '—'}
            sub={stats ? `${stats.last24hTraces ?? 0} in last 24h` : undefined}
          />
          <StatCard
            label="Error Rate"
            loading={statsLoading}
            value={stats ? fmtRate(stats.errorRate) : '—'}
            sub={stats ? `${stats.errorTraces} traces with errors` : undefined}
            alert={!!stats && stats.errorRate > 0.1}
          />
          <StatCard
            label="Avg Latency"
            loading={statsLoading}
            value={stats ? fmtMs(stats.avgLatency) : '—'}
            sub="Per trace"
          />
          <StatCard
            label="Avg Tokens"
            loading={statsLoading}
            value={stats ? fmtNum(stats.avgTokens) : '—'}
            sub="Per trace"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <TraceFilters value={filters} onChange={setFilters} />
      </div>

      {/* Trace list */}
      {tracesError ? (
        <ErrorState
          title="Failed to load traces"
          message={tracesError}
          onRetry={refresh}
        />
      ) : tracesLoading ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
          ))}
        </div>
      ) : traces.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No traces yet"
          description="Run an agent or use the tracer SDK to capture your first trace. Results appear here automatically."
        />
      ) : (
        <>
          <TraceTable traces={traces} />
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button variant="secondary" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
