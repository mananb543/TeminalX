/**
 * TerminalX - Financial Number Formatters
 * Institutional typography standards with Indian Rupee (INR) and Global standards
 */

export function formatINR(val: number, includeDecimals = true): string {
  if (isNaN(val)) return '₹0.00';
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  // Format with Indian numbering system (Lakhs & Crores)
  const parts = absVal.toFixed(includeDecimals ? 2 : 0).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = parts.length > 1 ? `${res}.${parts[1]}` : res;
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function formatUSD(val: number): string {
  if (isNaN(val)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatPercent(val: number, includeSign = true): string {
  if (isNaN(val)) return '0.00%';
  const sign = includeSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function formatLargeNumber(val: number): string {
  if (Math.abs(val) >= 1e7) {
    return `${(val / 1e7).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 1e5) {
    return `${(val / 1e5).toFixed(2)} L`;
  }
  if (Math.abs(val) >= 1e3) {
    return `${(val / 1e3).toFixed(1)} K`;
  }
  return val.toLocaleString('en-IN');
}
