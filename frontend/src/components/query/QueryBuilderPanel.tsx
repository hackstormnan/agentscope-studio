import { Button } from '../ui/Button';
import { FilterBuilder } from './FilterBuilder';
import { SortSelector } from './SortSelector';
import type { UseQueryBuilderResult } from '../../features/query/useQueryBuilder';
import styles from './QueryBuilderPanel.module.css';

interface QueryBuilderPanelProps {
  builder: UseQueryBuilderResult;
}

export function QueryBuilderPanel({ builder }: QueryBuilderPanelProps) {
  const {
    filters, addFilter, removeFilter, updateFilter,
    sort, setSort,
    loading, execute, reset,
  } = builder;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Query Builder</span>
        <div className={styles.panelActions}>
          <Button variant="ghost" size="sm" onClick={reset} disabled={loading}>
            Clear
          </Button>
        </div>
      </div>

      {/* Body — filters + sort */}
      <div className={styles.panelBody}>
        {/* Filter rows */}
        <div className={styles.filterList}>
          {filters.length === 0 ? (
            <span className={styles.emptyFilters}>No filters — returns all traces.</span>
          ) : (
            filters.map((f) => (
              <FilterBuilder
                key={f.id}
                filter={f}
                onChange={(patch) => updateFilter(f.id, patch)}
                onRemove={() => removeFilter(f.id)}
              />
            ))
          )}
        </div>

        {/* Sort */}
        <SortSelector sort={sort} onChange={setSort} />
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={addFilter} type="button">
          + Add Filter
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={execute}
          disabled={loading}
        >
          {loading ? 'Running…' : 'Run Query →'}
        </Button>
      </div>
    </div>
  );
}
