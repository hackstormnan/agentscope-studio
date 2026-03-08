import fs from 'fs/promises';
import path from 'path';
import type { Experiment, ExperimentRun } from '../../core/experiment-model';

/**
 * File layout
 * ───────────
 *   data/experiments/index.json           — Experiment[] newest-first
 *   data/experiments/<experimentId>.json  — full Experiment
 *   data/experiments/runs/index.json      — ExperimentRun[] newest-first
 *   data/experiments/runs/<runId>.json    — full ExperimentRun
 *
 * Write order for each save: full file first, then index update.
 * A crash between the two leaves the full file intact and retrievable by ID.
 */
export class ExperimentStore {
  private readonly experimentsDir: string;
  private readonly runsDir:        string;
  private readonly expIndexPath:   string;
  private readonly runIndexPath:   string;

  constructor(dataDir = 'data/experiments') {
    this.experimentsDir = dataDir;
    this.runsDir        = path.join(dataDir, 'runs');
    this.expIndexPath   = path.join(dataDir, 'index.json');
    this.runIndexPath   = path.join(this.runsDir, 'index.json');
  }

  // ── Experiments ─────────────────────────────────────────────────────────────

  async createExperiment(experiment: Experiment): Promise<void> {
    await this.ensureExperimentsDir();
    const filePath = this.experimentFilePath(experiment.experimentId);
    await fs.writeFile(filePath, JSON.stringify(experiment, null, 2), 'utf-8');
    await this.upsertExperimentIndex(experiment);
  }

  async getExperiment(experimentId: string): Promise<Experiment | null> {
    try {
      const raw = await fs.readFile(this.experimentFilePath(experimentId), 'utf-8');
      return JSON.parse(raw) as Experiment;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async listExperiments(): Promise<Experiment[]> {
    return this.readExperimentIndex();
  }

  // ── Experiment Runs ──────────────────────────────────────────────────────────

  async createExperimentRun(run: ExperimentRun): Promise<void> {
    await this.ensureRunsDir();
    const filePath = this.runFilePath(run.runId);
    await fs.writeFile(filePath, JSON.stringify(run, null, 2), 'utf-8');
    await this.upsertRunIndex(run);
  }

  async getExperimentRun(runId: string): Promise<ExperimentRun | null> {
    try {
      const raw = await fs.readFile(this.runFilePath(runId), 'utf-8');
      return JSON.parse(raw) as ExperimentRun;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async listExperimentRuns(experimentId: string): Promise<ExperimentRun[]> {
    const index = await this.readRunIndex();
    const matching = index.filter((r) => r.experimentId === experimentId);

    const runs = await Promise.all(matching.map((r) => this.getExperimentRun(r.runId)));
    return runs.filter((r): r is ExperimentRun => r !== null);
  }

  // ── Private: path helpers ────────────────────────────────────────────────────

  private experimentFilePath(experimentId: string): string {
    return path.join(this.experimentsDir, `${experimentId}.json`);
  }

  private runFilePath(runId: string): string {
    return path.join(this.runsDir, `${runId}.json`);
  }

  // ── Private: directory setup ─────────────────────────────────────────────────

  private async ensureExperimentsDir(): Promise<void> {
    await fs.mkdir(this.experimentsDir, { recursive: true });
  }

  private async ensureRunsDir(): Promise<void> {
    await fs.mkdir(this.runsDir, { recursive: true });
  }

  // ── Private: experiment index ─────────────────────────────────────────────────

  private async readExperimentIndex(): Promise<Experiment[]> {
    try {
      const raw = await fs.readFile(this.expIndexPath, 'utf-8');
      return JSON.parse(raw) as Experiment[];
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return [];
      console.warn('[ExperimentStore] experiments/index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async upsertExperimentIndex(experiment: Experiment): Promise<void> {
    const index = await this.readExperimentIndex();
    const pos   = index.findIndex((e) => e.experimentId === experiment.experimentId);

    if (pos !== -1) {
      index[pos] = experiment;
    } else {
      index.unshift(experiment); // newest-first
    }

    await fs.writeFile(this.expIndexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  // ── Private: run index ────────────────────────────────────────────────────────
  //
  // The run index stores only the fields needed for filtering by experimentId,
  // avoiding a full file read for every listExperimentRuns call.

  private async readRunIndex(): Promise<ExperimentRun[]> {
    try {
      const raw = await fs.readFile(this.runIndexPath, 'utf-8');
      return JSON.parse(raw) as ExperimentRun[];
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return [];
      console.warn('[ExperimentStore] experiments/runs/index.json is corrupt — treating as empty.');
      return [];
    }
  }

  private async upsertRunIndex(run: ExperimentRun): Promise<void> {
    const index = await this.readRunIndex();
    const pos   = index.findIndex((r) => r.runId === run.runId);

    if (pos !== -1) {
      index[pos] = run;
    } else {
      index.unshift(run); // newest-first
    }

    await fs.writeFile(this.runIndexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
