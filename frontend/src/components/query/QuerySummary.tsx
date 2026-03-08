import type { DraftFilter, TraceSort } from '../../features/query/types';
import {
  FIELD_LABELS,
  OPERATOR_LABELS,
  SORT_FIELD_LABELS,
  isValidDraft,
} from '../../features/query/types';
import styles from './QueryBuilderPanel.module.css';

interface QuerySummaryProps {
  filters:     DraftFilter[];
  sort:        TraceSort;
  resultCount: number;
  loading:     boolean;
}

export function QuerySummary({ filters, sort, resultCount, loading }: QuerySummaryProps) {
  const activeFilters = filters.filter(isValidDraft);

  return (
    <div className={styles.summary}>
      <span className={styles.summaryLabel}>Applied</span>

      {activeFilters.length === 0 && (
        <span className={styles.summaryChip}>no filters</span>
      )}

      {activeFilters.map((f) => (
        <span key={f.id} className={styles.summaryChip}>
          {FIELD_LABELS[f.field]} {OPERATOR_LABELS[f.operator]} {f.value}
        </span>
      ))}

      <span className={styles.summarySep} />

      <span className={styles.summarySort}>
        {sort.direction === 'desc' ? '↓' : '↑'} {SORT_FIELD_LABELS[sort.field]}
      </span>

      <span className={styles.summaryCount}>
        {loading ? 'Running…' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
