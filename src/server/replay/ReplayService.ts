import type { TraceStore } from '../storage';
import type { ReplayRequest, ReplayResult } from '../../core/replay-model';
import { createReplayId, findStepById, buildReplayProducedStep } from './ReplayUtils';

export class ReplayService {
  constructor(private readonly store: TraceStore) {}

  async runReplay(request: ReplayRequest): Promise<ReplayResult> {
    const replayId   = createReplayId();
    const startedAt  = new Date().toISOString();

    // ── Load trace ─────────────────────────────────────────────────────────────
    const trace = await this.store.getTrace(request.traceId);

    if (!trace) {
      return {
        replayId,
        sourceTraceId: request.traceId,
        targetStepId:  request.targetStepId,
        status:        'error',
        startedAt,
        completedAt:   new Date().toISOString(),
        errorMessage:  `Trace not found: ${request.traceId}`,
      };
    }

    // ── Find target step ───────────────────────────────────────────────────────
    const targetStep = findStepById(trace, request.targetStepId);

    if (!targetStep) {
      return {
        replayId,
        sourceTraceId: request.traceId,
        targetStepId:  request.targetStepId,
        status:        'error',
        startedAt,
        completedAt:   new Date().toISOString(),
        errorMessage:  `Step not found in trace ${request.traceId}: ${request.targetStepId}`,
      };
    }

    // ── Run replay ─────────────────────────────────────────────────────────────
    // Status transitions: pending → running → success
    // (No persistence of intermediate states yet; this is the in-memory path.)

    const producedStep = buildReplayProducedStep(targetStep, request.overrides);

    return {
      replayId,
      sourceTraceId:   request.traceId,
      targetStepId:    request.targetStepId,
      status:          'success',
      startedAt,
      completedAt:     new Date().toISOString(),
      producedStep,
    };
  }
}
