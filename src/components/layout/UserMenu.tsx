import { useEffect, useRef, useState } from 'react'
import { LuBell, LuMessageSquare, LuUser, LuSettings, LuLogOut, LuChevronDown } from 'react-icons/lu'
import { cn } from '@/lib/utils'
import { IoPersonCircleSharp } from 'react-icons/io5'

const CURRENT_USER = {
  name: 'Evans Nyongesa',
  role: 'Manager',
  initials: 'EN',
}

const menuItems = [
  { label: 'Profile', icon: LuUser },
  { label: 'Settings', icon: LuSettings },
  { label: 'Log out', icon: LuLogOut, destructive: true },
]

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-1 rounded-sm border border-border bg-card py-1.5 pl-2 pr-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.05)]"
    >
      <button
        type="button"
        title="Messages"
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LuMessageSquare className="size-[18px]" />
      </button>

      <button
        type="button"
        title="Notifications"
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LuBell className="size-[18px]" />
        <span className="absolute right-2 top-2 size-[7px] rounded-full bg-destructive ring-2 ring-card" />
      </button>

      <span className="mx-1.5 h-7 w-px bg-border" />

      <div className="flex flex-col items-end leading-tight">
        <span className="text-[13.5px] font-semibold text-foreground">{CURRENT_USER.name}</span>
        <span className="text-[11.5px] font-medium text-secondary">{CURRENT_USER.role}</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-2 flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-muted cursor-pointer"
      >
        <span>
          <IoPersonCircleSharp size={40} />
        </span>
        <LuChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-48 overflow-hidden rounded-xl border border-border bg-card py-1.5 shadow-lg">
          <div className="border-b border-border px-3.5 py-2.5">
            <p className="text-[13px] font-semibold text-foreground">{CURRENT_USER.name}</p>
            <p className="text-xs text-muted-foreground">{CURRENT_USER.role}</p>
          </div>
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium transition-colors hover:bg-muted',
                item.destructive ? 'text-destructive' : 'text-foreground',
              )}
            >
              <item.icon className="size-[16px]" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
