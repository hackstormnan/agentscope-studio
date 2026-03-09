import fs   from 'fs/promises';
import path from 'path';
import type { BatchEvaluationResponse } from './BatchEvaluationTypes';

/**
 * File-based persistence for batch evaluation results.
 *
 * Layout:
 *   data/datasets/evaluations/<runId>.json   — one file per evaluated run
 *
 * There is no index file; lookups are always by runId (O(1) file read).
 * Re-evaluating a run overwrites the existing file.
 */
export class BatchEvaluationStore {
  private readonly dir: string;

  constructor(dataDir = 'data/datasets/evaluations') {
    this.dir = dataDir;
  }

  async save(response: BatchEvaluationResponse): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(
      this.filePath(response.runId),
      JSON.stringify(response, null, 2),
      'utf-8',
    );
  }

  async get(runId: string): Promise<BatchEvaluationResponse | null> {
    try {
      const raw = await fs.readFile(this.filePath(runId), 'utf-8');
      return JSON.parse(raw) as BatchEvaluationResponse;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  private filePath(runId: string): string {
    return path.join(this.dir, `${runId}.json`);
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
