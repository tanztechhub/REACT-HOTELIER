import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * One flat, paper-lift stat card — the single design used for every summary
 * tile across the app (Dashboard downward). Flat coloured fill, matching icon
 * chip, a neutral layered shadow so it reads like a sheet lifted off the page.
 *
 * Colour is picked from a fixed non-primary palette by `index` (so a row of
 * cards comes out multi-coloured and breaks the monotony). Pass `tone` for the
 * semantic cases — a warning / bad / good number that should always read the
 * same regardless of position.
 */

type Swatch = { bg: string; text: string; dim: string; chip: string }

const PALETTE: Swatch[] = [
  { bg: 'bg-amber-400', text: 'text-amber-950', dim: 'text-amber-950/70', chip: 'bg-amber-950/10' },
  { bg: 'bg-emerald-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-violet-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-rose-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-sky-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-orange-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-teal-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-fuchsia-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-indigo-500', text: 'text-white', dim: 'text-white/75', chip: 'bg-white/20' },
  { bg: 'bg-lime-400', text: 'text-lime-950', dim: 'text-lime-950/70', chip: 'bg-lime-950/10' },
]

const TONES: Record<'warn' | 'danger' | 'success' | 'info', Swatch> = {
  warn: PALETTE[0],
  danger: PALETTE[3],
  success: PALETTE[1],
  info: PALETTE[4],
}

/** Flat paper-lift shadow — same feel on every colour. */
export const STAT_CARD_SHADOW =
  'shadow-[0_1px_2px_rgba(2,6,23,0.08),0_10px_20px_-8px_rgba(2,6,23,0.30)]'

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export type StatCardProps = {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  /** Small line under the value — a delta, a caption, a count. */
  hint?: ReactNode
  /** Deterministic palette pick; a row should pass its map index. */
  index?: number
  /** Semantic override — always the same colour regardless of position. */
  tone?: 'warn' | 'danger' | 'success' | 'info'
  className?: string
}

export default function StatCard({ label, value, icon, hint, index, tone, className }: StatCardProps) {
  const swatch = tone
    ? TONES[tone]
    : PALETTE[(index ?? hashString(String(label))) % PALETTE.length]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md p-5',
        swatch.bg,
        swatch.text,
        STAT_CARD_SHADOW,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', swatch.dim)}>
          {label}
        </span>
        {icon != null && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', swatch.chip)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint != null && <p className={cn('mt-1 text-xs', swatch.dim)}>{hint}</p>}
    </div>
  )
}
