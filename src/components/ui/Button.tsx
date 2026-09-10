import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * The one button primitive for the app. Use it for every page-level action —
 * especially the "New X" / "Add X" create button in a page or section header,
 * which is `variant="primary"` (solid black).
 *
 *   <Button onClick={openCreate}><LuPlus /> New category</Button>
 *   <Button variant="secondary" onClick={...}>Manage UOM</Button>
 *
 * Pass extra layout classes through `className` (e.g. `shrink-0`, `w-full`).
 * `type` defaults to "button" so a header button never submits a surrounding
 * form by accident — pass `type="submit"` for form actions.
 */

type Variant = 'primary' | 'secondary' | 'danger'

const VARIANTS: Record<Variant, string> = {
  // Signature create-action button — solid black.
  primary: 'bg-black text-white shadow-lg shadow-black/15 hover:bg-neutral-800 disabled:opacity-60',
  secondary: 'border bg-transparent text-foreground hover:bg-muted disabled:opacity-60',
  danger: 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/15 hover:opacity-90 disabled:opacity-60',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export default function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
