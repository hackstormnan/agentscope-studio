import type { ReactNode, CSSProperties } from 'react';

interface PanelContainerProps {
  /** Section heading rendered above the content. */
  title: ReactNode;
  /** Optional muted description line below the title. */
  subtitle?: ReactNode;
  /** Slot for action elements (buttons, selectors) rendered in the title row. */
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/**
 * PanelContainer — a generic labelled section wrapper used throughout the
 * feature pages.  Keeps the title/action row consistent without duplicating
 * inline styles everywhere.
 *
 * Usage:
 *   <PanelContainer title="Slowest Traces" action={<Button>Export</Button>}>
 *     <DataTable … />
 *   </PanelContainer>
 */
export function PanelContainer({
  title,
  subtitle,
  action,
  children,
  style,
  className = '',
}: PanelContainerProps) {
  return (
    <div style={style} className={className}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: subtitle ? 4 : 12,
        }}
      >
        <div>
          <div className="section-label" style={{ marginBottom: 0 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      {subtitle && <div style={{ marginBottom: 12 }} />}
      {children}
    </div>
  );
}
