import { useState, useEffect, useCallback } from 'react';
import type { AgentTrace, AgentStep } from '../../lib/api';
import type { ReplayResult } from '../../features/replay/types';
import { listTraceReplays } from '../../features/replay/api';
import { ReplayForm } from './ReplayForm';
import { ReplayHistoryList } from './ReplayHistoryList';
import { ReplayComparisonView } from './ReplayComparisonView';
import styles from './ReplayPanel.module.css';

interface ReplayPanelProps {
  trace: AgentTrace;
  activeStep: AgentStep | null;
}

export function ReplayPanel({ trace, activeStep }: ReplayPanelProps) {
  const [history, setHistory] = useState<ReplayResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    listTraceReplays(trace.traceId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [trace.traceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // When a replay completes, prepend it to history (optimistic update)
  // and auto-select it so the user sees the result immediately
  function handleReplaySuccess(result: ReplayResult) {
    setHistory((prev) => {
      // Replace if already in list (e.g. fast double-submit), otherwise prepend
      const exists = prev.findIndex((r) => r.replayId === result.replayId) !== -1;
      return exists
        ? prev.map((r) => (r.replayId === result.replayId ? result : r))
        : [result, ...prev];
    });
    setSelectedReplayId(result.replayId);
  }

  const selectedReplay = history.find((r) => r.replayId === selectedReplayId) ?? null;

  return (
    <>
      <div className={styles.panel}>
        {/* Left column — form */}
        <div className={styles.formCol}>
          <div className={styles.sectionHeader}>Configure Replay</div>
          <div className={styles.formBody}>
            <ReplayForm
              traceId={trace.traceId}
              activeStep={activeStep}
              onSuccess={handleReplaySuccess}
            />
          </div>
        </div>

        {/* Right column — history */}
        <div className={styles.historyCol}>
          <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Replay History</span>
            {history.length > 0 && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {history.length}
              </span>
            )}
          </div>
          <ReplayHistoryList
            results={history}
            loading={historyLoading}
            selectedId={selectedReplayId}
            onSelect={setSelectedReplayId}
          />
        </div>
      </div>

      {/* Comparison view — shown when a replay is selected */}
      <ReplayComparisonView activeStep={activeStep} replay={selectedReplay} />
    </>
  );
}
