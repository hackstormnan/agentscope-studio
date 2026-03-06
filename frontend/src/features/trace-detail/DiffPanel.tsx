import type { Change } from 'diff';
import styles from './TraceDetail.module.css';

interface DiffPanelProps {
  /** Label shown in the panel header (e.g. "Unified Diff"). */
  label: string;
  /** Short identifier for the step being described (shown right-aligned). */
  fromStepLabel: string;
  toStepLabel: string;
  /** Output of diffLines(leftText, rightText). */
  changes: Change[];
}

export function DiffPanel({
  label,
  fromStepLabel,
  toStepLabel,
  changes,
}: DiffPanelProps) {
  if (changes.length === 0) {
    return <div className={styles.diffEmpty}>No content available for comparison.</div>;
  }

  const allSame = changes.every((c) => !c.added && !c.removed);

  return (
    <>
      <div className={styles.diffPanelHeader}>
        <span>{label}</span>
        <span className={styles.diffPanelStep}>
          {fromStepLabel} → {toStepLabel}
        </span>
      </div>

      {allSame ? (
        <div className={styles.diffSame}>
          Content is identical — no differences found.
        </div>
      ) : (
        <div className={styles.diffCode}>
          {changes.flatMap((change, i) => {
            // Split on newlines; filter trailing empty string from .split('\n')
            const lines = change.value.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();

            const lineClass = change.removed
              ? styles.lineRemoved
              : change.added
              ? styles.lineAdded
              : styles.lineUnchanged;

            const mark = change.removed ? '-' : change.added ? '+' : ' ';

            return lines.map((line, j) => (
              <div key={`${i}-${j}`} className={`${styles.diffLine} ${lineClass}`}>
                <span className={styles.lineMark}>{mark}</span>
                <span>{line || '\u00a0'}</span>
              </div>
            ));
          })}
        </div>
      )}
    </>
  );
}
