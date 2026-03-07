import styles from './ReplayPanel.module.css';

interface OverrideStatusSummaryProps {
  promptActive: boolean;
  inputActive: boolean;
}

export function OverrideStatusSummary({ promptActive, inputActive }: OverrideStatusSummaryProps) {
  const neither = !promptActive && !inputActive;

  return (
    <div className={styles.overrideSummary}>
      <span className={styles.overrideSummaryLabel}>Overrides</span>

      {neither && (
        <span className={`${styles.overridePill} ${styles.overridePillNone}`}>
          None — using original inputs
        </span>
      )}

      {promptActive && (
        <span className={`${styles.overridePill} ${styles.overridePillActive}`}>
          ✎ Prompt
        </span>
      )}

      {inputActive && (
        <span className={`${styles.overridePill} ${styles.overridePillActive}`}>
          ✎ Input
        </span>
      )}
    </div>
  );
}
