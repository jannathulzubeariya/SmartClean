export function formatSize(bytesVal: number | null | undefined): string {
  if (bytesVal === null || bytesVal === undefined || isNaN(bytesVal) || bytesVal <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let val = Number(bytesVal);
  let i = 0;

  while (val >= 1024 && i < units.length - 1) {
    val /= 1024.0;
    i++;
  }

  if (i === 0) {
    return `${Math.round(val)} B`;
  } else if (val >= 100) {
    return `${val.toFixed(1)} ${units[i]}`;
  } else {
    return `${val.toFixed(2)} ${units[i]}`;
  }
}

export function parseSize(sizeStr: string): number {
  if (!sizeStr) return 0;
  const parts = sizeStr.trim().split(/\s+/);
  if (!parts.length) return 0;
  const val = parseFloat(parts[0]);
  if (isNaN(val)) return 0;
  if (parts.length === 1) return Math.round(val);

  const unit = parts[1].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  return Math.round(val * (multipliers[unit] || 1));
}
