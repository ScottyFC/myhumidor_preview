import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : plural ?? singular + 's';
}

/**
 * Compute the weighted overall rating from the three axes.
 * Flavor matters most (50%), burn next (30%), appearance last (20%).
 * Tunable — the constants live here so they're easy to find later.
 */
export function computeOverall(flavor: number, burn: number, appearance: number): number {
  return Math.round((flavor * 0.5 + burn * 0.3 + appearance * 0.2) * 10) / 10;
}

export function formatUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
