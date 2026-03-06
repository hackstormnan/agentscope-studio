import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="card-title">{children}</div>;
}
