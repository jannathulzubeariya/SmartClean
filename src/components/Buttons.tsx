import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'normal' | 'small';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'rounded-full font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 ease-out select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

  const sizeClasses =
    size === 'normal'
      ? 'min-h-[44px] px-6 text-sm py-2'
      : 'min-h-[44px] sm:min-h-[38px] px-4 text-xs py-1.5';

  const variants = {
    primary:
      'bg-[var(--ink)] text-[var(--paper)] border-[1.5px] border-[var(--ink)] hover:bg-[var(--ink-soft)] active:translate-y-px',
    secondary:
      'bg-[var(--paper)] text-[var(--ink)] border-[1.5px] border-[var(--ink)] hover:bg-[var(--paper-2)] active:translate-y-px',
    subtle:
      'bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--paper-2)] hover:border-[var(--ink)]',
  };

  return (
    <button
      className={`${base} ${sizeClasses} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
