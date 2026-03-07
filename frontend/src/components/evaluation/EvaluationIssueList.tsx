import type { EvaluationIssue, EvaluationSeverity } from '../../features/evaluation/types';
import styles from './EvaluationPanel.module.css';

function severityClass(s: EvaluationSeverity): string {
  if (s === 'error')   return styles.sevError;
  if (s === 'warning') return styles.sevWarning;
  return styles.sevInfo;
}

interface EvaluationIssueListProps {
  issues: EvaluationIssue[];
}

export function EvaluationIssueList({ issues }: EvaluationIssueListProps) {
  if (issues.length === 0) {
    return <div className={styles.issuesEmpty}>No issues found — all checks passed.</div>;
  }

  return (
    <div className={styles.issueList}>
      {issues.map((issue, i) => (
        <div key={i} className={styles.issueRow}>
          <span className={`${styles.sevChip} ${severityClass(issue.severity)}`}>
            {issue.severity}
          </span>
          <div className={styles.issueBody}>
            <div className={styles.issueTitle}>
              <span className={styles.issueCode}>{issue.code}</span>
              {' — '}
              {issue.title}
            </div>
            <div className={styles.issueDesc}>{issue.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
