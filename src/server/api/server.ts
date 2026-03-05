import express from 'express';
import { FileTraceStore } from '../storage';
import { createRoutes } from './routes';

const PORT = 4000;

const app = express();

// Parse JSON bodies
app.use(express.json());

// Initialise storage (writes to data/traces/ relative to process.cwd())
const store = new FileTraceStore();

// Mount trace routes
app.use('/api/traces', createRoutes(store));

// Health check — useful for smoke-testing the server is up
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`AgentScope Studio API listening on http://localhost:${PORT}`);
});

export { app };
