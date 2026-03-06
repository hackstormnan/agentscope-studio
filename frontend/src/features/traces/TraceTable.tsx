import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import type { TraceSummary } from '../../lib/api';

function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface TraceTableProps {
  traces: TraceSummary[];
}

export function TraceTable({ traces }: TraceTableProps) {
  const navigate = useNavigate();

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Trace ID</th>
            <th>Session</th>
            <th>Created</th>
            <th style={{ textAlign: 'right' }}>Latency</th>
            <th style={{ textAlign: 'right' }}>Tokens</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {traces.map((t) => (
            <tr key={t.traceId} onClick={() => navigate(`/traces/${t.traceId}`)}>
              <td>
                {/* Accent colour + tooltip of full ID signals this is a link */}
                <span
                  className="text-mono"
                  title={t.traceId}
                  style={{ color: 'var(--accent-hover)', letterSpacing: '-0.01em' }}
                >
                  {t.traceId.length > 22 ? t.traceId.slice(0, 22) + '…' : t.traceId}
                </span>
              </td>
              <td>
                <span className="text-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t.sessionId}
                </span>
              </td>
              <td>
                <span
                  className="text-muted text-sm"
                  title={new Date(t.createdAt).toLocaleString()}
                >
                  {timeAgo(t.createdAt)}
                </span>
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatLatency(t.totalLatency)}
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {t.totalTokens.toLocaleString()}
              </td>
              <td>
                <Badge variant={t.hasError ? 'error' : 'success'}>
                  {t.hasError ? 'Error' : 'OK'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
