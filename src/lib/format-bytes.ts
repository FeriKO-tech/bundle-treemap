const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Format a byte count as a human readable string (binary, base-1024).
 *
 * @example
 *   formatBytes(0)        // "0 B"
 *   formatBytes(1536)     // "1.5 KB"
 *   formatBytes(2_500_000) // "2.38 MB"
 */
export function formatBytes(bytes: number, fractionDigits = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exp;
  const digits = exp === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : fractionDigits;
  return `${value.toFixed(digits)} ${UNITS[exp]}`;
}

/** Format a percentage (0..1) with sane defaults. */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
