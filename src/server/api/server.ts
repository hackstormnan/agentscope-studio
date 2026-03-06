import express, { Request, Response } from 'express';
import { FileTraceStore } from '../storage';
import { createRoutes } from './routes';
import { computeStats } from './services/stats';

const PORT = 4000;

const app = express();

// Parse JSON bodies
app.use(express.json());

// Initialise storage (writes to data/traces/ relative to process.cwd())
const store = new FileTraceStore();

// Mount trace routes
app.use('/api/traces', createRoutes(store));

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
