import type {
  AgentTrace,
  AgentStep,
  StepType,
  StepStatus,
  TokenUsage,
  TraceMetadata,
} from '../../core/trace-model';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Simple fallback: timestamp + random hex
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

interface StartStepParams {
  type: StepType;
  parentId?: string;
  input?: unknown;
  tokens?: TokenUsage;
}

interface ActiveTrace {
  traceId: string;
  sessionId: string;
  metadata: Partial<TraceMetadata>;
  steps: Map<string, AgentStep>;
  /** Internal wall-clock start time per step, not stored in AgentStep */
  stepStartTimes: Map<string, number>;
}

export class Tracer {
  private activeTrace: ActiveTrace | null = null;

  startTrace(sessionId: string, metadata?: Partial<TraceMetadata>): string {
    const traceId = generateId();
    this.activeTrace = {
      traceId,
      sessionId,
      metadata: {
        model: '',
        cost: 0,
        totalLatency: 0,
        totalTokens: 0,
        ...metadata,
      },
      steps: new Map(),
      stepStartTimes: new Map(),
    };
    return traceId;
  }

  startStep(params: StartStepParams): string {
    if (!this.activeTrace) {
      throw new Error('No active trace. Call startTrace() first.');
    }

    const { type, parentId, input, tokens } = params;
    const stepId = generateId();

    const step: AgentStep = {
      stepId,
      parentId,
      type,
      status: 'running',
      input: input ?? null,
      output: null,
      latency: 0,
      tokens,
      children: [],
    };

    this.activeTrace.steps.set(stepId, step);
    this.activeTrace.stepStartTimes.set(stepId, Date.now());

    if (parentId) {
      const parent = this.activeTrace.steps.get(parentId);
      if (parent) {
        parent.children.push(stepId);
      }
    }

    return stepId;
  }

  endStep(
    stepId: string,
    output?: unknown,
    status: Extract<StepStatus, 'success' | 'error'> = 'success',
    tokens?: TokenUsage,
  ): void {
    if (!this.activeTrace) {
      throw new Error('No active trace.');
    }

    const step = this.activeTrace.steps.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    const startTime = this.activeTrace.stepStartTimes.get(stepId) ?? Date.now();
    step.output = output ?? null;
    step.status = status;
    step.latency = Date.now() - startTime;

    if (tokens) {
      step.tokens = tokens;
    }
  }

  /**
   * Finalizes the trace and returns a complete AgentTrace.
   *
   * Root step resolution:
   * - If exactly one step has no parentId → that step is the root.
   * - Otherwise → a synthetic "planner" step is created whose children are
   *   all top-level steps (no parentId). This synthetic root is prepended to
   *   the steps array and its stepId becomes rootStepId.
   */
  endTrace(): AgentTrace {
    if (!this.activeTrace) {
      throw new Error('No active trace.');
    }

    const { traceId, sessionId, metadata, steps, stepStartTimes } = this.activeTrace;
    const stepsArray = Array.from(steps.values());

    // Aggregate totals
    let totalLatency = 0;
    let totalTokens = 0;
    for (const step of stepsArray) {
      totalLatency += step.latency;
      totalTokens += step.tokens?.totalTokens ?? 0;
    }

    // Resolve root
    const topLevelSteps = stepsArray.filter((s) => !s.parentId);
    let rootStepId: string;

    if (topLevelSteps.length === 1) {
      rootStepId = topLevelSteps[0].stepId;
    } else {
      // Synthesize a root planner step
      const syntheticId = generateId();
      const syntheticRoot: AgentStep = {
        stepId: syntheticId,
        type: 'planner',
        status: 'success',
        input: null,
        output: null,
        latency: 0,
        children: topLevelSteps.map((s) => s.stepId),
      };
      stepsArray.unshift(syntheticRoot);
      stepStartTimes.delete(syntheticId); // not needed
      rootStepId = syntheticId;
    }

    const finalMetadata: TraceMetadata = {
      model: metadata.model ?? '',
      cost: metadata.cost ?? 0,
      totalLatency,
      totalTokens,
    };

    this.activeTrace = null;

    return {
      traceId,
      sessionId,
      rootStepId,
      steps: stepsArray,
      metadata: finalMetadata,
    };
  }
}
