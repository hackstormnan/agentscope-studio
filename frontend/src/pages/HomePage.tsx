import { LinkButton } from '../components/ui/Button';
import styles from './HomePage.module.css';

const FEATURES = [
  {
    icon: '⬡',
    title: 'Trace Execution',
    desc: 'Capture every step — LLM calls, tool uses, memory reads, and planner decisions — with full input/output payloads and latency breakdowns.',
  },
  {
    icon: '◈',
    title: 'Aggregate Stats',
    desc: 'Token usage, latency distributions, error rates, and cost breakdowns across all sessions and configurable time windows.',
  },
  {
    icon: '◎',
    title: 'Deep Inspection',
    desc: 'Dive into individual traces with a visual execution timeline, reasoning graph, and side-by-side prompt diff viewer.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLabel}>Observability Platform</div>
        <h1 className={styles.heroTitle}>AgentScope Studio</h1>
        <p className={styles.heroSub}>
          Track every LLM call, tool invocation, and decision your AI agents make.
          Debug failure modes faster and ship with confidence.
        </p>
        <div className={styles.heroActions}>
          <LinkButton to="/traces" variant="primary" size="lg">
            Enter Studio →
          </LinkButton>
          <LinkButton to="/traces" variant="ghost" size="lg">
            View Traces
          </LinkButton>
        </div>
      </section>

      <section className={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <div className={styles.featureTitle}>{f.title}</div>
            <div className={styles.featureDesc}>{f.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
