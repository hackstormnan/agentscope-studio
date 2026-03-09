import { RuleBasedEvaluator } from '../evaluation/RuleBasedEvaluator';
import { createEvaluationId } from '../evaluation/EvaluationUtils';
import { buildEvaluatorContext, buildEvaluationTarget } from './BatchEvaluationAdapter';
import type { DatasetRunResult } from '../../core/dataset-model';
import type { EvaluationResult } from '../../core/evaluation-model';
import type {
  BatchEvaluationResponse,
  BatchEvaluationSummary,
  ItemEvaluation,
} from './BatchEvaluationTypes';

export class BatchEvaluationService {
  private readonly evaluator = new RuleBasedEvaluator();

  // ── Main entry point ──────────────────────────────────────────────────────

  async evaluateDatasetRun(params: {
    runId:   string;
    results: DatasetRunResult[];
  }): Promise<BatchEvaluationResponse> {
    const { runId, results } = params;

    // Evaluate each item sequentially (fail-soft: one bad item never aborts).
    const itemEvaluations: ItemEvaluation[] = [];

    for (const result of results) {
      const context = buildEvaluatorContext(result);
      const target  = buildEvaluationTarget(result);

      let evalResult: EvaluationResult;
      try {
        // RuleBasedEvaluator already catches its own errors internally;
        // this outer try/catch is a safety net for unexpected throws.
        evalResult = await this.evaluator.evaluate(target, context);
      } catch (err) {
        evalResult = {
          evaluationId:  createEvaluationId(),
          target,
          evaluatorName: this.evaluator.name,
          status:        'error',
          issues:        [],
          startedAt:     new Date().toISOString(),
          completedAt:   new Date().toISOString(),
          errorMessage:  err instanceof Error ? err.message : String(err),
        };
      }

      itemEvaluations.push({ itemId: result.itemId, evaluations: [evalResult] });
    }

    const summary = this.computeSummary(runId, itemEvaluations, results.length);

    return {
      runId,
      summary,
      itemEvaluations,
      evaluatedAt: new Date().toISOString(),
    };
  }

  // ── Aggregation ───────────────────────────────────────────────────────────

  private computeSummary(
    runId:           string,
    itemEvaluations: ItemEvaluation[],
    totalItems:      number,
  ): BatchEvaluationSummary {
    let issueCount        = 0;
    let errorIssueCount   = 0;
    let warningIssueCount = 0;
    let scoreSum          = 0;
    let scoredCount       = 0;
    let cleanItemCount    = 0; // items with zero issues (used for successRate)
    let evaluatedItems    = 0;

    for (const item of itemEvaluations) {
      const successful = item.evaluations.filter((e) => e.status === 'success');
      if (successful.length === 0) continue;

      evaluatedItems++;

      const allIssues = successful.flatMap((e) => e.issues ?? []);
      if (allIssues.length === 0) cleanItemCount++;

      for (const issue of allIssues) {
        issueCount++;
        if (issue.severity === 'error')   errorIssueCount++;
        if (issue.severity === 'warning') warningIssueCount++;
      }

      for (const e of successful) {
        if (e.score !== undefined) {
          scoreSum += e.score;
          scoredCount++;
        }
      }
    }

    return {
      runId,
      totalItems,
      evaluatedItems,
      issueCount,
      errorIssueCount,
      warningIssueCount,
      averageScore: scoredCount    > 0 ? scoreSum        / scoredCount    : undefined,
      successRate:  evaluatedItems > 0 ? cleanItemCount  / evaluatedItems : undefined,
    };
  }
}
