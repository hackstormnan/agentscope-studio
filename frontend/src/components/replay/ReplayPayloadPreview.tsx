import styles from './ReplayPanel.module.css';

interface ReplayPayloadPreviewProps {
  traceId: string;
  targetStepId: string | null;
  reason: string;
  promptActive: boolean;
  promptText: string;
  inputActive: boolean;
  inputJson: string;
}

/** One row in the preview table. */
function Row({
  label,
  value,
  override = false,
  empty = false,
}: {
  label: string;
  value: string;
  override?: boolean;
  empty?: boolean;
}) {
  return (
    <div className={styles.payloadRow}>
      <span className={styles.payloadKey}>{label}</span>
      <span
        className={`${styles.payloadVal}${override ? ' ' + styles.payloadValOverride : ''}${empty ? ' ' + styles.payloadValNone : ''}`}
      >
        <span className={styles.payloadValEllipsis}>{value}</span>
      </span>
    </div>
  );
}

/** Truncates a string for preview display. */
function preview(s: string, max = 60): string {
  const single = s.replace(/\s+/g, ' ').trim();
  return single.length > max ? single.slice(0, max) + '…' : single;
}

export function ReplayPayloadPreview({
  traceId,
  targetStepId,
  reason,
  promptActive,
  promptText,
  inputActive,
  inputJson,
}: ReplayPayloadPreviewProps) {
  return (
    <div className={styles.payloadPreview}>
      <div className={styles.payloadPreviewHeader}>Replay Payload</div>
      <div className={styles.payloadRows}>
        <Row label="traceId" value={traceId} />
        <Row
          label="targetStepId"
          value={targetStepId ?? '—'}
          empty={!targetStepId}
        />
        <Row
          label="reason"
          value={reason.trim() || '(none)'}
          empty={!reason.trim()}
        />
        <Row
          label="overridePrompt"
          value={promptActive ? preview(promptText) : '(not set)'}
          override={promptActive}
          empty={!promptActive}
        />
        <Row
          label="overrideInput"
          value={inputActive ? preview(inputJson) : '(not set)'}
          override={inputActive}
          empty={!inputActive}
        />
      </div>
    </div>
  );
}
