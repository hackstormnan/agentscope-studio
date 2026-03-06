import type { AgentTrace } from '../../lib/api';
import styles from './TraceDetail.module.css';

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

interface TraceHeaderProps {
  trace: AgentTrace;
}

export function TraceHeader({ trace }: TraceHeaderProps) {
  const { metadata, steps, sessionId, traceId } = trace;

  return (
    <div className={styles.traceHeader}>
      <div className="page-title">
        <span className="text-mono">{traceId}</span>
      </div>
      <div className={styles.metaRow}>
        <MetaItem label="Session" value={sessionId} mono />
        <Sep />
        <MetaItem label="Model" value={metadata.model || '—'} />
        <Sep />
        <MetaItem label="Latency" value={fmtMs(metadata.totalLatency)} />
        <Sep />
        <MetaItem label="Tokens" value={metadata.totalTokens.toLocaleString()} />
        <Sep />
        <MetaItem label="Cost" value={`$${metadata.cost.toFixed(4)}`} />
        <Sep />
        <MetaItem label="Steps" value={String(steps.length)} />
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className={styles.metaItem}>
      {label}{' '}
      <span className={mono ? styles.metaValueMono : styles.metaValue}>
        {value}
      </span>
    </span>
  );
}

function Sep() {
  return <span className={styles.metaSep}>·</span>;
}
