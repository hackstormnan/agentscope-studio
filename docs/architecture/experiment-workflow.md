# Experiment Workflow

An experiment is a named container that groups dataset runs for systematic A/B comparison. The workflow covers creating runs under an experiment, comparing them in the UI, and generating a regression report that quantifies the difference.

## Full Experiment Lifecycle

```mermaid
flowchart TD
    A(["Define experiment\n(experimentId, name, description)"])
    A --> B["ExperimentStore.saveExperiment"]

    B --> C1["Run A: replay-dataset\n--experiment exp-001"]
    B --> C2["Run B: replay-dataset\n--experiment exp-001\n(different config / overrides)"]

    C1 --> D1["evaluate-run --run <runIdA>"]
    C2 --> D2["evaluate-run --run <runIdB>"]

    D1 --> E["Experiment Detail Page\nSelect Run A + Run B"]
    D2 --> E

    E --> F["RunComparisonPanel\nside-by-side metrics"]
    F --> G["RegressionReportPanel\n(UI) or CLI"]

    G --> H["POST /api/reports/regression\nor: generate-regression-report"]
    H --> I["RegressionReportService.generateReport"]
    I --> J["RegressionReportStore.save\ndata/reports/<reportId>.json"]
    J --> K(["RegressionReport\nwith metric deltas + summary"])
```

## Regression Report Generation

```mermaid
flowchart TD
    IN["baseline runId + candidate runId"]
    IN --> A["BatchEvaluationStore.get(baselineRunId)"]
    IN --> B["BatchEvaluationStore.get(candidateRunId)"]

    A -->|not found| ERR1([404 / CLI error exit 1])
    B -->|not found| ERR2([404 / CLI error exit 1])

    A --> C["RegressionReportService.generateReport"]
    B --> C

    subgraph svc["RegressionReportService"]
        C --> D1["metricDelta per metric\nevaluationScore · successRate\nissueCount · errorIssueCount\nwarningIssueCount"]
        C --> D2["optional: averageLatency\nestimatedCost\n(from experiment run summary)"]
        D1 --> E["classify: improved / regressed / unchanged\nbased on metric polarity"]
        D2 --> E
        E --> F["countIssueCodes\nfind new issue codes in candidate"]
        F --> G["build summary string"]
        G --> H["assemble RegressionReport"]
    end

    H --> I["RegressionReportStore.save"]
    I --> J(["RegressionReport returned"])
```

## Metric Polarity

| Metric | Polarity | Improved when |
|---|---|---|
| `evaluationScore` | higher-better | candidate > baseline |
| `successRate` | higher-better | candidate > baseline |
| `issueCount` | lower-better | candidate < baseline |
| `errorIssueCount` | lower-better | candidate < baseline |
| `warningIssueCount` | lower-better | candidate < baseline |
| `averageLatency` | lower-better | candidate < baseline |
| `estimatedCost` | lower-better | candidate < baseline |

## RegressionReport Structure

```
RegressionReport
├── reportId         "report_<timestamp>_<random>"
├── baselineRunId
├── candidateRunId
├── createdAt
├── summary          human-readable one-liner
└── comparison
    ├── baselineRunId
    ├── candidateRunId
    ├── metricDeltas[]
    │   ├── metric           string
    │   ├── baselineValue?   number
    │   ├── candidateValue?  number
    │   ├── absoluteDelta?   candidate - baseline
    │   ├── percentageDelta? absoluteDelta / |baseline| × 100
    │   └── status           improved | regressed | unchanged
    └── issueDeltas[]
        ├── issueCode
        ├── baselineCount
        ├── candidateCount
        ├── delta            candidateCount - baselineCount
        └── status           improved | regressed | unchanged
```

Issue deltas are sorted by `|delta|` descending — the most-changed codes appear first.

## CI Regression Gate

```mermaid
flowchart LR
    A["generate-regression-report"] --> B{Check thresholds}
    B -->|"evaluationScore drop > 5%\nor successRate drop > 3%"| C(["exit 1\nCI fails"])
    B -->|all within thresholds| D(["exit 0\nCI passes"])
```

Thresholds are defined in `src/cli/commands/generate-regression-report.ts` as a `THRESHOLDS` constant and can be adjusted per project.

## Experiment API Reference

| Endpoint | Description |
|---|---|
| `GET /api/experiments` | List all experiments with run counts |
| `GET /api/experiments/:experimentId` | Get experiment + all runs with summaries |
| `GET /api/experiments/:experimentId/runs/:runId` | Get single run with summary |
| `POST /api/reports/regression` | Generate and persist a regression report |
| `GET /api/reports/:reportId` | Retrieve a stored regression report |
