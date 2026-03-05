import { Router, Request, Response } from 'express';
import type { TraceStore } from '../storage';
import type { AgentTrace } from '../../core/trace-model';

/**
 * Registers all /api/traces routes onto the provided Router.
 * The store is injected so routes remain testable without a real filesystem.
 *
 * Test with curl:
 *
 *   # Save a trace
 *   curl -X POST http://localhost:4000/api/traces \
 *     -H "Content-Type: application/json" \
 *     -d '{"traceId":"abc-123","sessionId":"s1","rootStepId":"step-1","steps":[],"metadata":{"model":"claude-sonnet-4-6","totalLatency":120,"totalTokens":460,"cost":0.001}}'
 *
 *   # List traces (with optional filtering)
 *   curl "http://localhost:4000/api/traces?limit=5&hasError=false"
 *
 *   # Get a single trace
 *   curl http://localhost:4000/api/traces/abc-123
 */
export function createRoutes(store: TraceStore): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // POST /api/traces — ingest a trace
  // ---------------------------------------------------------------------------
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body: unknown = req.body;

    if (!isAgentTrace(body)) {
      res.status(400).json({ success: false, error: 'Invalid trace: traceId is required.' });
      return;
    }

    try {
      await store.saveTrace(body);
      res.status(201).json({ success: true, traceId: body.traceId });
    } catch (err) {
      console.error('[POST /api/traces]', err);
      res.status(500).json({ success: false, error: 'Failed to save trace.' });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/traces — list trace summaries
  // Query params: limit (number), cursor (string), hasError (boolean)
  // ---------------------------------------------------------------------------
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const limit = parsePositiveInt(req.query['limit'] as string | undefined, 20);
    const cursor = (req.query['cursor'] as string | undefined) || undefined;
    const hasError = parseBooleanParam(req.query['hasError'] as string | undefined);

    try {
      const result = await store.listTraces({ limit, cursor, hasError });
      res.json(result);
    } catch (err) {
      console.error('[GET /api/traces]', err);
      res.status(500).json({ error: 'Failed to list traces.' });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/traces/:traceId — retrieve a single full trace
  // ---------------------------------------------------------------------------
  router.get('/:traceId', async (req: Request, res: Response): Promise<void> => {
    const { traceId } = req.params;

    try {
      const trace = await store.getTrace(traceId);
      if (!trace) {
        res.status(404).json({ error: `Trace not found: ${traceId}` });
        return;
      }
      res.json(trace);
    } catch (err) {
      console.error(`[GET /api/traces/${traceId}]`, err);
      res.status(500).json({ error: 'Failed to retrieve trace.' });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Minimal structural guard: we only require traceId to be present.
 * Deep validation of steps / metadata is left to application-level logic.
 */
function isAgentTrace(value: unknown): value is AgentTrace {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['traceId'] === 'string'
  );
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Accepts "true"/"1" → true, "false"/"0" → false, anything else → undefined */
function parseBooleanParam(raw: string | undefined): boolean | undefined {
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
}
