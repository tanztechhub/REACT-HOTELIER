import { useCallback, useEffect, useState } from 'react'
import { LuCalendarDays, LuCircleAlert, LuLoaderCircle, LuReceiptText, LuTrendingUp, LuTriangleAlert, LuUsers, LuWallet } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type MethodBucket = { method: string; count: number; total: number }
type CashierBucket = { name: string; count: number; total: number }
type OrderRow = { id: string; orderNumber: number; table: { label: string } | null; total: number; paid: number; servedAt: string | null; updatedAt: string }
type OutstandingRow = { id: string; orderNumber: number; table: { label: string } | null; total: number; paid: number; balance: number }
type SalesReport = {
  range: { from: string; to: string }
  summary: { totalRevenue: number; completedOrders: number; averageOrderValue: number; outstandingBalance: number; outstandingOrders: number }
  byMethod: MethodBucket[]
  byCashier: CashierBucket[]
  orders: OrderRow[]
  outstanding: OutstandingRow[]
}

const formatKes = (value: number) => `KES ${value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
// Local calendar date, not UTC — the backend parses "YYYY-MM-DD" as local
// midnight, so a UTC-based date here can disagree with it near midnight.
const toLocalIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => toLocalIso(new Date())

export default function Reports() {
  const toast = useToast()
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api<SalesReport>(`/reports/sales?from=${from}&to=${to}`)
      setReport(response)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load the sales report'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [from, to, toast])

  useEffect(() => { void load() }, [load])

  function setQuickRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    setFrom(toLocalIso(start))
    setTo(toLocalIso(end))
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Reports</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Sales Report</h1>
          <p className="mt-2 text-sm text-muted-foreground">Till reconciliation — money collected, by method and by cashier.</p>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 rounded-sm border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LuCalendarDays className="text-muted-foreground" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-sm border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-sm border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQuickRange(1)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Today</button>
          <button onClick={() => setQuickRange(7)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Last 7 days</button>
          <button onClick={() => setQuickRange(30)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Last 30 days</button>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}

      {loading || !report ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading report…</div>
      ) : (
        <>
          <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ['Revenue collected', formatKes(report.summary.totalRevenue), <LuWallet key="a" />, false],
              ['Completed orders', report.summary.completedOrders, <LuReceiptText key="b" />, false],
              ['Average order value', formatKes(report.summary.averageOrderValue), <LuTrendingUp key="c" />, false],
              ['Outstanding balance', formatKes(report.summary.outstandingBalance), <LuTriangleAlert key="d" />, report.summary.outstandingBalance > 0],
            ] as const).map(([label, value, icon, warn]) => (
              <div key={label} className="rounded-sm border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm font-medium">{label}</span>
                  <span className={warn ? 'text-warning' : 'text-secondary'}>{icon}</span>
                </div>
                <p className={cn('mt-2 font-display text-2xl font-semibold', warn && 'text-warning')}>{value}</p>
              </div>
            ))}
          </section>

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-sm border bg-card shadow-sm">
              <header className="border-b p-4"><h2 className="font-semibold">By payment method</h2></header>
              {report.byMethod.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No payments in this range.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-2.5">Method</th><th className="px-4 py-2.5">Payments</th><th className="px-4 py-2.5 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {report.byMethod.map((m) => (
                      <tr key={m.method} className="border-t">
                        <td className="px-4 py-3 font-medium">{m.method}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.count}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatKes(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="overflow-hidden rounded-sm border bg-card shadow-sm">
              <header className="flex items-center gap-2 border-b p-4"><LuUsers className="size-4 text-secondary" /><h2 className="font-semibold">By cashier</h2></header>
              {report.byCashier.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No payments in this range.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-2.5">Cashier</th><th className="px-4 py-2.5">Payments</th><th className="px-4 py-2.5 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {report.byCashier.map((c) => (
                      <tr key={c.name} className="border-t">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.count}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatKes(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {report.outstanding.length > 0 && (
            <section className="mt-6 overflow-hidden rounded-sm border border-warning/30 bg-card shadow-sm">
              <header className="flex items-center gap-2 border-b border-warning/30 bg-warning/5 p-4"><LuTriangleAlert className="size-4 text-warning" /><h2 className="font-semibold">Unsettled bills right now</h2></header>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Table</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-right">Paid</th><th className="px-4 py-2.5 text-right">Balance</th></tr>
                </thead>
                <tbody>
                  {report.outstanding.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.table?.label ?? 'Takeaway'}</td>
                      <td className="px-4 py-3 text-right">{formatKes(o.total)}</td>
                      <td className="px-4 py-3 text-right text-success">{formatKes(o.paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-warning">{formatKes(o.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="mt-6 overflow-hidden rounded-sm border bg-card shadow-sm">
            <header className="border-b p-4"><h2 className="font-semibold">Completed orders in range</h2></header>
            {report.orders.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No orders were completed in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Table</th><th className="px-4 py-2.5">Completed</th><th className="px-4 py-2.5 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.table?.label ?? 'Takeaway'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(o.updatedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatKes(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
