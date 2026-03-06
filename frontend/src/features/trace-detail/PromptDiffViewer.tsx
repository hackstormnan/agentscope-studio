import { useState, useMemo } from 'react';
import { diffLines } from 'diff';
import type { AgentStep } from '../../lib/api';
import { DiffSelector } from './DiffSelector';
import { DiffPanel } from './DiffPanel';
import styles from './TraceDetail.module.css';

// ── Text extraction ───────────────────────────────────────────────────────────
// Pulls the most meaningful text from a step's input for comparison.
// Priority: input.prompt → input.systemPrompt → input.messages → full JSON.

function extractPromptText(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'object') return String(input);

  const obj = input as Record<string, unknown>;

  if (typeof obj.prompt === 'string')       return obj.prompt;
  if (typeof obj.systemPrompt === 'string') return obj.systemPrompt;
  if (Array.isArray(obj.messages))          return JSON.stringify(obj.messages, null, 2);

  return JSON.stringify(input, null, 2);
}

function stepLabel(step: AgentStep): string {
  return `${step.type} ${step.stepId.slice(0, 10)}…`;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'diff' | 'raw';

interface PromptDiffViewerProps {
  steps: AgentStep[];
  activeStep: AgentStep | null;
}

export function PromptDiffViewer({ steps, activeStep }: PromptDiffViewerProps) {
  const [manualCompareId, setManualCompareId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('diff');

  // ── Comparison step resolution ─────────────────────────────────────────────
  // Priority: manually chosen step → parent step → null (no comparison available)
  const compareStep = useMemo<AgentStep | null>(() => {
    if (manualCompareId) {
      return steps.find((s) => s.stepId === manualCompareId) ?? null;
    }
    const parentId = activeStep?.parentId;
    if (parentId) {
      return steps.find((s) => s.stepId === parentId) ?? null;
    }
    return null;
  }, [steps, activeStep, manualCompareId]);

  const leftText  = useMemo(() => (compareStep  ? extractPromptText(compareStep.input)  : ''), [compareStep]);
  const rightText = useMemo(() => (activeStep   ? extractPromptText(activeStep.input)   : ''), [activeStep]);
  const changes   = useMemo(() => diffLines(leftText, rightText), [leftText, rightText]);

  // ── Empty / not-ready states ───────────────────────────────────────────────
  if (!activeStep) {
    return (
      <div className={styles.diffViewer}>
        <div className={styles.diffEmpty}>
          Select a step in the timeline to use as the comparison target.
        </div>
      </div>
    );
  }

  if (!compareStep) {
    return (
      <div className={styles.diffViewer}>
        <div className={styles.diffToolbar}>
          <div className={styles.diffToolbarLeft}>
            <DiffSelector
              steps={steps}
              activeStep={activeStep}
              value={manualCompareId}
              onChange={setManualCompareId}
            />
          </div>
        </div>
        <div className={styles.diffEmpty}>
          This step has no parent. Choose a step above to compare against.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.diffViewer}>
      {/* Toolbar */}
      <div className={styles.diffToolbar}>
        <div className={styles.diffToolbarLeft}>
          <DiffSelector
            steps={steps}
            activeStep={activeStep}
            value={manualCompareId}
            onChange={setManualCompareId}
          />
        </div>
        <div className={styles.diffToolbarRight}>
          <button
            className={`btn btn-sm ${viewMode === 'diff' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setViewMode('diff')}
          >
            Diff
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'raw' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Diff view */}
      {viewMode === 'diff' && (
        <DiffPanel
          label="Prompt Diff"
          fromStepLabel={stepLabel(compareStep)}
          toStepLabel={stepLabel(activeStep)}
          changes={changes}
        />
      )}

      {/* Raw view — side-by-side prompts without diffing */}
      {viewMode === 'raw' && (
        <div className={styles.diffRawPanels}>
          <div className={styles.diffRawPanel}>
            <div className={styles.diffPanelHeader}>
              <span>From</span>
              <span className={styles.diffPanelStep}>{stepLabel(compareStep)}</span>
            </div>
            <pre className={styles.diffRawCode}>{leftText || '(empty)'}</pre>
          </div>
          <div className={styles.diffRawPanel}>
            <div className={styles.diffPanelHeader}>
              <span>To</span>
              <span className={styles.diffPanelStep}>{stepLabel(activeStep)}</span>
            </div>
            <pre className={styles.diffRawCode}>{rightText || '(empty)'}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
