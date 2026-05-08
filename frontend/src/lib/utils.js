import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a YYYY-MM-DD string into a local date string without timezone shifts.
 */
export function formatDate(dateStr, options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '';
  const datePart = dateStr.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', options);
}
