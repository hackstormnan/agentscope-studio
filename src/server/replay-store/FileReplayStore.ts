import fs from 'fs/promises';
import path from 'path';
import type { ReplayResult } from '../../core/replay-model';
import type { ReplayStore, ListReplaysParams } from './ReplayStore';

/**
 * Indexing strategy:
 *   - Each replay is stored as data/replays/<replayId>.json (full ReplayResult).
 *   - data/replays/index.json holds a compact array of index entries containing
 *     only the fields needed for listing/filtering: replayId, sourceTraceId,
 *     targetStepId, status, startedAt. This avoids reading every result file
 *     on every list call.
 *   - On saveReplay the full file is written first, then the index is updated.
 *     If the process crashes between the two writes, the index entry is simply
 *     missing — the replay file still exists and can be retrieved by replayId.
 *   - Index entries are stored newest-first (prepended) so listReplays returns
 *     results in descending startedAt order without sorting.
 */

interface IndexEntry {
  replayId:      string;
  sourceTraceId: string;
  targetStepId:  string;
  status:        string;
  startedAt:     string;
}

export class FileReplayStore implements ReplayStore {
  private readonly replaysDir: string;
  private readonly indexPath:  string;

  constructor(dataDir = 'data/replays') {
    this.replaysDir = dataDir;
    this.indexPath  = path.join(dataDir, 'index.json');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async saveReplay(result: ReplayResult): Promise<void> {
    await this.ensureDir();

    // Write full result file first
    const filePath = this.replayFilePath(result.replayId);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');

    // Update index
    await this.upsertIndex(result);
  }

  async getReplay(replayId: string): Promise<ReplayResult | null> {
    const filePath = this.replayFilePath(replayId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as ReplayResult;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async listReplays(params: ListReplaysParams = {}): Promise<ReplayResult[]> {
    const { sourceTraceId, targetStepId, limit = 50 } = params;

    let index = await this.readIndex();

    if (sourceTraceId !== undefined) {
      index = index.filter((e) => e.sourceTraceId === sourceTraceId);
    }
    if (targetStepId !== undefined) {
      index = index.filter((e) => e.targetStepId === targetStepId);
    }

    // Index is stored newest-first; slice to limit before fetching full files
    const page = index.slice(0, limit);

    // Load full ReplayResult for each matching entry
    const results = await Promise.all(
      page.map((entry) => this.getReplay(entry.replayId)),
    );

    // Filter out any nulls (index/file mismatch after a partial write)
    return results.filter((r): r is ReplayResult => r !== null);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private replayFilePath(replayId: string): string {
    return path.join(this.replaysDir, `${replayId}.json`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.replaysDir, { recursive: true });
  }

  private async readIndex(): Promise<IndexEntry[]> {
    try {
      const raw = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(raw) as IndexEntry[];
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return [];
      // Corrupt index — log and recover
      console.warn('[FileReplayStore] index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async upsertIndex(result: ReplayResult): Promise<void> {
    const index = await this.readIndex();

    const entry: IndexEntry = {
      replayId:      result.replayId,
      sourceTraceId: result.sourceTraceId,
      targetStepId:  result.targetStepId,
      status:        result.status,
      startedAt:     result.startedAt,
    };

    const existing = index.findIndex((e) => e.replayId === result.replayId);
    if (existing !== -1) {
      // Update in-place (e.g. status change on re-save)
      index[existing] = entry;
    } else {
      // Prepend so index stays newest-first without sorting
      index.unshift(entry);
    }

    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
