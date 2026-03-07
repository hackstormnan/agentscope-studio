import styles from './ReplayPanel.module.css';

interface JsonEditorBlockProps {
  label: string;
  hint?: string;
  value: string;
  originalValue: string;
  onChange: (v: string) => void;
  onReset: () => void;
  error: string | null;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  /** 'json' validates with JSON.parse; 'text' skips validation. Default: 'json' */
  mode?: 'json' | 'text';
}

export function JsonEditorBlock({
  label,
  hint,
  value,
  originalValue,
  onChange,
  onReset,
  error,
  disabled = false,
  rows = 5,
  placeholder,
  mode = 'json',
}: JsonEditorBlockProps) {
  const isDirty = value !== originalValue;

  return (
    <div className={styles.editorBlock}>
      <div className={styles.editorHeader}>
        <span className={styles.editorLabel}>
          {label}
          {isDirty && <span className={styles.dirtyDot} title="Modified" />}
          {hint && <span className={styles.editorHint}>{hint}</span>}
        </span>
        <button
          className={styles.editorResetBtn}
          onClick={onReset}
          disabled={disabled || !isDirty}
          title="Reset to original"
          type="button"
        >
          Reset
        </button>
      </div>

      <textarea
        className={`${styles.textarea}${error ? ' ' + styles.textareaError : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        spellCheck={mode === 'text'}
        placeholder={placeholder}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
      />

      {error && (
        <span className={styles.jsonError}>⚠ {error}</span>
      )}
    </div>
  );
}
