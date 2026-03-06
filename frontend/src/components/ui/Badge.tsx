import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'default' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
