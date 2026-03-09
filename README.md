# AgentScope Studio

**Observability, evaluation, and regression testing for AI agents.**

AgentScope Studio gives engineering teams the tooling to understand, test, and continuously improve AI agent behaviour. It captures agent execution traces, replays them with configuration changes, scores outputs against defined rules, tracks experiment runs side by side, and detects performance regressions — all through a local-first web UI and a CI-ready CLI.

---

## Key Capabilities

| Capability | Description |
|---|---|
| **Trace Explorer** | Browse, filter, and inspect full agent execution traces with step-level detail |
| **Step Replay** | Re-run any individual agent step with overridden prompts or inputs |
| **Rule-based Evaluation** | Score trace outputs against configurable issue-detection rules |
| **Dataset Replay** | Run a batch of input items through the agent and collect outputs |
| **Experiment Tracking** | Compare multiple dataset runs side by side with metric summaries |
| **Regression Reports** | Detect score, latency, and cost regressions between experiment runs |
| **CLI Automation** | Drive the full pipeline from a terminal or CI workflow |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│  Dashboard · Traces · Experiments · Datasets · Eval     │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (REST)
┌───────────────────────▼─────────────────────────────────┐
│               Express API  (port 4000)                  │
│                                                         │
│  /api/traces       /api/replays    /api/evaluations     │
│  /api/datasets     /api/experiments /api/reports        │
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                   Server Modules                        │
│                                                         │
│  TraceStore        ReplayService     EvaluationService  │
│  DatasetReplayStore BatchEvaluation  RegressionReport   │
│  ExperimentStore   QueryService      AnalysisService    │
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│               File Storage  (data/)                     │
│                                                         │
│  traces/           replays/          evaluations/       │
│  datasets/runs/    datasets/eval/    reports/           │
└─────────────────────────────────────────────────────────┘

CLI (src/cli/)  ──────────────────────────────────────────►
  replay-dataset · evaluate-run · generate-regression-report
```

See [`docs/architecture/`](docs/architecture/) for detailed Mermaid diagrams of each subsystem.

---

## Core Features

### Observability Layer

The trace store ingests `AgentTrace` objects that record every step an agent took — LLM calls, tool invocations, memory reads, planner decisions, and reflection passes. Each step captures type, status, input, output, latency, and token usage.

Traces are queryable via the trace query engine, which supports filtering by model, date range, status, and latency thresholds.

### Replay Engine

Any agent step can be replayed with modified inputs. Override the prompt, replace the full input object, or combine both. The replay engine applies overrides using a deterministic merge strategy and records the result as a `ReplayResult` linked back to the original trace.

### Rule-based Evaluation

The `RuleBasedEvaluator` scores agent outputs against a set of issue-detection rules. Each rule assigns a severity (`error` | `warning`) and an issue code. Results are aggregated into `EvaluationResult` objects with optional numeric scores.

Evaluations can target a single trace, a specific step, or a full batch of dataset run outputs.

### Dataset Replay

A `Dataset` is a named collection of input/expected-output pairs. `BatchReplayService` processes every item in a dataset, applying optional replay overrides, and produces a `DatasetBatchRunResponse` with per-item results and a summary.

The fail-soft guarantee ensures a single bad item never aborts the run.

### Experiment Tracking

An experiment groups multiple dataset runs for comparison. The experiment detail view shows both runs side by side — item counts, success rates, evaluation scores, and per-item differences.

### Regression Reports

`RegressionReportService` compares two evaluated runs and produces structured metric deltas:

- **Higher-better**: `evaluationScore`, `successRate`
- **Lower-better**: `issueCount`, `errorIssueCount`, `warningIssueCount`, `averageLatency`, `estimatedCost`

Each delta is classified as `improved`, `regressed`, or `unchanged`. New issue codes that appear only in the candidate are flagged explicitly.

### CLI Automation

The CLI wraps all of the above in three composable commands designed for terminal and CI use. See [CLI Usage](#cli-usage) below.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Backend

```bash
# Install dependencies
npm install

