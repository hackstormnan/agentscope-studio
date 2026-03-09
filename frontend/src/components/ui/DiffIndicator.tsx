import type { CSSProperties } from 'react';

type ChangeDirection = 'increase' | 'decrease' | 'none';

interface DiffIndicatorProps {
  /** Original / baseline value (shown on the left). */
  before: string | number;
  /** New value (shown on the right). */
  after: string | number;
  /**
   * Whether an increase is considered positive, negative, or neutral.
   * Controls the colour of the arrow.
   *  - 'positive'  → increase = green, decrease = red
   *  - 'negative'  → increase = red,   decrease = green  (e.g. latency, errors)
   *  - 'neutral'   → always grey arrow
   */
  direction?: 'positive' | 'negative' | 'neutral';
  style?: CSSProperties;
}

function detectChange(before: string | number, after: string | number): ChangeDirection {
  const b = Number(before);
  const a = Number(after);
  if (isNaN(b) || isNaN(a) || b === a) return 'none';
  return a > b ? 'increase' : 'decrease';
}

function arrowColor(change: ChangeDirection, direction: 'positive' | 'negative' | 'neutral'): string {
  if (change === 'none' || direction === 'neutral') return 'var(--text-subtle)';
  if (direction === 'positive') {
    return change === 'increase' ? 'var(--success)' : 'var(--error)';
  }
  // negative polarity (higher = worse)
  return change === 'increase' ? 'var(--error)' : 'var(--success)';
}

const ARROW: Record<ChangeDirection, string> = {
  increase: '↑',
  decrease: '↓',
  none:     '→',
};

/**
 * DiffIndicator — shows a before → after transition for a numeric or string
 * value, with a coloured directional arrow.
 *
 * Usage:
 *   <DiffIndicator before={run.latency} after={replayRun.latency} direction="negative" />
 *   <DiffIndicator before="230ms" after="180ms" direction="negative" />
 */
export function DiffIndicator({ before, after, direction = 'neutral', style }: DiffIndicatorProps) {
  const change = detectChange(before, after);
  const color  = arrowColor(change, direction);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{before}</span>
      <span style={{ color }}>{ARROW[change]}</span>
      <span style={{ color: change === 'none' ? 'var(--text-muted)' : 'var(--text)' }}>{after}</span>
    </span>
  );
}
