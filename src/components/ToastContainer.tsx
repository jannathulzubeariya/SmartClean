import React from 'react';
import { useScan } from '../context/ScanContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { FramedIcon } from './FramedIcon';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useScan();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let badgeColor = 'bg-[var(--paper-2)]';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          badgeColor = 'bg-[#B9D1C9]';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          badgeColor = 'bg-[#F2D7CE]';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          badgeColor = 'bg-[#F2D7CE]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 analog-card paper-grain text-xs text-[var(--ink)] animate-in fade-in slide-in-from-bottom-2 duration-150 ${badgeColor}`}
          >
            <FramedIcon icon={Icon} size="sm" />
            <div className="flex-1 font-medium leading-snug pt-0.5">
              {toast.message}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[var(--ink)] hover:text-[var(--ink-soft)] cursor-pointer p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
