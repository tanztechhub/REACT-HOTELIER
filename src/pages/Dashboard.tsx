import { LuTrendingUp, LuBedDouble, LuReceipt, LuUsers, LuLock } from 'react-icons/lu'
import { navigation } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

type Tone = 'navy' | 'blue' | 'amber' | 'green'

const toneStyles: Record<Tone, { bg: string; fg: string; soft: string; badge: string; ring: string }> = {
  navy: { bg: 'bg-primary', fg: 'text-primary-foreground', soft: 'text-white/70', badge: 'bg-white/15', ring: 'text-white' },
  blue: { bg: 'bg-secondary', fg: 'text-secondary-foreground', soft: 'text-white/70', badge: 'bg-white/15', ring: 'text-white' },
  green: { bg: 'bg-accent', fg: 'text-accent-foreground', soft: 'text-white/70', badge: 'bg-white/15', ring: 'text-white' },
  amber: { bg: 'bg-warning', fg: 'text-warning-foreground', soft: 'text-black/55', badge: 'bg-black/10', ring: 'text-black' },
}

const stats: { label: string; value: string; delta: string; icon: typeof LuTrendingUp; tone: Tone }[] = [
  { label: "Today's Revenue", value: '$4,286', delta: '+12.4% vs yesterday', icon: LuTrendingUp, tone: 'navy' },
  { label: 'Occupied Rooms', value: '38 / 52', delta: '73% occupancy', icon: LuBedDouble, tone: 'blue' },
  { label: 'Open Orders', value: '17', delta: '4 in kitchen', icon: LuReceipt, tone: 'amber' },
  { label: 'Active Staff', value: '12', delta: 'On shift now', icon: LuUsers, tone: 'green' },
]

const enabledModules = new Set(['POS', 'KITCHEN', 'ROOMS', 'RECEPTION', 'HOUSEKEEPING'])

function FingerprintRings({ className }: { className?: string }) {
  const radii = [14, 28, 42, 56, 70, 84]
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      {radii.map((r, i) => (
        <circle
          key={r}
          cx="150"
          cy="10"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.22 - i * 0.03}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const allModules = navigation.flatMap((g) => g.items).filter((i) => i.moduleKey)
  const user = useAppSelector((s) => s.auth.user)
  const firstName = user?.firstName ?? 'there'

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          01 &middot; Daily Focus
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {getGreeting()}, {firstName} &mdash; here&apos;s what&apos;s happening across your property today.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const tone = toneStyles[stat.tone]
          return (
            <div
              key={stat.label}
              className={cn('relative overflow-hidden rounded-sm p-5 shadow-sm', tone.bg)}
            >
              <FingerprintRings className={cn('pointer-events-none absolute -right-2 -top-2 size-32', tone.ring)} />
              <div className="relative flex items-center justify-between">
                <span className={cn('text-xs font-medium uppercase tracking-wide', tone.soft)}>
                  {stat.label}
                </span>
                <span className={cn('flex size-8 items-center justify-center rounded-sm', tone.badge, tone.fg)}>
                  <stat.icon className="size-4" />
                </span>
              </div>
              <p className={cn('relative mt-3 font-display text-2xl font-semibold', tone.fg)}>
                {stat.value}
              </p>
              <p className={cn('relative mt-1 text-xs', tone.soft)}>{stat.delta}</p>
            </div>
          )
        })}
      </section>

      <section className="mt-8 rounded-sm border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Your Modules
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This workspace&apos;s plan includes the modules below. Upgrade anytime to unlock more.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {allModules.map((mod) => {
            const enabled = mod.moduleKey ? enabledModules.has(mod.moduleKey) : false
            return (
              <div
                key={mod.href}
                className={`flex items-center gap-3 rounded-sm border px-3.5 py-3 ${
                  enabled
                    ? 'border-border bg-background'
                    : 'border-dashed border-border bg-muted/40 opacity-60'
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${
                    enabled ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <mod.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {mod.label}
                </span>
                {!enabled && <LuLock className="size-3.5 shrink-0 text-muted-foreground" />}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
