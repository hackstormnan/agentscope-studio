# System Architecture

AgentScope Studio is a three-layer system: a React frontend, an Express REST API, and a file-based storage tier. All layers communicate through well-typed TypeScript interfaces shared via the `src/core/` model package.

## Component Map

```mermaid
graph TB
    subgraph Browser["Browser — React + Vite"]
        UI_DASH["Dashboard"]
        UI_TRACES["Trace Explorer"]
        UI_EXP["Experiments"]
        UI_DS["Datasets"]
        UI_EVAL["Evaluation Center"]
        UI_INS["System Insights"]
    end

    subgraph API["Express API — port 4000"]
        R_TRACES["/api/traces"]
        R_REPLAYS["/api/replays"]
        R_EVALS["/api/evaluations"]
        R_DS["/api/datasets"]
        R_EXP["/api/experiments"]
        R_REPORTS["/api/reports"]
        R_STATS["/api/stats"]
    end

    subgraph Services["Server Modules"]
        SVC_TRACE["FileTraceStore"]
        SVC_REPLAY["ReplayService\nFileReplayStore"]
        SVC_EVAL["EvaluationService\nFileEvaluationStore"]
        SVC_BATCH_REPLAY["BatchReplayService\nDatasetReplayStore"]
        SVC_BATCH_EVAL["BatchEvaluationService\nBatchEvaluationStore"]
        SVC_EXP["ExperimentStore"]
        SVC_REG["RegressionReportService\nRegressionReportStore"]
        SVC_QUERY["TraceQueryService"]
        SVC_ANALYSIS["CostLatencyAnalyzer"]
    end

    subgraph Storage["File Storage — data/"]
        FS_TRACES["traces/*.json"]
        FS_REPLAYS["replays/*.json\nreplays/index.json"]
        FS_EVALS["evaluations/*.json"]
        FS_DS_RUNS["datasets/runs/*.json"]
        FS_DS_EVALS["datasets/evaluations/*.json"]
        FS_REPORTS["reports/*.json"]
    end

    subgraph CLI["CLI — src/cli/"]
        CLI_REPLAY["replay-dataset"]
        CLI_EVAL["evaluate-run"]
        CLI_REPORT["generate-regression-report"]
    end

    Browser -->|REST| API
    API --> Services
    Services --> Storage
    CLI --> Services
```

## Data Flow (request lifecycle)

```mermaid
sequenceDiagram
    participant Client as Browser / CLI
    participant Router as Express Router
    participant Service as Service Layer
    participant Store as File Store

    Client->>Router: HTTP request
    Router->>Router: validate body / params
    Router->>Service: call business logic
    Service->>Store: read / write JSON files
    Store-->>Service: data / null
    Service-->>Router: result object
    Router-->>Client: JSON response
```

## Module Dependency Rules

```
src/core/          ← imported by both server and frontend
src/server/        ← imports core only (never frontend)
src/cli/           ← imports core + server services (never frontend)
frontend/src/      ← imports core types (mirrored locally) + own features
```

Core modules contain **only type definitions** — no runtime logic, no I/O. This keeps them importable from any layer without pulling in Node.js-specific code.

## Storage Layout

```
data/
├── traces/
│   └── <traceId>.json           # AgentTrace
├── replays/
│   ├── index.json               # compact ReplayResult[] index (newest-first)
│   └── <replayId>.json          # full ReplayResult
├── evaluations/
│   └── <evaluationId>.json      # EvaluationResult
├── datasets/
│   ├── runs/
│   │   ├── index.json           # DatasetRunSummary[] index (newest-first)
│   │   └── <runId>.json         # DatasetBatchRunResponse
│   └── evaluations/
│       └── <runId>.json         # BatchEvaluationResponse (keyed by runId)
└── reports/
    └── <reportId>.json          # RegressionReport
```

Write order for indexed stores: full file first, then index update. A crash between the two leaves the full file intact — it is still retrievable by ID even if absent from the index.
