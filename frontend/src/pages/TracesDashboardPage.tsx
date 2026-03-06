import { useEffect, useState } from 'react';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { TraceTable } from '../features/traces/TraceTable';
import { TraceFilters } from '../features/traces/TraceFilters';
import type { FiltersValue } from '../features/traces/TraceFilters';
import { getTraceStats, listTraces } from '../lib/api';
import type { DashboardStats, TraceSummary } from '../lib/api';
import styles from './TracesDashboardPage.module.css';

function fmtRate(rate: number)    { return `${(rate * 100).toFixed(1)}%`; }
function fmtMs(ms: number)        { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`; }
function fmtNum(n: number)        { return Math.round(n).toLocaleString(); }

export default function TracesDashboardPage() {
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [traces,     setTraces]     = useState<TraceSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState<FiltersValue>({ sessionId: '', hasError: '' });

  useEffect(() => {
    getTraceStats().then(setStats);
  }, []);

  useEffect(() => {
    setLoading(true);
    listTraces({
      limit: 25,
      sessionId: filters.sessionId || undefined,
      hasError:  filters.hasError === '' ? undefined : filters.hasError === 'true',
    })
      .then(({ items, nextCursor: nc }) => {
        setTraces(items);
        setNextCursor(nc);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  async function loadMore() {
    if (!nextCursor) return;
    const { items, nextCursor: nc } = await listTraces({
      limit:     25,
      cursor:    nextCursor,
      sessionId: filters.sessionId || undefined,
      hasError:  filters.hasError === '' ? undefined : filters.hasError === 'true',
    });
    setTraces((prev) => [...prev, ...items]);
    setNextCursor(nc);
  }

  return (
    <div className="page">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="page-title">Traces</div>
          <div className="page-subtitle">All recorded agent sessions</div>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-8">
        <StatCard
          label="Total Traces"
          value={stats ? stats.totalTraces.toLocaleString() : '—'}
          sub={stats ? `${stats.last24hTraces ?? 0} in last 24h` : undefined}
        />
        <StatCard
          label="Error Rate"
          value={stats ? fmtRate(stats.errorRate) : '—'}
          sub={stats ? `${stats.errorTraces} traces with errors` : undefined}
          alert={!!stats && stats.errorRate > 0.1}
        />
        <StatCard
          label="Avg Latency"
          value={stats ? fmtMs(stats.avgLatency) : '—'}
          sub="Per trace"
        />
        <StatCard
          label="Avg Tokens"
          value={stats ? fmtNum(stats.avgTokens) : '—'}
          sub="Per trace"
        />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <TraceFilters value={filters} onChange={setFilters} />
      </div>

      {/* Trace list */}
      {loading ? (
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
          {nextCursor && (
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
