interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  /** Applies error colour to the value (e.g. error rate when > threshold). */
  alert?: boolean;
  /** Shows a shimmer skeleton instead of the value while data loads. */
  loading?: boolean;
}

export function StatCard({ label, value, sub, alert, loading }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      {loading ? (
        <div className="stat-card-skeleton skeleton" />
      ) : (
        <div className={`stat-card-value${alert ? ' stat-card-value--error' : ''}`}>
          {value}
        </div>
      )}
      {!loading && sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
