import { useState, useEffect, useMemo } from 'react';
import { ErrorState }    from '../components/ui/ErrorState';
import { LoadingState }  from '../components/ui/LoadingState';
import { MetricCard }    from '../components/ui/MetricCard';
import { PanelContainer } from '../components/ui/PanelContainer';
import { ExperimentList } from '../components/experiments/ExperimentList';
import { listExperiments } from '../features/experiments/api';
import type { ExperimentListItem } from '../features/experiments/types';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listExperiments()
      .then(setExperiments)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load experiments'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const metrics = useMemo(() => {
    const totalRuns = experiments.reduce((s, e) => s + e.runCount, 0);
    const withRuns  = experiments.filter((e) => e.runCount > 0).length;
    return { totalRuns, withRuns };
  }, [experiments]);

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="page-title">Experiments</div>
          <div className="page-subtitle">Track, compare, and evaluate prompt experiments</div>
        </div>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState title="Failed to load experiments" message={error} onRetry={load} />
      ) : (
        <>
          {/* Metric strip */}
          <div className="grid-4 mb-8">
            <MetricCard
              label="Experiments"
              value={experiments.length}
              sub="total"
            />
            <MetricCard
              label="Total Runs"
              value={metrics.totalRuns}
              sub="across all experiments"
              variant={metrics.totalRuns > 0 ? 'accent' : 'default'}
            />
            <MetricCard
              label="Active"
              value={metrics.withRuns}
              sub="experiments with runs"
            />
            <MetricCard
              label="Avg Runs"
              value={
                experiments.length > 0
                  ? (metrics.totalRuns / experiments.length).toFixed(1)
                  : '—'
              }
              sub="per experiment"
            />
          </div>

          <PanelContainer
            title="All Experiments"
            subtitle="Click an experiment to view runs, comparisons, and evaluations"
          >
            <ExperimentList experiments={experiments} />
          </PanelContainer>
        </>
      )}
    </div>
  );
}
