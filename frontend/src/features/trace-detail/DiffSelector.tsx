import type { AgentStep } from '../../lib/api';

interface DiffSelectorProps {
  steps: AgentStep[];
  activeStep: AgentStep | null;
  /** Currently manually-selected comparison step ID, or null for auto. */
  value: string | null;
  onChange: (id: string | null) => void;
}

export function DiffSelector({
  steps,
  activeStep,
  value,
  onChange,
}: DiffSelectorProps) {
  const parentId = activeStep?.parentId ?? null;

  // All steps except the currently active one are valid comparison targets.
  const candidates = steps.filter((s) => s.stepId !== activeStep?.stepId);

  const autoLabel = parentId
    ? `Auto — parent step (${parentId.slice(0, 10)}…)`
    : 'Auto — no parent step';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="text-muted text-sm" style={{ flexShrink: 0 }}>
        Compare with
      </span>
      <select
        className="select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ minWidth: 220 }}
      >
        <option value="">{autoLabel}</option>
        {candidates.map((s) => (
          <option key={s.stepId} value={s.stepId}>
            {s.type} — {s.stepId.slice(0, 14)}…
          </option>
        ))}
      </select>
      {value && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(null)}
          title="Reset to auto (parent step)"
        >
          ✕ Reset
        </button>
      )}
    </div>
  );
}
