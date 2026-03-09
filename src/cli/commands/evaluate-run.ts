import { DatasetReplayStore }     from '../../server/dataset-replay/DatasetReplayStore';
import { BatchEvaluationService } from '../../server/batch-evaluation/BatchEvaluationService';
import { BatchEvaluationStore }   from '../../server/batch-evaluation/BatchEvaluationStore';
import {
  printSection, printKV, printError,
  fmt, fmtPct,
} from '../utils/output';

export async function evaluateRunCommand(flags: Record<string, string>): Promise<void> {
  const runId = flags['run'];

  if (!runId) {
    printError('--run <datasetRunId> is required');
    process.exit(1);
  }

  // ── Load dataset run ───────────────────────────────────────────────────────

  const replayStore = new DatasetReplayStore();
  const batchRun    = await replayStore.getRun(runId).catch((err: unknown) => {
    printError(`Failed to read run: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });

  if (!batchRun) {
    printError(`Dataset run not found: ${runId}`);
    process.exit(1);
  }

  // ── Evaluate ───────────────────────────────────────────────────────────────

  const evalService = new BatchEvaluationService();
  const evalStore   = new BatchEvaluationStore();

  let evalResponse;
  try {
    evalResponse = await evalService.evaluateDatasetRun({
      runId,
      results: batchRun.results,
    });
  } catch (err) {
    printError(`Evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  await evalStore.save(evalResponse).catch((err: unknown) => {
    printError(`Failed to persist evaluation: ${err instanceof Error ? err.message : String(err)}`);
  });

  // ── Output ─────────────────────────────────────────────────────────────────

  const { summary } = evalResponse;

  printSection('Evaluation Summary');
  printKV('Run ID',          summary.runId);
  printKV('Items',           summary.totalItems);
  printKV('Evaluated',       summary.evaluatedItems);
  printKV('Issue Count',     fmt(summary.issueCount));
  printKV('Error Issues',    fmt(summary.errorIssueCount));
  printKV('Warning Issues',  fmt(summary.warningIssueCount));
  printKV('Success Rate',    fmtPct(summary.successRate));
  printKV('Average Score',   summary.averageScore !== undefined
    ? summary.averageScore.toFixed(3) : '—');

  // Machine-readable marker for CI scripts.
  console.log(`\nrunId=${summary.runId}`);
}
