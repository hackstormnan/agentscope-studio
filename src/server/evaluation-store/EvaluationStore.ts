import type { EvaluationResult } from '../../core/evaluation-model';

export interface ListEvaluationsParams {
  traceId?: string;
  stepId?:  string;
  limit?:   number;
}

export interface EvaluationStore {
  saveEvaluation(result: EvaluationResult): Promise<void>;
  getEvaluation(evaluationId: string): Promise<EvaluationResult | null>;
  listEvaluations(params?: ListEvaluationsParams): Promise<EvaluationResult[]>;
}
