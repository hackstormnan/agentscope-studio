import { useState, useEffect } from 'react';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { ExperimentList } from '../components/experiments/ExperimentList';
import { listExperiments } from '../features/experiments/api';
import type { ExperimentListItem } from '../features/experiments/types';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

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

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="page-title">Experiments</div>
          <div className="page-subtitle">Track and compare prompt experiments</div>
        </div>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState title="Failed to load experiments" message={error} onRetry={load} />
      ) : (
        <ExperimentList experiments={experiments} />
      )}
    </div>
  );
}
