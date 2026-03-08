import fs from 'fs/promises';
import path from 'path';
import type { DatasetBatchRunResponse, DatasetRunSummary } from './DatasetBatchTypes';

/**
 * File layout:
 *   data/datasets/runs/<runId>.json   — full DatasetBatchRunResponse
 *   data/datasets/runs/index.json     — compact DatasetRunSummary[] newest-first
 *
 * Write order: full file first, then index update.  A crash between the two
 * leaves the full file intact; the run is still retrievable by runId even if
 * absent from the index.
 */
export class DatasetReplayStore {
  private readonly runsDir:   string;
  private readonly indexPath: string;

  constructor(dataDir = 'data/datasets/runs') {
    this.runsDir   = dataDir;
    this.indexPath = path.join(dataDir, 'index.json');
  }

  async saveRun(response: DatasetBatchRunResponse): Promise<void> {
    await this.ensureDir();
    const filePath = this.runFilePath(response.run.runId);
    await fs.writeFile(filePath, JSON.stringify(response, null, 2), 'utf-8');
    await this.upsertIndex(response.summary);
  }

  async getRun(runId: string): Promise<DatasetBatchRunResponse | null> {
    const filePath = this.runFilePath(runId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as DatasetBatchRunResponse;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async listRuns(): Promise<DatasetRunSummary[]> {
    return this.readIndex();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private runFilePath(runId: string): string {
    return path.join(this.runsDir, `${runId}.json`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.runsDir, { recursive: true });
  }

  private async readIndex(): Promise<DatasetRunSummary[]> {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(raw) as DatasetRunSummary[];
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return [];
      console.warn('[DatasetReplayStore] index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async upsertIndex(summary: DatasetRunSummary): Promise<void> {
    const index = await this.readIndex();
    const pos   = index.findIndex((e) => e.runId === summary.runId);

    if (pos !== -1) {
      index[pos] = summary; // update existing (e.g. status change)
    } else {
      index.unshift(summary); // prepend → newest-first without sorting
    }

    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
