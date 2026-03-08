import styles from './Experiments.module.css';

/**
 * Whether a higher or lower value is considered an improvement.
 * 'neutral' fields (e.g. datasetSize) show no colour indicator.
 */
export type MetricDirection = 'higher-better' | 'lower-better' | 'neutral';

interface MetricComparisonCardProps {
  label:     string;
  valueA:    number | undefined;
  valueB:    number | undefined;
  direction: MetricDirection;
  format:    (v: number) => string;
}

export function MetricComparisonCard({
  label,
  valueA,
  valueB,
  direction,
  format,
}: MetricComparisonCardProps) {
  const diff =
    valueA !== undefined && valueB !== undefined ? valueB - valueA : undefined;

  const diffClass = getDiffClass(diff, direction);
  const diffLabel = formatDiff(diff, format);

  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <MetricVal value={valueA} format={format} />
      <MetricVal value={valueB} format={format} />
      <span className={`${styles.metricDiff} ${diffClass}`}>{diffLabel}</span>
    </div>
  );
}

function MetricVal({
  value,
  format,
}: {
  value:  number | undefined;
  format: (v: number) => string;
}) {
  if (value === undefined) {
    return <span className={styles.metricValueEmpty}>—</span>;
  }
  return <span className={styles.metricValue}>{format(value)}</span>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDiffClass(diff: number | undefined, direction: MetricDirection): string {
  if (diff === undefined || diff === 0 || direction === 'neutral') {
    return styles.diffNeutral;
  }
  // improvement: diff positive for higher-better, diff negative for lower-better
  const isImprovement =
    (direction === 'higher-better' && diff > 0) ||
    (direction === 'lower-better'  && diff < 0);

  return isImprovement ? styles.diffImprove : styles.diffRegress;
}

function formatDiff(diff: number | undefined, format: (v: number) => string): string {
  if (diff === undefined) return '—';
  if (diff === 0)         return '±0';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${format(diff)}`;
}
