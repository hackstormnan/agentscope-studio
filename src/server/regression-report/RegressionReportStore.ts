import fs   from 'fs/promises';
import path from 'path';
import type { RegressionReport } from '../../core/regression-model';

/**
 * File-based persistence for regression reports.
 *
 * Layout:
 *   data/reports/<reportId>.json   — one file per report
 *
 * Lookups are O(1) reads by reportId; there is no index file.
 * Re-generating a report for the same run pair produces a new reportId and
 * a new file — historical reports are preserved.
 */
export class RegressionReportStore {
  private readonly dir: string;

  constructor(dataDir = 'data/reports') {
    this.dir = dataDir;
  }

  async save(report: RegressionReport): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(
      this.filePath(report.reportId),
      JSON.stringify(report, null, 2),
      'utf-8',
    );
  }

  async get(reportId: string): Promise<RegressionReport | null> {
    try {
      const raw = await fs.readFile(this.filePath(reportId), 'utf-8');
      return JSON.parse(raw) as RegressionReport;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  private filePath(reportId: string): string {
    return path.join(this.dir, `${reportId}.json`);
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
