import type { ReactNode, CSSProperties } from 'react';
import { EmptyState } from './EmptyState';

// ── Column definition ──────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render a cell given the row datum. */
  render: (row: T, index: number) => ReactNode;
  /** Optional th style. */
  thStyle?: CSSProperties;
  /** Optional td style (or a function returning per-row style). */
  tdStyle?: CSSProperties | ((row: T) => CSSProperties);
}

// ── Props ──────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Key extractor for React reconciliation. */
  rowKey: (row: T, index: number) => string | number;
  /** Rendered when data is empty (defaults to a generic EmptyState). */
  empty?: ReactNode;
  /** Called when a row is clicked. */
  onRowClick?: (row: T) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * DataTable — generic typed table primitive.
 * Removes repeated table boilerplate across feature pages.
 *
 * Usage:
 *   const cols: Column<TraceSummary>[] = [
 *     { key: 'id',      header: 'Trace ID',  render: (r) => r.traceId.slice(0,16) },
 *     { key: 'latency', header: 'Latency',   render: (r) => fmtMs(r.totalLatency) },
 *   ];
 *   <DataTable columns={cols} data={traces} rowKey={(r) => r.traceId} />
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  empty,
  onRowClick,
  className,
  style,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState title="No data" description="Nothing to show yet." />
        )}
      </>
    );
  }

  return (
    <div className={`table-wrapper ${className ?? ''}`} style={style}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.thStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col) => {
                const tdStyle =
                  typeof col.tdStyle === 'function'
                    ? col.tdStyle(row)
                    : col.tdStyle;
                return (
                  <td key={col.key} style={tdStyle}>
                    {col.render(row, i)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
