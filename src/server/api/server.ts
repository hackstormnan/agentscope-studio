import express, { Request, Response } from 'express';
import { FileTraceStore } from '../storage';
import { FileReplayStore } from '../replay-store';
import { createTracesRouter } from './routes/traces';
import { replaysRouter } from './routes/replays';
import { evaluationsRouter } from './routes/evaluations';
import { datasetsRouter } from './routes/datasets';
import { computeStats } from './services/stats';

const PORT = 4000;

const app = express();

// Parse JSON bodies — must come before any route handlers
app.use(express.json());

// Initialise storage used by the traces router
// (replaysRouter creates its own FileReplayStore + ReplayService internally)
const store       = new FileTraceStore();   // data/traces/
const replayStore = new FileReplayStore();  // data/replays/ — shared with traces sub-route

// Mount routes
app.use('/api/traces',      createTracesRouter(store, replayStore));
app.use('/api/replays',     replaysRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/datasets',    datasetsRouter);

// ---------------------------------------------------------------------------
// GET /api/stats — dashboard-level aggregate metrics
// ---------------------------------------------------------------------------
app.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await computeStats(store);
    res.json(stats);
  } catch (err) {
    console.error('[GET /api/stats]', err);
    res.status(500).json({ error: 'Failed to compute stats.' });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`AgentScope Studio API listening on http://localhost:${PORT}`);
});

export { app };
