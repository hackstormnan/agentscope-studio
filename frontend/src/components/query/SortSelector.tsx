import type { TraceSort } from '../../features/query/types';
import { SORT_FIELD_LABELS } from '../../features/query/types';
import styles from './QueryBuilderPanel.module.css';

const SORT_FIELDS = Object.keys(SORT_FIELD_LABELS) as TraceSort['field'][];

interface SortSelectorProps {
  sort:     TraceSort;
  onChange: (sort: TraceSort) => void;
}

export function SortSelector({ sort, onChange }: SortSelectorProps) {
  return (
    <div className={styles.sortRow}>
      <span className={styles.sortLabel}>Sort</span>

      <select
        className={`${styles.filterSelect} ${styles.fieldSelect}`}
        value={sort.field}
        onChange={(e) => onChange({ ...sort, field: e.target.value as TraceSort['field'] })}
      >
        {SORT_FIELDS.map((f) => (
          <option key={f} value={f}>{SORT_FIELD_LABELS[f]}</option>
        ))}
      </select>

      <select
        className={`${styles.filterSelect} ${styles.opSelect}`}
        value={sort.direction}
        onChange={(e) => onChange({ ...sort, direction: e.target.value as TraceSort['direction'] })}
      >
        <option value="desc">Desc ↓</option>
        <option value="asc">Asc ↑</option>
      </select>
    </div>
  );
}
