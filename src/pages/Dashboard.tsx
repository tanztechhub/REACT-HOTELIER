import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuArrowDownLeft, LuArrowUpRight, LuBanknote, LuBedDouble, LuCircleAlert, LuClipboardList, LuLoaderCircle, LuLock,
  LuLogIn, LuLogOut, LuReceiptText, LuTable2, LuTrendingUp, LuTriangleAlert, LuUndo2, LuUsers, LuWallet,
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
type Debtors = {
  total: number
  customers: { total: number; top: { id: string; name: string; balance: number }[] }
  unsettledFolios: { total: number; top: { folioNo: string; reservationNo: string; guestName: string; balance: number }[] }
}
type Creditors = { total: number; top: { id: string; name: string; balance: number }[] }
type TaxLine = { key: string; label: string; net: number; tax: number; gross: number }

type SalesReport = {
  cards: Cards
  topItems: TopItem[]
  expensesByCategory: CountBucket[]
  salesByLocation: LocationBucket[]
  byPaymentMethod: MethodBucket[]
  byEmployee: EmployeeBucket[]
  byCustomer: CustomerBucket[]
  debtors: Debtors
  creditors: Creditors
  expectedProfit: number
  taxBreakdown: TaxLine[]
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

/** 'operations' (Super Admin, Manager): the full floor-and-money picture.
 * 'finance' (Accountant): money only — Accountant's allowedSections are just
 * FINANCE/REPORTS, no SALES/KITCHEN, so Active Orders/Tables/sales-mix
 * breakdowns would be showing them into sections they can't otherwise open.
 * Gets the debtors/creditors/expected-profit and tax panels instead, which
 * the operations variant skips (Super Admin/Manager get that same detail
 * from the full Sales Report already). */
function RevenueDashboard({ variant }: { variant: 'operations' | 'finance' }) {
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
        variant === 'operations' ? api<{ orders: OrderSummary[] }>(`/pos/orders?channel=FOOD${locQuery}`) : Promise.resolve({ orders: [] }),
        variant === 'operations' ? api<{ tables: TableSummary[] }>(`/tables${effectiveLocationId ? `?locationId=${effectiveLocationId}` : ''}`) : Promise.resolve({ tables: [] }),
        api<{ transactions: TransactionRow[] }>(`/transactions?limit=${variant === 'finance' ? 12 : 8}${locQuery}`),
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
  }, [effectiveLocationId, variant])

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

      {variant === 'operations' ? (
        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Right now</p>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={4} label="Active Orders" value={String(activeOrderCount)} icon={<LuClipboardList className="size-4" />} hint="Open, preparing, ready or served" />
            <StatCard index={5} label="Tables Occupied" value={`${occupiedTables.length} / ${activeTables.length}`} icon={<LuTable2 className="size-4" />} hint={estimatedGuests > 0 ? `~${estimatedGuests} guests seated now` : 'No one seated right now'} />
            <StatCard tone="warn" label="Sales on Credit" value={formatKes(report.debtors.total)} icon={<LuUsers className="size-4" />} hint="Owed by customers + unsettled rooms" />
            <StatCard index={6} label="Processed Returns" value={String(report.returns.count)} icon={<LuUndo2 className="size-4" />} hint={report.returns.value > 0 ? formatKes(report.returns.value) : undefined} />
          </div>
        </section>
      ) : (
        <section className="mt-6 overflow-hidden rounded-sm border bg-card">
          <header className="border-b p-4"><h2 className="font-semibold">Debtors, Creditors &amp; Expected Profit</h2><p className="text-xs text-muted-foreground">A live snapshot — not scoped to today, unlike the cards above.</p></header>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <div className="rounded-sm border bg-secondary/5 p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary"><LuUsers className="size-3.5" /> Debtors</p>
              <p className="mt-1 text-xl font-semibold">{formatKes(report.debtors.total)}</p>
              <p className="text-xs text-muted-foreground">Owed to you — customer credit + unsettled rooms</p>
            </div>
            <div className="rounded-sm border bg-destructive/5 p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive"><LuTriangleAlert className="size-3.5" /> Creditors</p>
              <p className="mt-1 text-xl font-semibold">{formatKes(report.creditors.total)}</p>
              <p className="text-xs text-muted-foreground">Owed to suppliers</p>
            </div>
            <div className={cn('rounded-sm border p-3.5', report.expectedProfit >= 0 ? 'bg-success/5' : 'bg-destructive/5')}>
              <p className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-wide', report.expectedProfit >= 0 ? 'text-success' : 'text-destructive')}><LuTrendingUp className="size-3.5" /> Expected Profit</p>
              <p className="mt-1 text-xl font-semibold">{formatKes(report.expectedProfit)}</p>
              <p className="text-xs text-muted-foreground">Net Profit + debtors − creditors</p>
            </div>
          </div>
          {(report.debtors.customers.top.length > 0 || report.debtors.unsettledFolios.top.length > 0 || report.creditors.top.length > 0) && (
            <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who owes you</p>
                <div className="space-y-1.5">
                  {report.debtors.customers.top.slice(0, 6).map((c) => <RowLine key={c.id} label={c.name} value={formatKes(c.balance)} />)}
                  {report.debtors.unsettledFolios.top.slice(0, 6).map((f) => <RowLine key={f.folioNo} label={`${f.guestName} (${f.reservationNo})`} value={formatKes(f.balance)} />)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who you owe</p>
                {report.creditors.top.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You don't owe any supplier right now.</p>
                ) : (
                  <div className="space-y-1.5">{report.creditors.top.slice(0, 6).map((s) => <RowLine key={s.id} label={s.name} value={formatKes(s.balance)} />)}</div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {variant === 'operations' ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <MiniBreakdown title="Sales by Location" rows={report.salesByLocation.map((l) => ({ key: l.locationId ?? 'unassigned', label: l.name, value: l.revenue, percent: l.percentOfTotal }))} />
          <MiniBreakdown title="Sales by Payment Method" rows={report.byPaymentMethod.map((m) => ({ key: m.name, label: m.name, value: m.total, percent: m.percentOfTotal }))} />
          <MiniBreakdown title="Sales by Employee" rows={report.byEmployee.map((e) => ({ key: e.name, label: e.name, value: e.total, percent: e.percentOfTotal }))} />
          <MiniBreakdown title="Sales by Customer" rows={report.byCustomer.map((c) => ({ key: c.name, label: c.name, value: c.revenue, percent: c.percentOfTotal }))} />
        </section>
      ) : (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <MiniBreakdown title="Sales by Payment Method" rows={report.byPaymentMethod.map((m) => ({ key: m.name, label: m.name, value: m.total, percent: m.percentOfTotal }))} />
          <div className="overflow-hidden rounded-sm border bg-card">
            <header className="border-b p-4"><h2 className="font-semibold">Tax Breakdown — Today</h2></header>
            {report.taxBreakdown.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No taxable sales today.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-primary text-xs uppercase text-primary-foreground"><tr><th className="px-4 py-2.5">Treatment</th><th className="px-4 py-2.5 text-right">Net</th><th className="px-4 py-2.5 text-right">Tax</th><th className="px-4 py-2.5 text-right">Gross</th></tr></thead>
                <tbody>{report.taxBreakdown.map((t) => (
                  <tr key={t.key} className="border-t"><td className="px-4 py-2.5 font-medium">{t.label}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatKes(t.net)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatKes(t.tax)}</td><td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatKes(t.gross)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <section className={cn('mt-6 grid gap-4', variant === 'operations' && 'lg:grid-cols-2')}>
        {variant === 'operations' && (
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
        )}

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

function RowLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-sm border bg-muted/30 px-3 py-2 text-sm">
      <span className="truncate">{label}</span>
      <span className="shrink-0 pl-2 font-semibold tabular-nums">{value}</span>
    </div>
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

// ---- Receptionist dashboard — front-desk operations, no hotel revenue.
// Reuses GET /reception/reservations the same (unfiltered, heavy-include)
// way Reception.tsx itself already does — this isn't a new cost, the page
// already pays it. Arrivals/departures are computed client-side from
// checkIn/checkOut against today's local date. ----

type RoomStatus = 'VACANT' | 'OCCUPIED' | 'OUT_OF_SERVICE'
type RoomCleanliness = 'CLEAN' | 'DIRTY' | 'INSPECTING'
type ReceptionRoom = { id: string; number: string; status: RoomStatus; cleanliness: RoomCleanliness; roomType: { name: string } }
type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
type ReceptionFolio = { lineItems: { amount: string | number; quantity: number }[]; payments: { amount: string | number }[] }
type ReceptionReservation = {
  id: string
  reservationNo: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  status: ReservationStatus
  customer: { firstName: string; lastName: string | null; phone: string | null }
  room: { number: string }
  folio: ReceptionFolio | null
}

const localIsoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isSameLocalDay = (iso: string, dayIso: string) => localIsoDay(new Date(iso)) === dayIso
const folioBalance = (folio: ReceptionFolio | null) => {
  if (!folio) return 0
  const charges = folio.lineItems.reduce((s, i) => s + Number(i.amount) * i.quantity, 0)
  const paid = folio.payments.reduce((s, p) => s + Number(p.amount), 0)
  return charges - paid
}

function ReceptionDashboard() {
  const [reservations, setReservations] = useState<ReceptionReservation[]>([])
  const [rooms, setRooms] = useState<ReceptionRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [reservationResponse, roomResponse] = await Promise.all([
          api<{ reservations: ReceptionReservation[] }>('/reception/reservations'),
          api<{ rooms: ReceptionRoom[] }>('/reception/rooms'),
        ])
        if (cancelled) return
        setReservations(reservationResponse.reservations)
        setRooms(roomResponse.rooms)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the front desk overview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading today's front desk…</div>
  }
  if (error) {
    return <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>
  }

  const today = localIsoDay(new Date())
  const arrivals = reservations.filter((r) => isSameLocalDay(r.checkIn, today) && (r.status === 'PENDING' || r.status === 'CONFIRMED'))
  const departures = reservations.filter((r) => isSameLocalDay(r.checkOut, today) && r.status === 'CHECKED_IN')
  const inHouse = reservations.filter((r) => r.status === 'CHECKED_IN')
  const roomsReady = rooms.filter((r) => r.status === 'VACANT' && r.cleanliness === 'CLEAN')
  const guestName = (c: ReceptionReservation['customer']) => `${c.firstName} ${c.lastName ?? ''}`.trim()

  return (
    <>
      <section className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's front desk</p>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={0} label="Arrivals Today" value={String(arrivals.length)} icon={<LuLogIn className="size-4" />} hint="Expected, not yet checked in" />
          <StatCard index={1} label="Departures Today" value={String(departures.length)} icon={<LuLogOut className="size-4" />} hint="Checked in, due out today" />
          <StatCard index={2} label="In-House Now" value={String(inHouse.length)} icon={<LuUsers className="size-4" />} hint="Currently checked in" />
          <StatCard index={3} label="Rooms Ready" value={`${roomsReady.length} / ${rooms.length}`} icon={<LuBedDouble className="size-4" />} hint="Vacant and clean" />
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Room status</p>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniCount label="Vacant" value={rooms.filter((r) => r.status === 'VACANT').length} cls="bg-success/10 text-success" />
          <MiniCount label="Occupied" value={rooms.filter((r) => r.status === 'OCCUPIED').length} cls="bg-warning/15 text-warning" />
          <MiniCount label="Out of Service" value={rooms.filter((r) => r.status === 'OUT_OF_SERVICE').length} cls="bg-destructive/10 text-destructive" />
          <MiniCount label="Clean" value={rooms.filter((r) => r.cleanliness === 'CLEAN').length} cls="bg-success/10 text-success" />
          <MiniCount label="Dirty" value={rooms.filter((r) => r.cleanliness === 'DIRTY').length} cls="bg-destructive/10 text-destructive" />
          <MiniCount label="Inspecting" value={rooms.filter((r) => r.cleanliness === 'INSPECTING').length} cls="bg-secondary/10 text-secondary" />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-sm border bg-card">
          <header className="flex items-center justify-between border-b p-4">
            <h2 className="flex items-center gap-2 font-semibold"><LuLogIn className="size-4 text-secondary" /> Arrivals Today</h2>
            <Link to="/reservations" className="text-xs font-semibold text-secondary hover:underline">Check In →</Link>
          </header>
          {arrivals.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No arrivals expected today.</p>
          ) : (
            <div className="divide-y">
              {arrivals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{guestName(r.customer)}</p>
                    <p className="text-xs text-muted-foreground">{r.reservationNo} · Room {r.room.number} · {r.adults + r.children} guest{r.adults + r.children === 1 ? '' : 's'}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', r.status === 'CONFIRMED' ? 'bg-secondary/10 text-secondary' : 'bg-warning/15 text-warning')}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-sm border bg-card">
          <header className="flex items-center justify-between border-b p-4">
            <h2 className="flex items-center gap-2 font-semibold"><LuLogOut className="size-4 text-secondary" /> Departures Today</h2>
            <Link to="/reception/stays" className="text-xs font-semibold text-secondary hover:underline">Guest Stays →</Link>
          </header>
          {departures.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No departures due today.</p>
          ) : (
            <div className="divide-y">
              {departures.map((r) => {
                const balance = folioBalance(r.folio)
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{guestName(r.customer)}</p>
                      <p className="text-xs text-muted-foreground">{r.reservationNo} · Room {r.room.number}</p>
                    </div>
                    {balance > 0.01 ? (
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">Balance due</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">Settled</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function MiniCount({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={cn('rounded-sm p-3 text-center', cls)}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const allModules = navigation.flatMap((g) => g.items).filter((i) => i.moduleKey)
  const user = useAppSelector((s) => s.auth.user)
  const moduleKeys = useAppSelector((s) => s.tenant.moduleKeys)
  const firstName = user?.firstName ?? 'there'
  // Revenue and every figure derived from it: Super Admin, Manager, and
  // Accountant — the three roles the user named as allowed to see money.
  // Every other role still keeps the plain module list below until its own
  // dashboard is built (see hotelier_dashboard_rollout memory).
  const roleName = user?.role?.name
  const revenueVariant = roleName === 'Super Admin' || roleName === 'Manager' ? 'operations' : roleName === 'Accountant' ? 'finance' : null
  const isReceptionist = roleName === 'Receptionist'

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

      {revenueVariant && <RevenueDashboard variant={revenueVariant} />}
      {isReceptionist && <ReceptionDashboard />}

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
