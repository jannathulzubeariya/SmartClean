import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper-2)] p-4 relative font-mono text-xs text-[var(--ink)] overflow-x-auto ${className}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--ink)]/15">
        <span className="text-[var(--ink-soft)] font-sans text-xs font-medium">
          {language ? `</> ${language}` : '</> code'}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="min-h-[44px] px-2 text-xs font-sans text-[var(--ink)] hover:text-[var(--ink-soft)] inline-flex items-center gap-1 font-medium select-none cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#2E6B3E]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-[var(--ink)]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="whitespace-pre-wrap leading-relaxed">{code}</pre>
    </div>
  );
};
