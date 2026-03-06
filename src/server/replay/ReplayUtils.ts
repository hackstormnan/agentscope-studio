import { randomUUID } from 'crypto';
import type { AgentTrace, AgentStep } from '../../core/trace-model';
import type { ReplayOverrides } from '../../core/replay-model';

// ── ID factory ─────────────────────────────────────────────────────────────────

/** Creates a unique, prefixed replay ID. */
export function createReplayId(): string {
  return `replay_${randomUUID()}`;
}

// ── Step lookup ────────────────────────────────────────────────────────────────

/** Returns the step with the given ID, or null if not found. */
export function findStepById(trace: AgentTrace, stepId: string): AgentStep | null {
  return trace.steps.find((s) => s.stepId === stepId) ?? null;
}

// ── Produced step builder ──────────────────────────────────────────────────────

/**
 * Builds the `producedStep` payload stored on a ReplayResult.
 *
 * Override strategy — sequential merge:
 *   1. Start from the original step's input as a shallow base.
 *   2. If `overridePrompt` is set, write it as `replayedInput.prompt`.
 *      This is a named field rather than replacing the whole input so that
 *      surrounding fields (model, tools, etc.) are preserved.
 *   3. If `overrideInput` is set, it is spread (if object) or assigned (if
 *      primitive / array) over the accumulated replayedInput, giving it the
 *      highest precedence. A full `overrideInput` therefore supersedes
 *      `overridePrompt` for any shared keys.
 *
 * Both overrides are optional; when neither is provided, `replayedInput`
 * equals the original input unchanged.
 */
export function buildReplayProducedStep(
  step: AgentStep,
  overrides: ReplayOverrides | undefined,
): Record<string, unknown> {
  // Build replayedInput starting from the original
  let replayedInput: Record<string, unknown> =
    step.input !== null && typeof step.input === 'object' && !Array.isArray(step.input)
      ? { ...(step.input as Record<string, unknown>) }
      : { value: step.input };

  if (overrides?.overridePrompt !== undefined) {
    replayedInput = { ...replayedInput, prompt: overrides.overridePrompt };
  }

  if (overrides?.overrideInput !== undefined) {
    const oi = overrides.overrideInput;
    if (oi !== null && typeof oi === 'object' && !Array.isArray(oi)) {
      // Merge object overrides key-by-key (highest precedence)
      replayedInput = { ...replayedInput, ...(oi as Record<string, unknown>) };
    } else {
      // Non-object override: replace entirely
      replayedInput = { value: oi };
    }
  }

  return {
    originalStepId: step.stepId,
    originalType: step.type,
    originalInput: step.input,
    originalOutput: step.output,
    appliedOverrides: overrides ?? null,
    replayedInput,
  };
}
