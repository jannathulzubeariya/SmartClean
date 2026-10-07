import React from 'react';

export type ChipVariant = 'in-progress' | 'review' | 'completed' | 'neutral';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'neutral', className = '' }) => {
  const styles = {
    'in-progress': {
      bg: 'bg-[#B9D1C9]', // sage / teal fill
      border: 'border-[var(--ink)]',
      dot: 'bg-[#3D5BD1]',
      text: 'text-[var(--ink)]',
    },
    'review': {
      bg: 'bg-[#F2D7CE]', // pale coral fill
      border: 'border-[var(--ink)]',
      dot: 'bg-[var(--coral)]',
      text: 'text-[var(--ink)]',
    },
    'completed': {
      bg: 'bg-[#D2E4D0]', // pale green fill
      border: 'border-[var(--ink)]',
      dot: 'bg-[#2E6B3E]',
      text: 'text-[var(--ink)]',
    },
    'neutral': {
      bg: 'bg-[var(--paper-2)]',
      border: 'border-[var(--ink)]',
      dot: 'bg-[var(--ink-soft)]',
      text: 'text-[var(--ink)]',
    },
  };

  const current = styles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--ink)] text-xs font-medium ${current.bg} ${current.text} shrink-0 select-none ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} shrink-0`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
