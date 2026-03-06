export interface FiltersValue {
  sessionId: string;
  hasError: '' | 'true' | 'false';
}

interface TraceFiltersProps {
  value: FiltersValue;
  onChange: (value: FiltersValue) => void;
}

export function TraceFilters({ value, onChange }: TraceFiltersProps) {
  return (
    <div className="flex gap-3 items-center">
      <input
        type="text"
        className="input"
        placeholder="Filter by session ID…"
        value={value.sessionId}
        onChange={(e) => onChange({ ...value, sessionId: e.target.value })}
        style={{ maxWidth: 280 }}
      />
      <select
        className="select"
        value={value.hasError}
        onChange={(e) =>
          onChange({ ...value, hasError: e.target.value as FiltersValue['hasError'] })
        }
        style={{ width: 160 }}
      >
        <option value="">All statuses</option>
        <option value="false">Success only</option>
        <option value="true">Errors only</option>
      </select>
    </div>
  );
}
