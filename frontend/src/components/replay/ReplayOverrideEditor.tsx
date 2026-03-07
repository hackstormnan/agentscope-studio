import type { AgentStep } from '../../lib/api';
import { JsonEditorBlock } from './JsonEditorBlock';
import styles from './ReplayPanel.module.css';

/**
 * Extracts prompt-related text from a step's input using a priority chain:
 *   1. input.prompt        — direct prompt string
 *   2. input.systemPrompt  — system-level prompt
 *   3. input.messages      — chat messages array, pretty-printed as JSON
 *
 * Returns an empty string if none of the above are present or input is not
 * a plain object.
 */
export function extractPromptText(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
  const inp = input as Record<string, unknown>;

  if (typeof inp['prompt'] === 'string') return inp['prompt'];
  if (typeof inp['systemPrompt'] === 'string') return inp['systemPrompt'];
  if (inp['messages'] !== undefined) {
    try { return JSON.stringify(inp['messages'], null, 2); } catch { return ''; }
  }
  return '';
}

interface ReplayOverrideEditorProps {
  activeStep: AgentStep | null;
  promptText: string;
  originalPrompt: string;
  onPromptChange: (v: string) => void;
  onPromptReset: () => void;
  inputJson: string;
  originalInputJson: string;
  inputError: string | null;
  onInputChange: (v: string) => void;
  onInputReset: () => void;
  disabled: boolean;
}

export function ReplayOverrideEditor({
  activeStep,
  promptText,
  originalPrompt,
  onPromptChange,
  onPromptReset,
  inputJson,
  originalInputJson,
  inputError,
  onInputChange,
  onInputReset,
  disabled,
}: ReplayOverrideEditorProps) {
  const hasExtractedPrompt = originalPrompt.trim().length > 0;

  return (
    <div className={styles.overrideGrid}>
      {/* ── Prompt override ── */}
      <JsonEditorBlock
        label="Override Prompt"
        hint={hasExtractedPrompt ? '· prefilled from step' : '· optional'}
        value={promptText}
        originalValue={originalPrompt}
        onChange={onPromptChange}
        onReset={onPromptReset}
        error={null}
        disabled={disabled || !activeStep}
        rows={6}
        placeholder={
          activeStep
            ? hasExtractedPrompt
              ? ''
              : 'No prompt found in step.input — type a new prompt…'
            : 'Select a step first…'
        }
        mode="text"
      />

      {/* ── Input override (JSON) ── */}
      <JsonEditorBlock
        label="Override Input"
        hint="· JSON"
        value={inputJson}
        originalValue={originalInputJson}
        onChange={onInputChange}
        onReset={onInputReset}
        error={inputError}
        disabled={disabled || !activeStep}
        rows={6}
        placeholder={activeStep ? '' : 'Select a step first…'}
        mode="json"
      />
    </div>
  );
}
