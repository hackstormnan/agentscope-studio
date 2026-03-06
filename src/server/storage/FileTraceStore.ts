import fs from 'fs/promises';
import path from 'path';
import type { AgentTrace } from '../../core/trace-model';
import type { TraceStore, TraceSummary, ListParams, ListResult } from './TraceStore';

/**
 * Cursor strategy: the cursor is the traceId of the last item returned.
 * On the next call we find that traceId in the sorted list and return items
 * that come after it. This is stable as long as new traces are prepended
 * (desc sort) and the caller does not mutate already-returned pages.
 */
export class FileTraceStore implements TraceStore {
  private readonly tracesDir: string;
  private readonly indexPath: string;

  constructor(dataDir = 'data/traces') {
    this.tracesDir = dataDir;
    this.indexPath = path.join(dataDir, 'index.json');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async saveTrace(trace: AgentTrace): Promise<void> {
    await this.ensureDir();

    const filePath = this.traceFilePath(trace.traceId);
    await fs.writeFile(filePath, JSON.stringify(trace, null, 2), 'utf-8');

    const summary = this.buildSummary(trace);
    await this.appendToIndex(summary);
  }

  async getTrace(traceId: string): Promise<AgentTrace | null> {
    const filePath = this.traceFilePath(traceId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as AgentTrace;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async getAllSummaries(): Promise<TraceSummary[]> {
    return this.readIndex();
  }

  async listTraces(params: ListParams): Promise<ListResult> {
    const { limit = 20, cursor, hasError, sessionId } = params;

    let index = await this.readIndex();

    // Filter by hasError
    if (hasError !== undefined) {
      index = index.filter((s) => s.hasError === hasError);
    }

    // Filter by sessionId (case-insensitive substring, no file I/O needed)
    if (sessionId !== undefined) {
      const needle = sessionId.toLowerCase();
      index = index.filter((s) => s.sessionId.toLowerCase().includes(needle));
    }

    // Sort: most recent first (descending createdAt)
    index.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Apply cursor: skip everything up to and including the cursor traceId
    if (cursor) {
      const cursorPos = index.findIndex((s) => s.traceId === cursor);
      if (cursorPos !== -1) {
        index = index.slice(cursorPos + 1);
      }
    }

    const page = index.slice(0, limit);
    const nextCursor = index.length > limit ? page[page.length - 1].traceId : undefined;

    return { items: page, nextCursor };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private traceFilePath(traceId: string): string {
    return path.join(this.tracesDir, `${traceId}.json`);
  }

  private buildSummary(trace: AgentTrace): TraceSummary {
    const hasError = trace.steps.some((s) => s.status === 'error');
    return {
      traceId: trace.traceId,
      sessionId: trace.sessionId,
      createdAt: new Date().toISOString(),
      totalLatency: trace.metadata.totalLatency,
      totalTokens: trace.metadata.totalTokens,
      hasError,
    };
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.tracesDir, { recursive: true });
  }

  private async readIndex(): Promise<TraceSummary[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.indexPath, 'utf-8');
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return [];
      throw err;
    }

    try {
      return JSON.parse(raw) as TraceSummary[];
    } catch {
      // index.json exists but contains invalid JSON (e.g. partial write).
      // Treat as empty so the next saveTrace can recover by rewriting it.
      console.warn('[FileTraceStore] index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async appendToIndex(summary: TraceSummary): Promise<void> {
    const index = await this.readIndex();

    // Replace existing entry if traceId already present (idempotent re-save)
    const existingIdx = index.findIndex((s) => s.traceId === summary.traceId);
    if (existingIdx !== -1) {
      index[existingIdx] = summary;
    } else {
      index.push(summary);
    }

    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
