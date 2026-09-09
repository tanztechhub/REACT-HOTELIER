import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LuMenu } from 'react-icons/lu'
import Sidebar from '@/components/layout/Sidebar'
import LicenseBanner from '@/components/layout/LicenseBanner'
import { useAppSelector } from '@/store/hooks'
import { resolveLogoUrl } from '@/lib/api'

export default function AppShell() {
  const [mobileNav, setMobileNav] = useState(false)
  const logoUrl = useAppSelector((s) => s.tenant.logoUrl)

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <LicenseBanner />

      {/* Mobile top bar — the sidebar is hidden below `lg`; the hamburger
          opens it as a drawer. */}
      <header className="flex items-center gap-3 border-b border-sidebar-border bg-primary px-3 py-2 text-primary-foreground lg:hidden">
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

        <main className="scrollbar-none relative min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
