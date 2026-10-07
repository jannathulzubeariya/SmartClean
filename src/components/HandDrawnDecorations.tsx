import React from 'react';

// Fern sprig edge decoration (Section 6: decoration appears at most one or two per screen, at edges)
export const FernSprig: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 60 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M30 115 C28 90, 32 40, 30 5"
      stroke="#1C1C1A"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Left leaves */}
    <path d="M29 95 C18 90, 10 94, 8 98 C14 100, 24 99, 29 98" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 75 C16 70, 8 75, 6 80 C15 82, 23 80, 30 78" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 55 C18 48, 10 52, 9 58 C17 59, 24 57, 30 56" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 35 C20 28, 14 32, 13 36 C19 38, 25 36, 30 36" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 18 C22 12, 18 15, 17 19 C23 20, 27 19, 30 19" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    {/* Right leaves */}
    <path d="M30 85 C42 80, 50 84, 52 88 C45 91, 36 89, 30 88" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 65 C44 59, 51 63, 53 68 C44 71, 37 68, 30 67" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 45 C42 38, 48 42, 50 46 C42 49, 36 47, 30 46" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
    <path d="M30 26 C40 20, 44 24, 46 27 C40 29, 35 28, 30 27" fill="#B9D1C9" stroke="#1C1C1A" strokeWidth="1.5" />
  </svg>
);

// Sailboat sketchbook illustration from the poster web app preview
export const SailboatSketch: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`analog-card p-4 bg-[var(--paper)] flex flex-col items-center justify-center relative ${className}`}>
    <div className="w-full h-32 flex items-center justify-center relative overflow-hidden">
      <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-40 h-28" aria-hidden="true">
        {/* Soft pencil blue water hatch lines */}
        <path d="M10 98 Q40 92 80 98 T150 96" stroke="#3D5BD1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
        <path d="M25 106 Q60 101 100 106 T145 104" stroke="#3D5BD1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" />
        <path d="M15 113 Q50 110 90 114 T140 111" stroke="#3D5BD1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
        {/* Sailboat hull */}
        <path d="M42 84 L118 84 L106 97 L54 97 Z" fill="var(--paper-2)" stroke="#1C1C1A" strokeWidth="2" strokeLinejoin="round" />
        {/* Mast */}
        <path d="M80 28 L80 84" stroke="#1C1C1A" strokeWidth="2" strokeLinecap="round" />
        {/* Main sail */}
        <path d="M80 32 L112 78 L80 78 Z" fill="none" stroke="#3D5BD1" strokeWidth="2" strokeLinejoin="round" />
        {/* Fore sail */}
        <path d="M76 40 L50 78 L76 78 Z" fill="none" stroke="#1C1C1A" strokeWidth="2" strokeLinejoin="round" />
        {/* Little flag */}
        <path d="M80 28 L88 32 L80 36 Z" fill="#E0866A" />
      </svg>
      {/* Tiny coral status dot */}
      <span className="w-2.5 h-2.5 rounded-full bg-[var(--coral)] absolute top-2 right-2 border border-[var(--ink)]" />
    </div>
    <div className="mt-2 text-center">
      <span className="font-hand text-[var(--red)] text-lg block leading-none">
        better storage with a calm mind
      </span>
    </div>
  </div>
);

// Logo icon: Hand craft stamp from Warm Analog Craft poster
export const HandCraftLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div className={`${className} rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center p-1 shrink-0 shadow-xs`}>
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[var(--ink)]" aria-hidden="true">
      <path
        d="M8 20 C8 15, 11 12, 14 12 C14 10, 16 9, 18 9 C18 7, 20 6, 22 7 C23 8, 23 10, 23 12 C24 12, 25 13, 25 15 C25 21, 21 26, 16 26 C12 26, 8 23, 8 20 Z"
        stroke="#1C1C1A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16 L12 21" stroke="#1C1C1A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 14 L16 21" stroke="#1C1C1A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 14 L20 21" stroke="#1C1C1A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

// 1. INDEXED FILES: Hand-drawn folder + indexed document stack
export const IndexedFilesIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Folder back & tab */}
    <path d="M3 7a1 1 0 0 1 1-1h4l2 2h3" />
    <path d="M3 7v12a1 1 0 0 0 1 1h12" />
    {/* Document indexed inside folder */}
    <path d="M9 4h7l4 4v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M16 4v4h4" />
    {/* File content index lines */}
    <path d="M11 11h5" />
    <path d="M11 14h3" />
  </svg>
);

// 2. RECLAIMABLE: Hand-drawn broom sweeping / cleanup recovery symbol
export const ReclaimableIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Broom handle */}
    <path d="M19 3L12 12" />
    {/* Broom binding */}
    <path d="M10 11.5l3 2" />
    {/* Flared broom bristles */}
    <path d="M10 11.5l-4 6.5a1 1 0 0 0 .8 1.5h8.4a1 1 0 0 0 .8-1.5l-2.5-6.5" />
    {/* Bristle texture lines */}
    <path d="M9 16v3.5" />
    <path d="M12 16v3.5" />
    {/* Subtle sweep / motion strokes at base */}
    <path d="M3 21h3" />
    <path d="M18 20h3" />
  </svg>
);

// 3. DUPLICATES: Hand-drawn two overlapping documents with matching fold
export const DuplicatesIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Back duplicate document */}
    <path d="M8 3h8l4 4v8a1 1 0 0 1-1 1h-2" />
    {/* Front overlapping duplicate document */}
    <path d="M4 7h8l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
    <path d="M12 7v4h4" />
    {/* Matching duplicate content lines */}
    <path d="M6 13h5" />
    <path d="M6 16h5" />
  </svg>
);

// 4. IMPORTANT FILES / SAFEGUARDS: Hand-drawn shield protecting a document
export const SafeguardedIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Protected document in background */}
    <path d="M6 3h8l4 4v3" />
    <path d="M6 3a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h4" />
    <path d="M14 3v4h4" />
    {/* Protective shield */}
    <path d="M14 11c2.5-.8 5 0 5 0v3.5c0 3-2.5 4.8-5 5.5-2.5-.7-5-2.5-5-5.5V11s2.5-.8 5 0Z" />
    {/* Safe checkmark inside shield */}
    <path d="M12.5 14.5l1.5 1.5 2.5-2.5" />
  </svg>
);

export const ImportantFilesIcon = SafeguardedIcon;

// Storage Analyzer line icon: storage disk + chart line
export const StorageAnalyzerIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="4" width="18" height="6" rx="2" />
    <circle cx="7" cy="7" r="1" fill="#1C1C1A" />
    <path d="M3 19h18" />
    <path d="M6 16l4-4 3 3 5-5" />
    <path d="M18 10v3h-3" />
  </svg>
);

// Organize folders icon: organized directory folders
export const OrganizeIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M3 6a1 1 0 0 1 1-1h4l2 2h4a1 1 0 0 1 1 1v2H4a1 1 0 0 1-1-1V6Z" />
    <path d="M7 13a1 1 0 0 1 1-1h4l2 2h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-6Z" />
    <path d="M4 16h2" />
  </svg>
);

// Activity / History clock icon: analog time + history rewind
export const ActivityHistoryIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

// Settings icon: control sliders
export const SettingsControlIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M4 8h8M16 8h4" />
    <circle cx="14" cy="8" r="2" />
    <path d="M4 16h4M12 16h8" />
    <circle cx="10" cy="16" r="2" />
  </svg>
);

