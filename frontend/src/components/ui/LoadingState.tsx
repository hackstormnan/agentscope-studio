interface LoadingStateProps {
  /** Number of skeleton rows to render (default: 5). */
  rows?: number;
  /** Height of each row in px (default: 44). */
  rowHeight?: number;
}

/**
 * Page-level loading skeleton. Renders N shimmer rows with a subtle
 * fade so the bottom rows feel like they're trailing off.
 */
export function LoadingState({ rows = 5, rowHeight = 44 }: LoadingStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: rowHeight,
            borderRadius: 6,
            opacity: Math.max(0.25, 1 - i * 0.15),
          }}
        />
      ))}
    </div>
  );
}
