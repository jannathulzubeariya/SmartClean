import React from 'react';
import { LucideIcon } from 'lucide-react';

export type CraftIconComponent = React.ComponentType<{
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

interface FramedIconProps {
  icon: LucideIcon | CraftIconComponent;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  framed?: boolean;
}

export const FramedIcon: React.FC<FramedIconProps> = ({
  icon: Icon,
  size = 'md',
  className = '',
  framed = true
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', icon: 'w-4 h-4', iconPx: 16 },
    md: { box: 'w-10 h-10', icon: 'w-5 h-5', iconPx: 20 },
    lg: { box: 'w-12 h-12', icon: 'w-6 h-6', iconPx: 24 },
  };

  const current = sizeMap[size];

  if (!framed) {
    return (
      <div className={`${current.box} flex items-center justify-center shrink-0 ${className}`}>
        <Icon
          size={current.iconPx}
          className={`${current.icon} text-[var(--ink)] stroke-2 stroke-linecap-round stroke-linejoin-round shrink-0`}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className={`${current.box} rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center shrink-0 ${className}`}
      aria-hidden="true"
    >
      <Icon
        size={current.iconPx}
        className={`${current.icon} text-[var(--ink)] shrink-0`}
      />
    </div>
  );
};
