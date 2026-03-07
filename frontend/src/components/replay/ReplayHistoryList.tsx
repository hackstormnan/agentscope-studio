import type { ReplayResult } from '../../features/replay/types';
import { ReplayHistoryItem } from './ReplayHistoryItem';
import styles from './ReplayPanel.module.css';

interface ReplayHistoryListProps {
  results: ReplayResult[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ReplayHistoryList({
  results,
  loading,
  selectedId,
  onSelect,
}: ReplayHistoryListProps) {
  if (loading) {
    return (
      <div className={styles.historyList}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 62, margin: '8px 12px', borderRadius: 6, opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        No replays yet.<br />Run a replay to see history here.
      </div>
    );
  }

  return (
    <div className={styles.historyList}>
      {results.map((r) => (
        <ReplayHistoryItem
          key={r.replayId}
          result={r}
          isSelected={r.replayId === selectedId}
          onClick={() => onSelect(r.replayId)}
        />
      ))}
    </div>
  );
}
