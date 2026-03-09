import type { AgentStep } from '../../lib/api';
import styles from './AgentsPanel.module.css';

// ── Per-agent summary ─────────────────────────────────────────────────────────

interface AgentSummary {
  agentId:    string;
  agentName?: string;
  agentRole?: string;
  stepCount:  number;
  errorCount: number;
  stepTypes:  Record<string, number>;
}

function buildAgentSummaries(steps: AgentStep[]): AgentSummary[] {
  const map = new Map<string, AgentSummary>();

  for (const step of steps) {
    const id = step.agentId ?? 'default';

    if (!map.has(id)) {
      map.set(id, {
        agentId:    id,
        agentName:  step.agentName,
        agentRole:  step.agentRole,
        stepCount:  0,
        errorCount: 0,
        stepTypes:  {},
      });
    }

    const agent = map.get(id)!;
    agent.stepCount++;
    if (step.status === 'error') agent.errorCount++;
    agent.stepTypes[step.type] = (agent.stepTypes[step.type] ?? 0) + 1;

    // Update name/role if present on any step (later steps win)
    if (step.agentName && !agent.agentName) agent.agentName = step.agentName;
    if (step.agentRole && !agent.agentRole) agent.agentRole = step.agentRole;
  }

  return Array.from(map.values()).sort((a, b) => b.stepCount - a.stepCount);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AgentsPanelProps {
  steps: AgentStep[];
}

export function AgentsPanel({ steps }: AgentsPanelProps) {
  const agents = buildAgentSummaries(steps);

  if (agents.length === 0 || (agents.length === 1 && agents[0].agentId === 'default' && !steps.some((s) => s.agentId))) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>◎</span>
        <div className={styles.emptyTitle}>No multi-agent metadata in this trace</div>
        <div className={styles.emptyDesc}>
          Agent cards appear when steps carry <code>agentId</code> fields.
          This trace appears to be single-agent or uses untagged steps.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {agents.length} agent{agents.length !== 1 ? 's' : ''} participated in this trace
        <span style={{ marginLeft: 8, color: 'var(--text-subtle)' }}>
          · {steps.length} total step{steps.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.grid}>
        {agents.map((agent) => (
          <AgentCard key={agent.agentId} agent={agent} />
        ))}
      </div>
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentSummary }) {
  const isDefaultAgent = agent.agentId === 'default';

  return (
    <div className={`${styles.card}${agent.errorCount > 0 ? ' ' + styles.cardError : ''}`}>
      {/* Card header */}
      <div className={styles.cardHeader}>
        <span className={styles.dot} />
        <div className={styles.cardTitles}>
          <div className={styles.agentName}>
            {agent.agentName ?? (isDefaultAgent ? 'Primary Agent' : agent.agentId)}
          </div>
          {agent.agentRole && (
            <div className={styles.agentRole}>{agent.agentRole}</div>
          )}
        </div>
        {agent.errorCount > 0 && (
          <span className="badge badge-error" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {agent.errorCount} err{agent.errorCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Step type breakdown */}
      <div className={styles.stepTypes}>
        {Object.entries(agent.stepTypes).map(([type, count]) => (
          <StepTypePill key={type} type={type} count={count} />
        ))}
      </div>

      {/* Footer metrics */}
      <div className={styles.cardFooter}>
        <span className={styles.footerItem}>
          <span className={styles.footerLabel}>Steps</span>
          <span className={styles.footerValue}>{agent.stepCount}</span>
        </span>
        <span className={styles.footerItem}>
          <span className={styles.footerLabel}>Errors</span>
          <span className={styles.footerValue} style={{ color: agent.errorCount > 0 ? 'var(--error)' : undefined }}>
            {agent.errorCount}
          </span>
        </span>
        <span className={styles.agentIdLabel} title={agent.agentId}>
          {isDefaultAgent ? 'untagged' : agent.agentId.slice(0, 16)}
        </span>
      </div>
    </div>
  );
}

// ── Step type pill ────────────────────────────────────────────────────────────

const STEP_COLORS: Record<string, string> = {
  llm:        'var(--accent)',
  tool:       'var(--warning)',
  memory:     '#a78bfa',
  planner:    'var(--success)',
  reflection: '#f472b6',
};

function StepTypePill({ type, count }: { type: string; count: number }) {
  const color = STEP_COLORS[type] ?? 'var(--text-muted)';
  return (
    <span className={styles.pill} style={{ borderColor: `${color}40`, color }}>
      {type} <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</strong>
    </span>
  );
}
