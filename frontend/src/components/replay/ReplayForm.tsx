import { useState } from 'react';
import type { AgentStep } from '../../lib/api';
import type { ReplayResult } from '../../features/replay/types';
import { createReplay, ReplayApiError } from '../../features/replay/api';
import { Button } from '../ui/Button';
import styles from './ReplayPanel.module.css';

interface ReplayFormProps {
  traceId: string;
  activeStep: AgentStep | null;
  onSuccess: (result: ReplayResult) => void;
}

export function ReplayForm({ traceId, activeStep, onSuccess }: ReplayFormProps) {
  const [overridePrompt, setOverridePrompt] = useState('');
  const [overrideInputRaw, setOverrideInputRaw] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReplayResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Validate overrideInput JSON as the user types
  function handleOverrideInputChange(raw: string) {
    setOverrideInputRaw(raw);
    if (!raw.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(raw);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  }

  function handleReset() {
    setOverridePrompt('');
    setOverrideInputRaw('');
    setReason('');
    setSubmitError(null);
    setLastResult(null);
    setJsonError(null);
  }

  async function handleSubmit() {
    if (!activeStep) return;
    if (overrideInputRaw.trim() && jsonError) return; // block on bad JSON

    setSubmitting(true);
    setSubmitError(null);
    setLastResult(null);

    try {
      // Parse overrideInput if provided
      let parsedInput: unknown = undefined;
      if (overrideInputRaw.trim()) {
        parsedInput = JSON.parse(overrideInputRaw);
      }

      const result = await createReplay({
        traceId,
        targetStepId: activeStep.stepId,
        overrides: {
          ...(overridePrompt.trim()  ? { overridePrompt: overridePrompt.trim() }  : {}),
          ...(parsedInput !== undefined ? { overrideInput: parsedInput } : {}),
        },
        metadata: {
          requestedAt: new Date().toISOString(),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });

      setLastResult(result);
      onSuccess(result);
    } catch (err) {
      if (err instanceof ReplayApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Unexpected error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!activeStep && !submitting && !jsonError;

  return (
    <>
      {/* Target summary */}
      <div className={styles.targetSummary}>
        <span className={styles.targetLabel}>Target step</span>
        {activeStep ? (
          <>
            <span className={`${styles.targetId}`} title={activeStep.stepId}>
              {activeStep.stepId}
            </span>
            <span className="badge badge-default" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {activeStep.type}
            </span>
          </>
        ) : (
          <span className={styles.noTarget}>Select a step in the timeline first</span>
        )}
      </div>

      {/* Override prompt */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Override Prompt
          <span className={styles.fieldHint}>optional</span>
        </label>
        <textarea
          className={styles.textarea}
          placeholder="Replace the prompt sent to the model…"
          value={overridePrompt}
          onChange={(e) => setOverridePrompt(e.target.value)}
          rows={3}
          disabled={submitting}
        />
      </div>

      {/* Override input (JSON) */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Override Input
          <span className={styles.fieldHint}>optional · JSON object</span>
        </label>
        <textarea
          className={`${styles.textarea}${jsonError ? ' ' + styles.textareaError : ''}`}
          placeholder={'{\n  "key": "value"\n}'}
          value={overrideInputRaw}
          onChange={(e) => handleOverrideInputChange(e.target.value)}
          rows={4}
          disabled={submitting}
          spellCheck={false}
        />
        {jsonError && (
          <span className={styles.jsonError}>⚠ {jsonError}</span>
        )}
      </div>

      {/* Reason */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Reason
          <span className={styles.fieldHint}>optional</span>
        </label>
        <input
          type="text"
          className={styles.reasonInput}
          placeholder="e.g. Testing alternative prompt"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
        />
      </div>

      {/* Actions */}
      <div className={styles.formActions}>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Running…' : 'Run Replay'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={submitting}
        >
          Reset
        </Button>
      </div>

      {/* Feedback */}
      {submitError && (
        <div className={styles.submitError}>
          <span>✕</span>
          <span>{submitError}</span>
        </div>
      )}

      {lastResult && lastResult.status === 'success' && (
        <div className={styles.successBanner}>
          <span>✓</span>
          <span>
            Replay complete —{' '}
            <span className={styles.bannerMono}>{lastResult.replayId}</span>
          </span>
        </div>
      )}
    </>
  );
}
