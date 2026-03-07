import { randomUUID } from 'crypto';

/** Creates a unique, prefixed evaluation ID. */
export function createEvaluationId(): string {
  return `eval_${randomUUID()}`;
}

/**
 * Determines whether a value is "empty" for the purposes of the
 * STEP_MISSING_OUTPUT rule:
 *   - null or undefined
 *   - empty string
 *   - empty object  {}
 *   - empty array   []
 */
export function isOutputEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string')  return value.trim().length === 0;
  if (Array.isArray(value))       return value.length === 0;
  if (typeof value === 'object')  return Object.keys(value as object).length === 0;
  return false;
}
