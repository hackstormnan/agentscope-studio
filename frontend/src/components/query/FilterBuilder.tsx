import type { DraftFilter, FieldKind } from '../../features/query/types';
import {
  FIELD_KIND,
  FIELD_LABELS,
  FIELD_OPERATORS,
  OPERATOR_LABELS,
} from '../../features/query/types';
import styles from './QueryBuilderPanel.module.css';

const ALL_FIELDS = Object.keys(FIELD_LABELS) as DraftFilter['field'][];

interface FilterBuilderProps {
  filter:   DraftFilter;
  onChange: (patch: Partial<DraftFilter>) => void;
  onRemove: () => void;
}

export function FilterBuilder({ filter, onChange, onRemove }: FilterBuilderProps) {
  const kind      = FIELD_KIND[filter.field];
  const operators = FIELD_OPERATORS[filter.field];

  return (
    <div className={styles.filterRow}>
      {/* Field selector */}
      <select
        className={`${styles.filterSelect} ${styles.fieldSelect}`}
        value={filter.field}
        onChange={(e) => onChange({ field: e.target.value as DraftFilter['field'] })}
      >
        {ALL_FIELDS.map((f) => (
          <option key={f} value={f}>{FIELD_LABELS[f]}</option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        className={`${styles.filterSelect} ${styles.opSelect}`}
        value={filter.operator}
        onChange={(e) => onChange({ operator: e.target.value as DraftFilter['operator'] })}
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* Value input — rendered based on field type */}
      <ValueInput kind={kind} value={filter.value} onChange={(v) => onChange({ value: v })} />

      {/* Remove */}
      <button className={styles.removeBtn} onClick={onRemove} title="Remove filter" type="button">
        ×
      </button>
    </div>
  );
}

// ── Value input variants ───────────────────────────────────────────────────

interface ValueInputProps {
  kind:     FieldKind;
  value:    string;
  onChange: (v: string) => void;
}

function ValueInput({ kind, value, onChange }: ValueInputProps) {
  if (kind === 'boolean') {
    return (
      <select
        className={`${styles.filterSelect} ${styles.boolSelect}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (kind === 'numeric') {
    return (
      <input
        type="number"
        className={styles.filterInput}
        value={value}
        placeholder="Number…"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (kind === 'date') {
    return (
      <input
        type="text"
        className={styles.filterInput}
        value={value}
        placeholder="ISO date, e.g. 2024-01-15T10:00:00.000Z"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // string
  return (
    <input
      type="text"
      className={styles.filterInput}
      value={value}
      placeholder="Value…"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
