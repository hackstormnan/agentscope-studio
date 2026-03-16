# Demo Walkthrough

A guided tour of AgentScope Studio in under 5 minutes.

## Prerequisites

- Node.js ≥ 20, npm ≥ 9
- Two terminal windows

---

## 1. Start the stack

**Terminal 1 — API server**
```bash
npm install
npm run dev:server        # Express on http://localhost:4000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev               # Vite on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 2. Seed sample trace data

In a third terminal (or Terminal 1 once the server is running):

```bash
npm run sanity:post       # POST a demo AgentTrace to the API
npm run sanity:get        # Confirm it was stored
```

---

## 3. Explore the UI

### Dashboard (`/`)
The health banner shows green (error rate within threshold). The KPI strip shows total traces, avg latency, and active experiments.

### Trace Explorer (`/traces`)
The seeded trace appears in the table. Click it to open the **Trace Detail** view:

- **Step tree** — left panel lists every step the agent took (LLM calls, tool invocations, memory reads)
- **Reasoning Graph** — interactive ReactFlow node graph; drag to pan, scroll to zoom, click any node to inspect its input/output
- **Prompt Diff Viewer** — select any two steps to see a line-by-line diff of their prompts and inputs

### System Insights (`/insights`)
Top-10 slowest traces, error-rate distribution, and estimated cost analysis across all stored traces — populated once you have multiple traces.

---

## 4. Run the full evaluation pipeline (CLI)

```bash
# Step 1: replay a dataset
npm run cli -- replay-dataset \
  --config  ci/datasets/smoke-test.json \
  --dataset ds-demo \
  --experiment demo-exp-001

# Step 2: evaluate the run (copy the runId from step 1 output)
npm run cli -- evaluate-run --run <runId>

# Step 3: generate a regression report (requires a baseline)
npm run cli -- generate-regression-report \
  --baseline  <baselineRunId> \
  --candidate <runId>
```

After step 1 and 2, navigate to **Datasets (`/datasets`)** in the UI to see the run with its success rate and item results.

After step 3, navigate to **Experiments (`/experiments`)** → open `demo-exp-001` → click **Generate Regression Report** to see the metric delta table.

---

## 5. What to look at for a portfolio review

| What | Where |
|---|---|
| Core domain types | [`src/core/`](../src/core/) |
| Replay engine + override merge | [`src/server/replay/`](../src/server/replay/) |
| Rule-based evaluator | [`src/server/evaluation/RuleBasedEvaluator.ts`](../src/server/evaluation/) |
| Regression report service | [`src/server/regression-report/`](../src/server/regression-report/) |
| ReactFlow reasoning graph | [`frontend/src/features/trace-detail/ReasoningGraph.tsx`](../frontend/src/features/trace-detail/ReasoningGraph.tsx) |
| Prompt diff viewer | [`frontend/src/features/trace-detail/PromptDiffViewer.tsx`](../frontend/src/features/trace-detail/PromptDiffViewer.tsx) |
| CI workflow | [`.github/workflows/agentscope-eval.yml`](../.github/workflows/agentscope-eval.yml) |
| Architecture docs | [`docs/architecture/`](architecture/) |