# Start the API server (port 4000)
npm run dev:server

# Or build and run the compiled output
npm run build && npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server — http://localhost:5173
```

Open `http://localhost:5173` in your browser. The UI connects to the API at `http://localhost:4000`.

### Seed trace data (optional)

```bash
npm run sanity:post    # POST a sample trace
npm run sanity:get     # List stored traces
```

---

## CLI Usage

```bash
npm run cli -- <command> [flags]
```

### replay-dataset

Runs a dataset through the batch replay engine and prints the resulting run ID.

```bash
npm run cli -- replay-dataset \
  --config  ci/datasets/smoke-test.json \
  --dataset ds-smoke-v2 \
  --experiment exp-001
```

**Config file format:**
```json
{
  "datasetId": "ds-smoke-v1",
  "name": "Smoke Test",
  "items": [
    { "itemId": "i1", "input": { "prompt": "Summarise in one sentence." } },
    { "itemId": "i2", "input": { "prompt": "What is the capital of France?" } }
  ],
  "replayOverrides": { "overridePrompt": "Answer concisely." }
}
```

**Output:**
```
Dataset Run Completed
─────────────────────
  Dataset ID:           ds-smoke-v1
  Run ID:               drun_abc123
  Items:                50
  Succeeded:            48
  Success Rate:         96.0%
  Status:               success

runId=drun_abc123
```

### evaluate-run

Scores all outputs from a completed dataset run.

```bash
npm run cli -- evaluate-run --run drun_abc123
```

**Output:**
```
Evaluation Summary
──────────────────
  Run ID:               drun_abc123
  Items:                50
  Evaluated:            50
  Issue Count:          3
  Success Rate:         94.0%
  Average Score:        0.812

runId=drun_abc123
```

### generate-regression-report

Compares two evaluated runs. Exits `1` if thresholds are exceeded.

```bash
npm run cli -- generate-regression-report \
  --baseline  drun_baseline \
  --candidate drun_abc123
```

**Output:**
```
Regression Report
─────────────────
  Report ID:            report_1234567890_abc
  Baseline:             drun_baseline
  Candidate:            drun_abc123

  All clear — 3 metrics improved, no regressions.

  Score Delta:          +0.120 (+12.3%)
  Success Rate Delta:   +5.0% (abs +0.05)
  Latency Delta:        -6.0% (abs -45.00)
```

**Regression thresholds:**

| Metric | Max allowed drop |
|---|---|
| `evaluationScore` | 5% |
| `successRate` | 3% |

---

## CI Integration

The repository ships a GitHub Actions workflow at [`.github/workflows/agentscope-eval.yml`](.github/workflows/agentscope-eval.yml).

```
push / PR
   │
   ├── npm ci
   ├── replay-dataset --config ci/datasets/smoke-test.json
   ├── evaluate-run --run <captured runId>
   └── generate-regression-report --baseline $BASELINE_RUN_ID --candidate <runId>
         └── exits 1 → workflow fails if regression thresholds exceeded
```

**Setup:** set `BASELINE_RUN_ID` as a repository variable pointing to the last known-good evaluation run. Evaluation artefacts are uploaded for 30 days per run.

---

## Testing

### Running tests locally

```bash
npm test                   # run all integration smoke tests
npm run test:integration   # alias for npm test
npm run test:smoke         # alias for npm test
```

### What the smoke CI validates

The integration tests in `tests/integration/` exercise the full orchestration path of each CLI command by calling the same service classes the commands use — no HTTP server required, no data written to disk.

| Test file | What it covers |
|---|---|
| `replay-dataset.test.ts` | Fixture files are valid JSON; `BatchReplayService` processes all items; summary counts are consistent |
| `evaluate-run.test.ts` | `BatchEvaluationService` produces a `BatchEvaluationResponse` with correct shape; `itemEvaluations` count matches result count |
| `regression-report.test.ts` | Full replay → evaluate → regression pipeline runs end-to-end; `RegressionReport` has required fields; metric deltas are valid `RegressionStatus` values |

### Fixture files

