import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LuMenu, LuRefreshCw } from 'react-icons/lu'
import Sidebar from '@/components/layout/Sidebar'
import LicenseBanner from '@/components/layout/LicenseBanner'
import { useAppSelector } from '@/store/hooks'
import { resolveLogoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

// The app scrolls inside <main>, not the document, so the browser's own
// pull-to-refresh never fires. This re-implements it: pull down while <main>
// is at the top, past the threshold, and the page reloads.
const PTR_RESIST = 0.6
const PTR_THRESHOLD = 64
const PTR_MAX = 100

export default function AppShell() {
  const [mobileNav, setMobileNav] = useState(false)
  const logoUrl = useAppSelector((s) => s.tenant.logoUrl)

  const mainRef = useRef<HTMLElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const drag = useRef<{ startY: number; active: boolean } | null>(null)
  const pullRef = useRef(0)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const reset = () => { pullRef.current = 0; setPull(0) }

    const onStart = (e: TouchEvent) => {
      if (refreshing || e.touches.length !== 1 || el.scrollTop > 0) { drag.current = null; return }
      drag.current = { startY: e.touches[0].clientY, active: false }
    }
    const onMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d || refreshing) return
      const dy = e.touches[0].clientY - d.startY
      if (dy <= 0 || el.scrollTop > 0) {
        if (d.active) { d.active = false; reset() }
        return
      }
      d.active = true
      e.preventDefault() // stop native overscroll while we own the gesture
      const next = Math.min(dy * PTR_RESIST, PTR_MAX)
      pullRef.current = next
      setPull(next)
    }
    const onEnd = () => {
      const d = drag.current
      drag.current = null
      if (!d || !d.active) return
      if (pullRef.current >= PTR_THRESHOLD) {
        setRefreshing(true)
        setPull(PTR_THRESHOLD)
        window.setTimeout(() => window.location.reload(), 400)
      } else {
        reset()
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [refreshing])

  const indicatorY = (refreshing ? PTR_THRESHOLD : pull) - 44
  const progress = Math.min(pull / PTR_THRESHOLD, 1)

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <LicenseBanner />

      {/* Mobile top bar — the sidebar is hidden below `lg`; the hamburger
          opens it as a drawer. Fills the safe area so the brand colour runs
          up behind the status bar. */}
      <header
        className="flex items-center gap-3 border-b border-sidebar-border bg-primary px-3 pb-2 text-primary-foreground lg:hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <button
          type="button"
          onClick={() => setMobileNav(true)}
          aria-label="Open menu"
          className="rounded-sm p-1.5 transition-colors hover:bg-white/10"
        >
          <LuMenu className="size-5" />
        </button>
        <img
          src={resolveLogoUrl(logoUrl) ?? '/PRIMARY.png'}
          alt=""
          className="size-6 shrink-0 rounded-sm object-contain"
        />
        <span className="font-display text-sm font-extrabold tracking-tight">HOTELIER</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar className="hidden lg:flex" />

        <AnimatePresence>
          {mobileNav && (
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
              <motion.div
                className="absolute inset-y-0 left-0"
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <Sidebar mobile onNavigate={() => setMobileNav(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main ref={mainRef} className="scrollbar-none relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {(pull > 0 || refreshing) && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
              style={{
                transform: `translateY(${indicatorY}px)`,
                transition: drag.current?.active ? 'none' : 'transform .25s ease',
              }}
            >
              <span className="mt-2 flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg">
                <LuRefreshCw
                  className={cn('size-4', refreshing && 'animate-spin')}
                  style={refreshing ? undefined : { transform: `rotate(${pull * 2.6}deg)`, opacity: 0.35 + progress * 0.65 }}
                />
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
