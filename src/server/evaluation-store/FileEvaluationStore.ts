import fs from 'fs/promises';
import path from 'path';
import type { EvaluationResult } from '../../core/evaluation-model';
import type { EvaluationStore, ListEvaluationsParams } from './EvaluationStore';

/**
 * File-based EvaluationStore.
 *
 * Layout:
 *   data/evaluations/<evaluationId>.json  — full EvaluationResult
 *   data/evaluations/index.json           — compact IndexEntry[] for listing
 *
 * Write order: full file first, then index — crash-safe.
 * Index is stored newest-first (prepended) so listing returns results in
 * descending startedAt order without sorting.
 */

interface IndexEntry {
  evaluationId:  string;
  traceId:       string;
  stepId?:       string;
  evaluatorName: string;
  status:        string;
  startedAt:     string;
}

export class FileEvaluationStore implements EvaluationStore {
  private readonly dir:       string;
  private readonly indexPath: string;

  constructor(dataDir = 'data/evaluations') {
    this.dir       = dataDir;
    this.indexPath = path.join(dataDir, 'index.json');
  }

  async saveEvaluation(result: EvaluationResult): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath(result.evaluationId),
      JSON.stringify(result, null, 2),
      'utf-8',
    );
    await this.upsertIndex(result);
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
    try {
      const raw = await fs.readFile(this.filePath(evaluationId), 'utf-8');
      return JSON.parse(raw) as EvaluationResult;
    } catch (err: unknown) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }

  async listEvaluations(params: ListEvaluationsParams = {}): Promise<EvaluationResult[]> {
    const { traceId, stepId, limit = 50 } = params;
    let index = await this.readIndex();

    if (traceId !== undefined) index = index.filter((e) => e.traceId === traceId);
    if (stepId  !== undefined) index = index.filter((e) => e.stepId  === stepId);

    const page    = index.slice(0, limit);
    const results = await Promise.all(page.map((e) => this.getEvaluation(e.evaluationId)));
    return results.filter((r): r is EvaluationResult => r !== null);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private filePath(evaluationId: string): string {
    return path.join(this.dir, `${evaluationId}.json`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private async readIndex(): Promise<IndexEntry[]> {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(raw) as IndexEntry[];
    } catch (err: unknown) {
      if (isEnoent(err)) return [];
      console.warn('[FileEvaluationStore] index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async upsertIndex(result: EvaluationResult): Promise<void> {
    const index = await this.readIndex();

    const entry: IndexEntry = {
      evaluationId:  result.evaluationId,
      traceId:       result.target.traceId,
      stepId:        result.target.stepId,
      evaluatorName: result.evaluatorName,
      status:        result.status,
      startedAt:     result.startedAt,
    };

    const existing = index.findIndex((e) => e.evaluationId === result.evaluationId);
    if (existing !== -1) {
      index[existing] = entry;
    } else {
      index.unshift(entry); // newest-first
    }

    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

function isEnoent(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT';
}
