import { useState, useEffect } from 'react';
import type { AgentStep } from '../../lib/api';
import type { ReplayResult } from '../../features/replay/types';
import { createReplay, ReplayApiError } from '../../features/replay/api';
import { Button } from '../ui/Button';
import { ReplayOverrideEditor, extractPromptText } from './ReplayOverrideEditor';
import { OverrideStatusSummary } from './OverrideStatusSummary';
import { ReplayPayloadPreview } from './ReplayPayloadPreview';
import styles from './ReplayPanel.module.css';

interface ReplayFormProps {
  traceId: string;
  activeStep: AgentStep | null;
  onSuccess: (result: ReplayResult) => void;
}

function prettyJson(val: unknown): string {
  try { return JSON.stringify(val, null, 2); } catch { return ''; }
}

function validateJson(raw: string): string | null {
  if (!raw.trim()) return null;
  try { JSON.parse(raw); return null; }
  catch (e) { return e instanceof Error ? e.message.split('\n')[0] : 'Invalid JSON'; }
}

export function ReplayForm({ traceId, activeStep, onSuccess }: ReplayFormProps) {
  // ── Editor state ──────────────────────────────────────────────────────────
  const [promptText,        setPromptText]        = useState('');
  const [originalPrompt,    setOriginalPrompt]    = useState('');
  const [inputJson,         setInputJson]         = useState('');
  const [originalInputJson, setOriginalInputJson] = useState('');
  const [inputError,        setInputError]        = useState<string | null>(null);
  const [reason,            setReason]            = useState('');

  // ── Submission state ──────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult,  setLastResult]  = useState<ReplayResult | null>(null);

  // ── Sync editors when the selected step changes ───────────────────────────
  const stepId = activeStep?.stepId;
  useEffect(() => {
    if (!activeStep) {
      setPromptText('');      setOriginalPrompt('');
      setInputJson('');       setOriginalInputJson('');
      setInputError(null);    setSubmitError(null);
      setLastResult(null);
      return;
    }

    const extracted = extractPromptText(activeStep.input);
    const pretty    = prettyJson(activeStep.input);

    setPromptText(extracted);      setOriginalPrompt(extracted);
    setInputJson(pretty);          setOriginalInputJson(pretty);
    setInputError(null);           setSubmitError(null);
    setLastResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  // ── Derived override flags ────────────────────────────────────────────────
  // Active = value differs from original AND is non-empty (reset → not active)
  const promptActive = promptText !== originalPrompt && promptText.trim().length > 0;
  const inputActive  = inputJson  !== originalInputJson && inputJson.trim().length > 0 && !inputError;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleInputChange(raw: string) {
    setInputJson(raw);
    setInputError(validateJson(raw));
  }

  function resetPrompt() { setPromptText(originalPrompt); }
  function resetInput()  { setInputJson(originalInputJson); setInputError(null); }
  function resetAll()    {
    resetPrompt(); resetInput();
    setReason(''); setSubmitError(null); setLastResult(null);
  }

  async function handleSubmit() {
    if (!activeStep || inputError) return;

    setSubmitting(true);
    setSubmitError(null);
    setLastResult(null);

    try {
      const result = await createReplay({
        traceId,
        targetStepId: activeStep.stepId,
        overrides: {
          ...(promptActive ? { overridePrompt: promptText }            : {}),
          ...(inputActive  ? { overrideInput: JSON.parse(inputJson) } : {}),
        },
        metadata: {
          requestedAt: new Date().toISOString(),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });

      setLastResult(result);
      onSuccess(result);
    } catch (err) {
      setSubmitError(
        err instanceof ReplayApiError
          ? err.message
          : err instanceof Error ? err.message : 'Unexpected error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!activeStep && !submitting && !inputError;

  return (
    <>
      {/* Target summary */}
      <div className={styles.targetSummary}>
        <span className={styles.targetLabel}>Target step</span>
        {activeStep ? (
          <>
            <span className={styles.targetId} title={activeStep.stepId}>
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

      {/* Side-by-side override editors */}
      <ReplayOverrideEditor
        activeStep={activeStep}
        promptText={promptText}
        originalPrompt={originalPrompt}
        onPromptChange={setPromptText}
        onPromptReset={resetPrompt}
        inputJson={inputJson}
        originalInputJson={originalInputJson}
        inputError={inputError}
        onInputChange={handleInputChange}
        onInputReset={resetInput}
        disabled={submitting}
      />

      {/* Override status pills */}
      <OverrideStatusSummary promptActive={promptActive} inputActive={inputActive} />

      {/* Live payload preview */}
      <ReplayPayloadPreview
        traceId={traceId}
        targetStepId={activeStep?.stepId ?? null}
        reason={reason}
        promptActive={promptActive}
        promptText={promptText}
        inputActive={inputActive}
        inputJson={inputJson}
      />

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
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Running…' : 'Run Replay'}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll} disabled={submitting}>
          Reset All
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