| File | Purpose |
|---|---|
| `ci/datasets/smoke-test.json` | 3-item dataset used in replay + evaluate steps |
| `ci/configs/baseline.json` | 5-item dataset for regression baseline run |
| `ci/configs/candidate.json` | 5-item dataset with `replayOverrides` for regression candidate run |

### CI smoke test command

The GitHub Actions workflow runs `npm run ci:smoke` as its first step — before executing any replay or evaluation against live data. This acts as a fast pre-flight check (< 5 s) that catches breaking changes to service interfaces before the full pipeline runs.

### Limitations of the current smoke CI

- **Synthetic replay only** — `BatchReplayService` applies overrides to inputs but does not execute a real LLM or agent. Outputs are the (possibly overridden) inputs, not real agent responses.
- **Rule-based evaluation only** — `RuleBasedEvaluator` applies structural rules (empty output, step errors, etc.). LLM-as-judge scoring is not yet implemented.
- **No baseline pinning** — the integration tests verify shape and structure, not specific numeric values. Metric delta values in tests are not asserted against fixed numbers.
- **No concurrency testing** — services are called sequentially; file store concurrency issues would not be caught here.

### How regression thresholds are enforced

The `generate-regression-report` command checks `percentageDelta` for each metric against the thresholds defined in [`src/cli/commands/generate-regression-report.ts`](src/cli/commands/generate-regression-report.ts):

```typescript
const THRESHOLDS: Record<string, number> = {
  evaluationScore: -5,   // score may not drop more than 5%
  successRate:     -3,   // success rate may not drop more than 3%
};
```

When any threshold is exceeded the command exits with code `1`, which fails the GitHub Actions workflow step and blocks the PR/merge.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, CSS Modules |
| Backend | Node.js, Express 4, TypeScript |
| Storage | File-based JSON (`data/` directory — no database required) |
| CLI | ts-node, zero extra runtime dependencies |
| CI | GitHub Actions |

---

## Project Structure

```
agentscope-studio/
│
├── src/
│   ├── core/                        # Shared type definitions (no runtime logic)
│   │   ├── trace-model/             # AgentTrace, AgentStep, TokenUsage
│   │   ├── dataset-model/           # Dataset, DatasetItem, DatasetRun
│   │   ├── evaluation-model/        # EvaluationResult, EvaluationIssue
│   │   ├── replay-model/            # ReplayRequest, ReplayResult
│   │   └── regression-model/        # RegressionReport, RegressionMetricDelta
│   │
│   ├── server/
│   │   ├── api/
│   │   │   ├── routes/              # Express routers (traces, replays, datasets …)
│   │   │   ├── services/            # stats.ts — dashboard aggregates
│   │   │   └── server.ts            # Entry point — mounts all routers
│   │   ├── storage/                 # FileTraceStore
│   │   ├── replay/                  # ReplayService, ReplayUtils
│   │   ├── replay-store/            # FileReplayStore (indexed)
│   │   ├── evaluation/              # EvaluationService, RuleBasedEvaluator
│   │   ├── evaluation-store/        # FileEvaluationStore
│   │   ├── batch-evaluation/        # BatchEvaluationService, BatchEvaluationStore
│   │   ├── dataset-replay/          # BatchReplayService, DatasetReplayStore
│   │   ├── experiments/             # ExperimentStore
│   │   ├── regression-report/       # RegressionReportService, RegressionReportStore
│   │   ├── query/                   # TraceQueryService
│   │   └── analysis/                # CostLatencyAnalyzer
│   │
│   └── cli/
│       ├── index.ts                 # Entrypoint + arg parser + dispatch
│       ├── utils/output.ts          # CI-friendly print helpers
│       └── commands/
│           ├── replay-dataset.ts
│           ├── evaluate-run.ts
│           └── generate-regression-report.ts
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/                  # DataTable, MetricCard, StatusBadge, DiffIndicator …
│       │   └── experiments/         # RunComparisonPanel, RegressionReportPanel
│       ├── features/                # API clients + hooks per domain
│       └── pages/                   # One component per route
│
├── data/                            # Runtime storage (git-ignored)
│   ├── traces/
│   ├── replays/
│   ├── datasets/runs/
│   ├── datasets/evaluations/
│   └── reports/
│
├── ci/datasets/                     # Dataset configs for CI pipelines
├── docs/architecture/               # Mermaid architecture diagrams
└── .github/workflows/               # GitHub Actions CI
```

