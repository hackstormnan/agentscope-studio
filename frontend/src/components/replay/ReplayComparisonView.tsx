import type { AgentStep } from '../../lib/api';
import type { ReplayResult } from '../../features/replay/types';
import styles from './ReplayComparisonView.module.css';

// ── Utilities ──────────────────────────────────────────────────────────────

function prettyJson(val: unknown): string {
  if (val === undefined || val === null) return '(none)';
  try { return JSON.stringify(val, null, 2); }
  catch { return String(val); }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(start: string, end?: string): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Compares producedStep's input against the original step's input.
 * Returns flags indicating which overrides were likely applied.
 */
function detectChanges(
  original: AgentStep,
  producedStep: unknown,
): { promptChanged: boolean; inputChanged: boolean } {
  if (!producedStep || typeof producedStep !== 'object') {
    return { promptChanged: false, inputChanged: false };
  }
  const ps = producedStep as Record<string, unknown>;
  const origInp = original.input as Record<string, unknown> | null;
  const prodInp = ps['input'] as Record<string, unknown> | null;

  const origPrompt =
    origInp && typeof origInp === 'object'
      ? (origInp['prompt'] ?? origInp['systemPrompt'])
      : undefined;
  const prodPrompt =
    prodInp && typeof prodInp === 'object'
      ? (prodInp['prompt'] ?? prodInp['systemPrompt'])
      : undefined;

  const promptChanged = JSON.stringify(origPrompt) !== JSON.stringify(prodPrompt);
  const inputChanged  = JSON.stringify(original.input) !== JSON.stringify(ps['input']);

  return { promptChanged, inputChanged };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ComparisonJsonBlock({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: unknown;
  highlight?: boolean;
}) {
  const text    = prettyJson(value);
  const isEmpty = text === '(none)';

  return (
    <div className={styles.jsonBlock}>
      <div className={styles.jsonBlockLabel}>{label}</div>
      <pre
        className={[
          styles.jsonPre,
          highlight ? styles.jsonPreHighlight : '',
          isEmpty   ? styles.jsonPreEmpty     : '',
        ].filter(Boolean).join(' ')}
      >
        {text}
      </pre>
    </div>
  );
}

function ReplayResultSummary({
  replay,
  original,
}: {
  replay: ReplayResult;
  original: AgentStep;
}) {
  const duration = fmtDuration(replay.startedAt, replay.completedAt);
  const { promptChanged, inputChanged } = replay.producedStep
    ? detectChanges(original, replay.producedStep)
    : { promptChanged: false, inputChanged: false };
  const noOverrides = !promptChanged && !inputChanged;

  return (
    <div className={styles.summary}>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Status</span>
        <span
          className={`badge ${
            replay.status === 'success' ? 'badge-success' :
            replay.status === 'error'   ? 'badge-error'   :
            replay.status === 'running' ? 'badge-warning'  : 'badge-default'
          }`}
          style={{ fontSize: 10 }}
        >
          {replay.status}
        </span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Started</span>
        <span className={styles.summaryMono}>{fmtTime(replay.startedAt)}</span>
      </div>

      {duration && (
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Duration</span>
          <span className={styles.summaryMono}>{duration}</span>
        </div>
      )}

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Overrides</span>
        <span className={styles.summaryTags}>
          {noOverrides && <span className={styles.tagNone}>None applied</span>}
          {promptChanged && <span className={styles.tagActive}>✎ Prompt</span>}
          {inputChanged  && <span className={styles.tagActive}>✎ Input</span>}
        </span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface ReplayComparisonViewProps {
  activeStep: AgentStep | null;
  replay: ReplayResult | null;
}

export function ReplayComparisonView({ activeStep, replay }: ReplayComparisonViewProps) {
  // No replay selected
  if (!replay) {
    return (
      <div className={styles.emptyState}>
        Select a replay from the history list to compare it against the original step.
      </div>
    );
  }

  // Step mismatch
  if (activeStep && replay.targetStepId !== activeStep.stepId) {
    return (
      <div className={styles.mismatchState}>
        <span>⚠</span>
        <span>
          This replay targets step{' '}
          <code>{replay.targetStepId.slice(0, 16)}…</code>, but the selected
          step is <code>{activeStep.stepId.slice(0, 16)}…</code>. Select the
          matching step in the timeline to view the comparison.
        </span>
      </div>
    );
  }

  // No step selected (but replay is selected)
  if (!activeStep) {
    return (
      <div className={styles.emptyState}>
        Select the original step in the timeline to view the comparison.
      </div>
    );
  }

  const ps             = replay.producedStep as Record<string, unknown> | undefined;
  const { promptChanged, inputChanged } = ps
    ? detectChanges(activeStep, ps)
    : { promptChanged: false, inputChanged: false };

  const inputHighlight  = inputChanged && !promptChanged;
  const outputChanged   =
    ps && JSON.stringify(activeStep.output) !== JSON.stringify(ps['output']);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Original vs Replay</span>
        <span className={styles.headerReplayId}>{replay.replayId}</span>
      </div>

      {/* Two columns */}
      <div className={styles.columns}>
        {/* Left — Original Step */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>Original Step</div>
          <div className={styles.cardBody}>
            <div className={styles.metaRow}>
              <span className="badge badge-default">{activeStep.type}</span>
              <span
                className={`badge ${
                  activeStep.status === 'success' ? 'badge-success' :
                  activeStep.status === 'error'   ? 'badge-error'   : 'badge-default'
                }`}
              >
                {activeStep.status}
              </span>
              <span className={styles.latency}>{activeStep.latency}ms</span>
            </div>

            <ComparisonJsonBlock label="Input"  value={activeStep.input}  />
            <ComparisonJsonBlock label="Output" value={activeStep.output} />
          </div>
        </div>

        {/* Right — Replay Result */}
        <div className={`${styles.card} ${styles.cardRight}`}>
          <div className={styles.cardHeader}>Replay Result</div>
          <div className={styles.cardBody}>
            <ReplayResultSummary replay={replay} original={activeStep} />

            {replay.status === 'error' && (
              <div className={styles.errorBox}>
                <span>✕</span>
                <span>{replay.errorMessage ?? 'Replay failed with no error message.'}</span>
              </div>
            )}

            {ps ? (
              <>
                <ComparisonJsonBlock
                  label="Produced Input"
                  value={ps['input']}
                  highlight={promptChanged || inputHighlight}
                />
                <ComparisonJsonBlock
                  label="Produced Output"
                  value={ps['output']}
                  highlight={!!outputChanged}
                />
              </>
            ) : (
              replay.status !== 'error' && (
                <p className={styles.noData}>No produced step data available.</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
