import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard }    from '../components/ui/MetricCard';
import { getTraceStats } from '../lib/api';
import type { DashboardStats } from '../lib/api';
import styles from './HomePage.module.css';

// ── Platform nav sections ─────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    icon:  '◈',
    title: 'Trace Explorer',
    desc:  'Browse every recorded agent session. Filter, query, and drill into individual steps with full I/O payloads.',
    to:    '/traces',
  },
  {
    icon:  '⬡',
    title: 'Experiments',
    desc:  'Compare prompt versions and model configs across dataset runs. Surface regressions with side-by-side metrics.',
    to:    '/experiments',
  },
  {
    icon:  '≡',
    title: 'Datasets',
    desc:  'Review batch replay runs — success rates, error counts, and per-item outcomes across evaluation datasets.',
    to:    '/datasets',
  },
  {
    icon:  '◎',
    title: 'Evaluation',
    desc:  'Rule-based evaluation results, quality scores, and issue trends. Detect anomalies before production.',
    to:    '/evaluation',
  },
  {
    icon:  '⊛',
    title: 'System Insights',
    desc:  'Latency percentiles, token budgets, and error rates across all traces. Identify slow and error-prone flows.',
    to:    '/insights',
  },
] as const;

function fmtMs(ms: number): string {
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTraceStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const isHealthy = stats ? stats.errorRate <= 0.1 : true;

  return (
    <div className="page">
      {/* Dashboard header */}
      <div className={styles.dashHeader}>
        <div className={styles.dashTitle}>AgentScope Studio</div>
        <div className={styles.dashSub}>Observability platform for AI agents</div>
      </div>

      {/* Health banner */}
      {!loading && stats && (
        <div className={`${styles.healthRow}${!isHealthy ? ' ' + styles.healthRowBad : ''}`}>
          <span>{isHealthy ? '✓' : '⚠'}</span>
          <span>
            {isHealthy
              ? `System healthy · ${stats.errorRate === 0 ? 'No errors' : `${(stats.errorRate * 100).toFixed(1)}% error rate`}`
              : `Elevated error rate: ${(stats.errorRate * 100).toFixed(1)}% · ${stats.errorTraces} error traces`}
          </span>
        </div>
      )}

      {/* Live KPI strip */}
      <div className={styles.metricStrip}>
        <MetricCard
          label="Total Traces"
          value={stats ? stats.totalTraces.toLocaleString() : '—'}
          sub={stats ? `${stats.last24hTraces ?? 0} in last 24 h` : undefined}
          loading={loading}
        />
        <MetricCard
          label="Error Rate"
          value={stats ? `${(stats.errorRate * 100).toFixed(1)}%` : '—'}
          sub={stats ? `${stats.errorTraces} error traces` : undefined}
          variant={stats && stats.errorRate > 0.1 ? 'error' : 'default'}
          loading={loading}
        />
        <MetricCard
          label="Avg Latency"
          value={stats ? fmtMs(stats.avgLatency) : '—'}
          sub="per trace"
          variant="accent"
          loading={loading}
        />
        <MetricCard
          label="Avg Tokens"
          value={stats ? Math.round(stats.avgTokens).toLocaleString() : '—'}
          sub="per trace"
          loading={loading}
        />
      </div>

      {/* Platform navigation grid */}
      <div className="section-label" style={{ marginBottom: 12 }}>Platform</div>
      <div className={styles.navGrid}>
        {NAV_SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className={styles.navCard}>
            <div className={styles.navCardIcon}>{s.icon}</div>
            <div className={styles.navCardTitle}>{s.title}</div>
            <div className={styles.navCardDesc}>{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
