import express, { Request, Response } from 'express';
import { FileTraceStore } from '../storage';
import { FileReplayStore } from '../replay-store';
import { ReplayService } from '../replay';
import { createTracesRouter } from './routes/traces';
import { createReplayRoutes } from './routes/replays';
import { computeStats } from './services/stats';

const PORT = 4000;

const app = express();

// Parse JSON bodies
app.use(express.json());

// Initialise storage
const store         = new FileTraceStore();           // data/traces/
const replayStore   = new FileReplayStore();          // data/replays/
const replayService = new ReplayService(store);

// Mount routes
app.use('/api/traces',  createTracesRouter(store, replayStore));
app.use('/api/replays', createReplayRoutes(replayService, replayStore));

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

// Health check — useful for smoke-testing the server is up
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`AgentScope Studio API listening on http://localhost:${PORT}`);
});

export { app };
