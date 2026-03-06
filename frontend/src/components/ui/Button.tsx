import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

function cls(variant: Variant, size: Size, extra = ''): string {
  const v = `btn btn-${variant}`;
  const s = size === 'sm' ? ' btn-sm' : size === 'lg' ? ' btn-lg' : '';
  return `${v}${s}${extra ? ' ' + extra : ''}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button className={cls(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link to={to} className={cls(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
