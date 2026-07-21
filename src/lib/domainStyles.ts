// Per-domain accent classes, kept in one place so badges, bars, and the
// dashboard stay visually consistent. Full class strings (no interpolation) so
// Tailwind's scanner keeps them.

import type { Domain } from '@/types';

export interface DomainStyle {
  badge: string;
  bar: string;
  text: string;
}

export const DOMAIN_STYLES: Record<Domain, DomainStyle> = {
  arch: {
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    bar: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
  },
  cc: {
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    bar: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
  },
  pe: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  mcp: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  ctx: {
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    bar: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
  },
};
