import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuCircleAlert, LuCircleCheck, LuInfo, LuTriangleAlert, LuX } from 'react-icons/lu'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'
type ToastItem = { id: number; variant: ToastVariant; message: string }

const DURATIONS: Record<ToastVariant, number> = { success: 4000, info: 4000, warning: 6000, error: 6000 }

const variantConfig: Record<ToastVariant, { icon: IconType; accent: string }> = {
  success: { icon: LuCircleCheck, accent: 'border-l-success text-success' },
  error: { icon: LuCircleAlert, accent: 'border-l-destructive text-destructive' },
  warning: { icon: LuTriangleAlert, accent: 'border-l-warning text-warning' },
  info: { icon: LuInfo, accent: 'border-l-secondary text-secondary' },
}

type ToastApi = { success: (message: string) => void; error: (message: string) => void; warning: (message: string) => void; info: (message: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, variant, message }])
    window.setTimeout(() => dismiss(id), DURATIONS[variant])
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    warning: (message) => push('warning', message),
    info: (message) => push('info', message),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, accent } = variantConfig[toast.variant]
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn('pointer-events-auto flex items-start gap-2.5 rounded-sm border border-l-4 bg-card p-3.5 shadow-lg', accent)}
              >
                <Icon className="mt-0.5 size-[18px] shrink-0" />
                <p className="flex-1 text-sm font-medium text-foreground">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LuX className="size-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
