import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuArrowDownLeft, LuArrowUpRight, LuBanknote, LuCircleAlert, LuClipboardList, LuLoaderCircle, LuLock,
  LuReceiptText, LuTable2, LuTrendingUp, LuUndo2, LuUsers, LuWallet,
} from 'react-icons/lu'
import { navigation } from '@/config/navigation'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store/hooks'
import { useWorkingLocation } from '@/lib/useWorkingLocation'
import StatCard from '@/components/ui/StatCard'
import { cn } from '@/lib/utils'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const formatKes = (value: number) => `KSh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

// ---- Revenue dashboard — real, live data, for the roles allowed to see
// money (Super Admin, Manager — Accountant's turn is still pending; every
// other role keeps the plain "Your Modules" view below until its own
// dashboard is built — this is being rolled out role by role, see the
// hotelier_dashboard_rollout memory). Scoped by whichever location(s) the
// viewing employee is actually assigned to: a floating Super Admin with no
// assignment sees the whole property by default (same as before), a Manager
// pinned to one branch is locked to it, and one pinned to several gets a
// picker restricted to just those — same convention as Receipts/Tables/POS. ----

type Cards = { totalRevenue: number; netRevenue: number; totalExpenses: number; netProfit: number }
type TopItem = { name: string; qty: number; revenue: number }
type CountBucket = { name: string; count: number; total: number }
type LocationBucket = { locationId: string | null; name: string; revenue: number; percentOfTotal: number }
type MethodBucket = { name: string; total: number; percentOfTotal: number }
type EmployeeBucket = { name: string; total: number; percentOfTotal: number }
type CustomerBucket = { name: string; revenue: number; percentOfTotal: number }
type Debtors = { total: number }

type SalesReport = {
  cards: Cards
  topItems: TopItem[]
  expensesByCategory: CountBucket[]
  salesByLocation: LocationBucket[]
  byPaymentMethod: MethodBucket[]
  byEmployee: EmployeeBucket[]
  byCustomer: CustomerBucket[]
  debtors: Debtors
  returns: { count: number; value: number }
}

type OrderSummary = { id: string; status: string }
type TableSummary = { id: string; status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'; capacity: number; isActive: boolean }
type TransactionRow = {
  id: string
  transactionNo: string
  direction: 'IN' | 'OUT'
  source: string
  amount: string | number
  createdAt: string
  description: string | null
  paymentMethod: { name: string } | null
  customer: { firstName: string; lastName: string | null } | null
  supplier: { name: string } | null
}

const NON_FINAL_STATUSES = ['OPEN', 'PREPARING', 'READY', 'SERVED']
const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')
type LocationOption = { id: string; name: string }

function RevenueDashboard() {
  const [locations, setLocations] = useState<LocationOption[]>([])
  const { fixed: fixedLocation, options: pickableLocations, selectedId: selectedLocationId, setLocation, effectiveId: effectiveLocationId } = useWorkingLocation(locations, { persist: false })

  const [report, setReport] = useState<SalesReport | null>(null)
  const [activeOrderCount, setActiveOrderCount] = useState(0)
  const [tables, setTables] = useState<TableSummary[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const locQuery = effectiveLocationId ? `&locationId=${effectiveLocationId}` : ''
      const [salesResponse, ordersResponse, tablesResponse, transactionsResponse, locationResponse] = await Promise.all([
        api<SalesReport>(`/reports/sales?period=day${locQuery}`),
        api<{ orders: OrderSummary[] }>(`/pos/orders?channel=FOOD${locQuery}`),
        api<{ tables: TableSummary[] }>(`/tables${effectiveLocationId ? `?locationId=${effectiveLocationId}` : ''}`),
        api<{ transactions: TransactionRow[] }>(`/transactions?limit=8${locQuery}`),
        api<{ locations: LocationOption[] }>('/locations'),
      ])
      setReport(salesResponse)
      setActiveOrderCount(ordersResponse.orders.filter((o) => NON_FINAL_STATUSES.includes(o.status)).length)
      setTables(tablesResponse.tables)
      setTransactions(transactionsResponse.transactions)
      setLocations(locationResponse.locations)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the dashboard')
    } finally {
      setLoading(false)
    }
  }, [effectiveLocationId])

  useEffect(() => { void load() }, [load])

  const locationPicker = fixedLocation ? (
    <span className="text-sm font-medium text-muted-foreground">{fixedLocation.name}</span>
  ) : pickableLocations.length > 0 ? (
    <select aria-label="Filter by location" value={selectedLocationId} onChange={(e) => setLocation(e.target.value)} className="input w-auto">
      <option value="">All locations</option>
      {pickableLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  ) : null

  if (loading) {
    return <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading today's overview…</div>
  }
  if (error || !report) {
    return <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error || 'Could not load the dashboard'}</div>
  }

  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED')
  const activeTables = tables.filter((t) => t.isActive)
  const estimatedGuests = occupiedTables.reduce((s, t) => s + t.capacity, 0)

  return (
    <>
      {locationPicker && <div className="mt-7 flex justify-end">{locationPicker}</div>}
      <section className={locationPicker ? 'mt-3' : 'mt-7'}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's financial overview</p>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={0} label="Total Revenue" value={formatKes(report.cards.totalRevenue)} icon={<LuWallet className="size-4" />} hint="Cash actually received" />
          <StatCard index={1} label="Net Revenue" value={formatKes(report.cards.netRevenue)} icon={<LuTrendingUp className="size-4" />} hint="Sold − cost of goods" />
          <StatCard index={2} label="Total Expenses" value={formatKes(report.cards.totalExpenses)} icon={<LuReceiptText className="size-4" />} />
          <StatCard index={3} label="Net Profit" value={formatKes(report.cards.netProfit)} icon={<LuBanknote className="size-4" />} hint="Net revenue − expenses" />
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Right now</p>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={4} label="Active Orders" value={String(activeOrderCount)} icon={<LuClipboardList className="size-4" />} hint="Open, preparing, ready or served" />
          <StatCard index={5} label="Tables Occupied" value={`${occupiedTables.length} / ${activeTables.length}`} icon={<LuTable2 className="size-4" />} hint={estimatedGuests > 0 ? `~${estimatedGuests} guests seated now` : 'No one seated right now'} />
          <StatCard tone="warn" label="Sales on Credit" value={formatKes(report.debtors.total)} icon={<LuUsers className="size-4" />} hint="Owed by customers + unsettled rooms" />
          <StatCard index={6} label="Processed Returns" value={String(report.returns.count)} icon={<LuUndo2 className="size-4" />} hint={report.returns.value > 0 ? formatKes(report.returns.value) : undefined} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <MiniBreakdown title="Sales by Location" rows={report.salesByLocation.map((l) => ({ key: l.locationId ?? 'unassigned', label: l.name, value: l.revenue, percent: l.percentOfTotal }))} />
        <MiniBreakdown title="Sales by Payment Method" rows={report.byPaymentMethod.map((m) => ({ key: m.name, label: m.name, value: m.total, percent: m.percentOfTotal }))} />
        <MiniBreakdown title="Sales by Employee" rows={report.byEmployee.map((e) => ({ key: e.name, label: e.name, value: e.total, percent: e.percentOfTotal }))} />
        <MiniBreakdown title="Sales by Customer" rows={report.byCustomer.map((c) => ({ key: c.name, label: c.name, value: c.revenue, percent: c.percentOfTotal }))} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-sm border bg-card">
          <header className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">Top 10 Selling Menu Items</h2>
            <Link to="/reports" className="text-xs font-semibold text-secondary hover:underline">Full report →</Link>
          </header>
          {report.topItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No items sold today yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-primary text-xs uppercase text-primary-foreground"><tr><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5 text-right">Qty</th><th className="px-4 py-2.5 text-right">Revenue</th></tr></thead>
              <tbody>{report.topItems.map((i, idx) => (
                <tr key={i.name} className="border-t"><td className="px-4 py-2.5">{idx + 1}. {i.name}</td><td className="px-4 py-2.5 text-right tabular-nums">{i.qty}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKes(i.revenue)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-sm border bg-card">
          <header className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">Top Expense Categories</h2>
            <Link to="/finance/expenses" className="text-xs font-semibold text-secondary hover:underline">View expenses →</Link>
          </header>
          {report.expensesByCategory.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No expenses recorded today.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-primary text-xs uppercase text-primary-foreground"><tr><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5 text-right">Times Paid</th><th className="px-4 py-2.5 text-right">Total</th></tr></thead>
              <tbody>{report.expensesByCategory.slice(0, 8).map((c) => (
                <tr key={c.name} className="border-t"><td className="px-4 py-2.5 font-medium">{c.name}</td><td className="px-4 py-2.5 text-right tabular-nums">{c.count}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKes(c.total)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-sm border bg-card">
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Latest Transactions</h2>
          <Link to="/finance/transactions" className="text-xs font-semibold text-secondary hover:underline">View all →</Link>
        </header>
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="divide-y">
            {transactions.map((t) => {
              const who = t.customer ? `${t.customer.firstName} ${t.customer.lastName ?? ''}`.trim() : t.supplier?.name ?? t.description ?? titleCase(t.source)
              return (
                <div key={t.id} className="flex items-center gap-3 p-3.5">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-sm', t.direction === 'IN' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {t.direction === 'IN' ? <LuArrowDownLeft className="size-4" /> : <LuArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{who}</p>
                    <p className="text-xs text-muted-foreground">{titleCase(t.source)}{t.paymentMethod ? ` · ${t.paymentMethod.name}` : ''} · {new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <p className={cn('shrink-0 font-semibold tabular-nums', t.direction === 'IN' ? 'text-success' : 'text-destructive')}>{t.direction === 'IN' ? '+' : '−'}{formatKes(Number(t.amount))}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function MiniBreakdown({ title, rows }: { title: string; rows: { key: string; label: string; value: number; percent: number }[] }) {
  const top = rows.slice(0, 5)
  return (
    <div className="rounded-sm border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to="/reports" className="text-xs font-semibold text-secondary hover:underline">Full report →</Link>
      </div>
      {top.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No activity today.</p>
      ) : (
        <div className="space-y-3">
          {top.map((r) => (
            <div key={r.key}>
              <div className="flex items-center justify-between text-sm"><span className="truncate font-medium">{r.label}</span><span className="shrink-0 pl-2 tabular-nums font-semibold">{formatKes(r.value)}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, Math.max(0, r.percent))}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const allModules = navigation.flatMap((g) => g.items).filter((i) => i.moduleKey)
  const user = useAppSelector((s) => s.auth.user)
  const moduleKeys = useAppSelector((s) => s.tenant.moduleKeys)
  const firstName = user?.firstName ?? 'there'
  // Revenue and every figure derived from it: Super Admin and Manager only
  // so far — Accountant's turn is still pending (see hotelier_dashboard_
  // rollout memory). Every other role keeps the plain module list below.
  const hasRevenueAccess = user?.role?.name === 'Super Admin' || user?.role?.name === 'Manager'

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
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

      {hasRevenueAccess && <RevenueDashboard />}

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
            const enabled = mod.moduleKey ? moduleKeys.includes(mod.moduleKey) : false
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
