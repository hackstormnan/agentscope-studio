# Screenshots

Screenshots will be added once a hosted demo environment is set up.

The sections below describe what each screen shows and what to look for.

---

## Dashboard

**Route:** `/`

What you see:
- Health banner (green = error rate within threshold, red = threshold exceeded)
- KPI strip: total traces ingested, overall error rate, average step latency, active experiment count
- Navigation grid linking to all platform sections

---

## Trace Explorer

**Route:** `/traces`

What you see:
- Filterable, paginated table of all captured `AgentTrace` objects
- Filter controls: model name, date range, status (success / error), latency threshold
- Each row: trace ID, agent name, step count, total latency, token usage, status badge

---

## Trace Detail — Step Tree

**Route:** `/traces/:traceId`

What you see:
- Left panel: ordered list of every step the agent took — LLM calls, tool invocations, memory reads, planner decisions, reflection passes
- Each step: type badge, status, latency, token count
- Click a step to load its input/output in the right panel

---

## Trace Detail — Reasoning Graph

**Route:** `/traces/:traceId` → Graph tab

What you see:
- Interactive ReactFlow node graph of the agent's execution tree
- Nodes are positioned by a depth-first layout engine based on `parentId` chains
- Node colours map to step type (LLM call / tool / memory / planner)
- Pan, zoom, click any node to inspect its input, output, and latency
- Edges connect parent → child steps showing causality

**Why this matters:** most trace viewers show a flat list; the graph makes causal chains in multi-step agent runs immediately visible.

---

## Trace Detail — Prompt Diff Viewer

**Route:** `/traces/:traceId` → Diff tab

What you see:
- Two-step selector: pick any two steps in the trace to compare
- Line-by-line diff of the extracted prompt text (priority: `input.prompt` → `input.systemPrompt` → `input.messages` → full JSON)
- Green = added lines, red = removed lines (standard unified diff view)
- Raw mode toggle shows the full input JSON without diffing

**Why this matters:** when debugging why an agent behaved differently across runs, seeing exactly which prompt text changed is the fastest path to root cause.

---

## Experiments

**Route:** `/experiments`

What you see:
- List of all experiments with run counts and status
- Click an experiment to open the **Experiment Detail** view

---

## Experiment Detail — Run Comparison

**Route:** `/experiments/:experimentId`

What you see:
- Two dataset runs selected side by side
- Metrics summary panel: item counts, success rates, evaluation scores per run
- Per-item diff table: each dataset item with run A result vs run B result
- Regression Report panel: generate and display a metric delta report

---

## Regression Report

**Route:** `/experiments/:experimentId` → Regression Report

What you see:
- Metric delta table: `evaluationScore`, `successRate`, `issueCount`, `averageLatency`, `estimatedCost`
- Each metric: baseline value, candidate value, absolute delta, percentage delta, status badge (improved / regressed / unchanged)
- Issue delta table: per-issue-code counts, sorted by magnitude of change
- New issue codes that appear only in the candidate are called out explicitly

---

## Datasets

**Route:** `/datasets`

What you see:
- All batch dataset runs with success rate indicators and item counts
- Link to per-run evaluation results
- Run metadata: dataset ID, experiment ID, started/completed timestamps

---

## Evaluation Center

**Route:** `/evaluation`

What you see:
- Aggregate view of all single-trace evaluations
- Issue breakdown by severity (error / warning) and by issue code
- Score distribution across all evaluations
- Per-evaluation drill-down: issues list, target step, evaluator name

---

## System Insights

**Route:** `/insights`

What you see:
- Top-10 slowest traces (by total latency)
- Highest error-rate sessions
- Latency distribution histogram
- Estimated cost analysis across all stored traces (based on token counts)
