import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu'
import { navigation } from '@/config/navigation'
import { cn } from '@/lib/utils'

const EXPANDED_WIDTH = 264
const COLLAPSED_WIDTH = 80

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="relative z-20 flex h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5',
          collapsed && 'justify-center px-0',
        )}
      >
        <img src="/PRIMARY.png" alt="Hotelier" className="size-10 shrink-0 rounded-sm object-contain" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="font-display text-[15px] font-semibold leading-none tracking-tight text-white">
                HOTELIER
              </p>
              <p className="mt-1 text-[11px] leading-none text-sidebar-muted">
                Hotel Management by TANZ
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navigation.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-3 text-[10.5px] font-semibold uppercase tracking-wider text-white/80"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <ul
              className={cn(
                'flex flex-col gap-0.5',
                !collapsed && 'relative mt-1.5',
              )}
            >
              {!collapsed && group.items.length > 1 && (
                <span className="absolute bottom-3.5 top-3.5 left-[12px] w-px bg-sidebar-border" />
              )}
              {group.items.map((item) => (
                <li key={item.href} className="relative">
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-sm py-2 text-[13.5px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white',
                        !collapsed && (group.items.length > 1 ? 'pl-7 pr-3' : 'px-3'),
                        collapsed && 'justify-center px-0 py-2.5',
                        isActive && 'bg-sidebar-accent text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {!collapsed && group.items.length > 1 && (
                          <span
                            className={cn(
                              'absolute left-[9px] size-[7px] shrink-0 rounded-full border-2 bg-sidebar transition-colors',
                              isActive
                                ? 'border-secondary'
                                : 'border-sidebar-border group-hover:border-sidebar-muted',
                            )}
                          />
                        )}
                        <item.icon className="size-[18px] shrink-0" />
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / collapse toggle */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13.5px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <LuPanelLeftOpen className="size-[18px] shrink-0" />
          ) : (
            <LuPanelLeftClose className="size-[18px] shrink-0" />
          )}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
