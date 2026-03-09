/**
 * CI-friendly output helpers.
 *
 * Produces plain-text logs that are readable both in a terminal and in CI
 * log viewers (GitHub Actions, Jenkins, etc.).  No colour codes — keeps
 * output clean when piped or archived.
 */

export function printSection(title: string): void {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

export function printKV(key: string, value: string | number): void {
  const paddedKey = `${key}:`.padEnd(22);
  console.log(`  ${paddedKey}${value}`);
}

export function printWarn(msg: string): void {
  console.warn(`  ⚠  ${msg}`);
}

export function printError(msg: string): void {
  console.error(`  ✗  ${msg}`);
}

/** Format an optional number with a fallback. */
export function fmt(value: number | undefined, fallback = '—'): string {
  return value !== undefined ? String(value) : fallback;
}

/** Format a ratio (0–1) as a percentage string, e.g. 0.94 → "94.0%". */
export function fmtPct(value: number | undefined, fallback = '—'): string {
  return value !== undefined ? `${(value * 100).toFixed(1)}%` : fallback;
}

/** Format a signed delta with an explicit "+" prefix, e.g. 0.12 → "+0.12". */
export function fmtDelta(value: number | undefined, decimals = 2): string {
  if (value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/** Format a percentage delta, e.g. -6.3 → "-6.3%". */
export function fmtPctDelta(value: number | undefined): string {
  if (value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
