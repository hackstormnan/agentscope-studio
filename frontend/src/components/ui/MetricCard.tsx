import type { ReactNode } from 'react';

type MetricVariant = 'default' | 'accent' | 'success' | 'error' | 'warning';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  variant?: MetricVariant;
  loading?: boolean;
  /** Optional small indicator shown below the value (e.g. "+12% vs last week"). */
  trend?: ReactNode;
}

const VALUE_CLASS: Record<MetricVariant, string> = {
  default:  'stat-card-value',
  accent:   'stat-card-value stat-card-value--accent',
  success:  'stat-card-value stat-card-value--success',
  error:    'stat-card-value stat-card-value--error',
  warning:  'stat-card-value stat-card-value--warning',
};

/**
 * MetricCard — a single KPI tile used in metric strips across the app.
 * Extends StatCard with explicit color variants and an optional trend line.
 *
 * Usage:
 *   <MetricCard label="Avg Latency" value="230ms" sub="across all traces" variant="accent" />
 */
export function MetricCard({ label, value, sub, variant = 'default', loading, trend }: MetricCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      {loading ? (
        <div className="stat-card-skeleton skeleton" />
      ) : (
        <div className={VALUE_CLASS[variant]}>{value}</div>
      )}
      {!loading && sub   && <div className="stat-card-sub">{sub}</div>}
      {!loading && trend && (
        <div className="stat-card-sub" style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {trend}
        </div>
      )}
    </div>
  );
}
