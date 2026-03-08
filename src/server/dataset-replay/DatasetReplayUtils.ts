import { randomUUID } from 'crypto';
import type { DatasetItem } from '../../core/dataset-model';
import type { ReplayOverrides, ReplayResult } from '../../core/replay-model';

// ── ID factories ───────────────────────────────────────────────────────────────

export function createDatasetRunId(): string {
  return `drun_${randomUUID()}`;
}

// ── Synthetic replay builder ───────────────────────────────────────────────────
//
// Dataset items are free-form inputs — they are not linked to any existing
// trace or step in the trace store.  ReplayService.runReplay() cannot be used
// here because it requires a real (traceId, targetStepId) pair.
//
// Instead, BatchReplayService builds a synthetic ReplayResult for each item:
//
//   sourceTraceId = "synthetic_dataset_<datasetId>_item_<itemId>"
//   targetStepId  = "synthetic_step_<itemId>"
//   replayId      = "replay_dset_<itemId>_<uuid-segment>"
//
// These IDs are clearly prefixed "synthetic_" so downstream consumers can
// distinguish them from real trace-store references.
//
// Override merge strategy — identical to ReplayUtils.buildReplayProducedStep:
//   1. Start from item.input as base (object → spread, primitive → {value:...})
//   2. Apply overridePrompt → adds/overwrites the "prompt" key
//   3. Apply overrideInput → object-merges (highest precedence) or full replace
//
// `producedOutput` on DatasetRunResult is set to `replayedInput` — the merged
// input that the agent would receive after overrides.  This mirrors
// DatasetItem.expectedOutput for direct comparison by evaluators.

export function buildSyntheticReplayResult(
  datasetId: string,
  item:       DatasetItem,
  overrides:  ReplayOverrides | undefined,
): ReplayResult {
  const startedAt = new Date().toISOString();

  // Build replayedInput: start from item.input, apply overrides on top.
  let replayedInput: Record<string, unknown> =
    item.input !== null && typeof item.input === 'object' && !Array.isArray(item.input)
      ? { ...(item.input as Record<string, unknown>) }
      : { value: item.input };

  if (overrides?.overridePrompt !== undefined) {
    replayedInput = { ...replayedInput, prompt: overrides.overridePrompt };
  }

  if (overrides?.overrideInput !== undefined) {
    const oi = overrides.overrideInput;
    if (oi !== null && typeof oi === 'object' && !Array.isArray(oi)) {
      replayedInput = { ...replayedInput, ...(oi as Record<string, unknown>) };
    } else {
      replayedInput = { value: oi };
    }
  }

  return {
    replayId:      `replay_dset_${item.itemId}_${randomUUID().slice(0, 8)}`,
    sourceTraceId: `synthetic_dataset_${datasetId}_item_${item.itemId}`,
    targetStepId:  `synthetic_step_${item.itemId}`,
    status:        'success',
    startedAt,
    completedAt:   new Date().toISOString(),
    producedStep: {
      datasetItemId:    item.itemId,
      originalInput:    item.input,
      expectedOutput:   item.expectedOutput,
      appliedOverrides: overrides ?? null,
      replayedInput,
    },
  };
}
