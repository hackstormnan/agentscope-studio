interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  /** Applies error colour to the value (e.g. error rate when > threshold). */
  alert?: boolean;
}

export function StatCard({ label, value, sub, alert }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value${alert ? ' stat-card-value--error' : ''}`}>
        {value}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
