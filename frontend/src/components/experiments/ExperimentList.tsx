import { Link } from 'react-router-dom';
import type { ExperimentListItem } from '../../features/experiments/types';
import styles from './Experiments.module.css';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

interface ExperimentListProps {
  experiments: ExperimentListItem[];
}

export function ExperimentList({ experiments }: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '24px 0' }}>
        No experiments yet. Create one via the API or SDK.
      </div>
    );
  }

  return (
    <div className={styles.expList}>
      {experiments.map((exp) => (
        <Link
          key={exp.experimentId}
          to={`/experiments/${encodeURIComponent(exp.experimentId)}`}
          className={styles.expCard}
        >
          <div className={styles.expCardLeft}>
            <div className={styles.expName}>{exp.name}</div>
            {exp.description && (
              <div className={styles.expDesc}>{exp.description}</div>
            )}
          </div>

          <div className={styles.expMeta}>
            <span className={styles.expMetaItem}>{fmtDate(exp.createdAt)}</span>
            <span className={styles.expRunCount}>
              {exp.runCount} {exp.runCount === 1 ? 'run' : 'runs'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