---

## Developer Guide

### Repository conventions

- **Core types** live in `src/core/` and have zero runtime dependencies — they are imported by both server and (mirrored) frontend code
- **Server modules** follow a consistent pattern: a `Service` class for business logic, a `Store` class for file persistence, and an `index.ts` barrel
- **Frontend features** each live in `frontend/src/features/<name>/` and expose their API client + types through a barrel `index.ts`; pages never import from internal files directly
- **UI primitives** are imported from `frontend/src/components/ui` (barrel), never from individual files

### Adding an evaluator rule

Rules live in `src/server/evaluation/RuleBasedEvaluator.ts`. A rule inspects an `EvaluationTarget` and pushes `EvaluationIssue` objects:

```typescript
// Flag outputs that contain placeholder text
if (typeof output === 'string' && output.includes('[TODO]')) {
  issues.push({
    code:     'CONTAINS_TODO',
    severity: 'warning',
    message:  'Output contains a TODO placeholder.',
  });
}
```

The issue `code` is tracked in regression reports — new codes appearing in the candidate are explicitly called out in the regression summary.

### Adding a dataset workflow

1. Create `ci/datasets/<name>.json` (see [Config file format](#replay-dataset) above)
2. Run it: `npm run cli -- replay-dataset --config ci/datasets/<name>.json`
3. Evaluate: `npm run cli -- evaluate-run --run <runId>`
4. Promote as baseline: update `vars.BASELINE_RUN_ID` in repository settings

### Adding a new API route

1. Create `src/server/api/routes/<name>.ts` exporting a `Router`
2. Mount it in `src/server/api/server.ts`:
   ```typescript
   import { myRouter } from './routes/my-route';
   app.use('/api/my-resource', myRouter);
   ```

### Adding a new frontend page

1. Create `frontend/src/pages/<Name>Page.tsx`
2. Add a `<Route>` in the router
3. Add a nav entry to the `Sidebar` component

---

## UI Pages

**Dashboard (`/`)**
Live health banner (green/red based on error rate), KPI strip (total traces, error rate, avg latency, active experiments), and navigation grid linking to all platform sections.

**Trace Explorer (`/traces`)**
Filterable, paginated table of all captured agent traces. Click any row to open the trace detail view: step tree, latency timeline, token breakdown by step type, and per-step evaluation results.

**Experiments (`/experiments`)**
List of all experiments with run counts and status. Open an experiment to compare two runs side by side — metrics summary, per-item diff table, batch evaluation panel, and regression report generation.

**Datasets (`/datasets`)**
All dataset batch runs with success rate indicators and item counts. Links to per-run evaluation results and run metadata.

**Evaluation Center (`/evaluation`)**
Aggregate view of all single-trace evaluations: rule list, issue count by severity and code, score distribution, and per-evaluation drill-down.

**System Insights (`/insights`)**
Top-10 slowest traces, highest error-rate sessions, latency distribution, and estimated cost analysis across all stored traces.

---

## Future Work

- **Persistent database** — SQLite or PostgreSQL backend for concurrent access and larger trace volumes
- **Real agent execution** — integrate with agent runtimes (LangChain, OpenAI Assistants, custom) for live re-execution instead of synthetic replay
- **LLM-as-judge evaluator** — scoring rubric backed by an LLM alongside the existing rule-based engine
- **Custom evaluator plugins** — load evaluator rules from external modules at runtime
- **Baseline promotion workflow** — CI job that auto-promotes the latest passing run as the new baseline
- **Streaming trace ingestion** — WebSocket endpoint for live capture from long-running agents
- **Multi-tenant support** — project-level namespacing for teams running multiple agents
