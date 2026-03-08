import { Button } from '../ui/Button';
import { MetricComparisonCard } from './MetricComparisonCard';
import type { ExperimentRunWithSummary, ExperimentRunSummary } from '../../features/experiments/types';
import type { MetricDirection } from './MetricComparisonCard';
import styles from './Experiments.module.css';

interface RunComparisonPanelProps {
  runA:    ExperimentRunWithSummary;
  runB:    ExperimentRunWithSummary;
  onClear: () => void;
}

// ── Metric definitions ─────────────────────────────────────────────────────
//
// direction controls which diff colour is applied:
//   higher-better → positive diff is green (e.g. more successes, higher score)
//   lower-better  → negative diff is green (e.g. fewer errors, less latency)
//   neutral       → no colour (e.g. dataset size doesn't change)

interface MetricDef {
  key:       keyof ExperimentRunSummary;
  label:     string;
  direction: MetricDirection;
  format:    (v: number) => string;
}

const METRICS: MetricDef[] = [
  {
    key: 'datasetSize',
    label: 'Dataset Size',
    direction: 'neutral',
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'successCount',
    label: 'Success Count',
    direction: 'higher-better',
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'errorCount',
    label: 'Error Count',
    direction: 'lower-better',
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'evaluationScore',
    label: 'Eval Score',
    direction: 'higher-better',
    format: (v) => v.toFixed(3),
  },
  {
    key: 'averageLatency',
    label: 'Avg Latency',
    direction: 'lower-better',
    format: (v) => `${Math.round(v)}ms`,
  },
  {
    key: 'estimatedCost',
    label: 'Est. Cost',
    direction: 'lower-better',
    format: (v) => `$${v.toFixed(4)}`,
  },
];

export function RunComparisonPanel({ runA, runB, onClear }: RunComparisonPanelProps) {
  return (
    <div className={styles.compPanel}>
      {/* Panel header */}
      <div className={styles.compHeader}>
        <span className={styles.compTitle}>Run Comparison</span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Selection
        </Button>
      </div>

      {/* Column headers: label col | Run A | Run B | Diff */}
      <div className={styles.compRunHeaders}>
        <span className={styles.compRunLabel}>Metric</span>
        <RunColHeader label="Run A" rs={runA} />
        <RunColHeader label="Run B" rs={runB} />
        <span className={styles.compRunLabel}>Diff (B − A)</span>
      </div>

      {/* One row per metric */}
      {METRICS.map((m) => (
        <MetricComparisonCard
          key={m.key}
          label={m.label}
          valueA={runA.summary[m.key] as number | undefined}
          valueB={runB.summary[m.key] as number | undefined}
          direction={m.direction}
          format={m.format}
        />
      ))}
    </div>
  );
}

function RunColHeader({
  label,
  rs,
}: {
  label: string;
  rs:    ExperimentRunWithSummary;
}) {
  const { run } = rs;
  const configLine = [
    run.config?.promptVersion && `prompt ${run.config.promptVersion}`,
    run.config?.model,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div>
      <div className={styles.compRunLabel}>{label}</div>
      <div className={styles.compRunId}>{run.runId.slice(0, 20)}…</div>
      {configLine && (
        <div className={styles.compRunConfig}>{configLine}</div>
      )}
    </div>
  );
}
