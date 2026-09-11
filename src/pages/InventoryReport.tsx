import { useCallback, useEffect, useState } from 'react'
import { LuBox, LuCalendarDays, LuCircleAlert, LuLoaderCircle, LuPackageCheck, LuTriangleAlert, LuWallet } from 'react-icons/lu'
import { api, hasApiTenant } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import StatCard from '@/components/ui/StatCard'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { cn } from '@/lib/utils'

type Location = { id: string; name: string }
type Product = { id: string; name: string }
type ProductRow = {
  productId: string
  name: string
  unit: string
  category: string | null
  opening: number
  closing: number
  closingValue: number
  purchased: number
  sold: number
  damaged: number
  adjusted: number
  reorderLevel: number
  low: boolean
}
type DayRow = { date: string; purchasesValue: number; salesValue: number; damageValue: number }
type InventoryReportData = {
  range: { from: string; to: string }
  summary: { openingValue: number; closingValue: number; purchasesValue: number; salesValue: number; damageValue: number; lowStockCount: number }
  byProduct: ProductRow[]
  byDay: DayRow[]
  lowStock: ProductRow[]
}

const formatKes = (value: number) => `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
// Local calendar date, not UTC — the backend parses "YYYY-MM-DD" as local
// midnight, so a UTC-based date here can disagree with it near midnight.
const toLocalIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => toLocalIso(new Date())

function SetupMessage() {
  return <div className="mx-auto max-w-7xl px-6 py-16 text-center"><p className="text-sm text-muted-foreground">Workspace not resolved yet.</p></div>
}

export default function InventoryReport() {
  const toast = useToast()
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [locationId, setLocationId] = useState('')
  const [productId, setProductId] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [report, setReport] = useState<InventoryReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ from, to })
      if (locationId) query.set('locationId', locationId)
      if (productId) query.set('productId', productId)
      const response = await api<InventoryReportData>(`/reports/inventory?${query}`)
      setReport(response)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load the inventory report'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [from, to, locationId, productId, toast])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    api<{ locations: Location[] }>('/locations').then((r) => setLocations(r.locations)).catch(() => {})
    api<{ products: Product[] }>('/products?active=true').then((r) => setProducts(r.products)).catch(() => {})
  }, [])

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }))

  function setQuickRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    setFrom(toLocalIso(start))
    setTo(toLocalIso(end))
  }

  if (!hasApiTenant()) return <SetupMessage />

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">Reports</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Stock movement over a period — what came in, what got used, what was lost, and what's running low. Reconstructed from the stock ledger, so it's accurate for any past range.</p>
      </header>

      <div className="mt-6 flex flex-col gap-3 rounded-sm border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LuCalendarDays className="text-muted-foreground" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-sm border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-sm border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => setQuickRange(1)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Today</button>
          <button onClick={() => setQuickRange(7)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">7 days</button>
          <button onClick={() => setQuickRange(30)} className="rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted">30 days</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="rounded-sm border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="w-56">
            <SearchableSelect options={productOptions} value={productId} onChange={setProductId} placeholder="All products" searchPlaceholder="Search products…" emptyText="No products match." />
          </div>
        </div>
      </div>

      {error && <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}

      {loading || !report ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading report…</div>
      ) : (
        <>
          <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ['Opening value', formatKes(report.summary.openingValue), <LuBox key="a" />, false],
              ['Received', formatKes(report.summary.purchasesValue), <LuPackageCheck key="b" />, false],
              ['Used / sold', formatKes(report.summary.salesValue), <LuWallet key="c" />, false],
              ['Damage / loss', formatKes(report.summary.damageValue), <LuTriangleAlert key="d" />, report.summary.damageValue > 0],
              ['Low stock items', report.summary.lowStockCount, <LuTriangleAlert key="e" />, report.summary.lowStockCount > 0],
            ] as const).map(([label, value, icon, warn], i) => (
              <StatCard key={label} index={i} tone={warn ? 'warn' : undefined} label={label} value={value} icon={icon} />
            ))}
          </section>

          {report.lowStock.length > 0 && (
            <section className="mt-6 rounded-sm border border-warn/30 bg-warn/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warn"><LuTriangleAlert className="size-4" /> Running low, as of {new Date(report.range.to).toLocaleDateString()}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {report.lowStock.map((p) => (
                  <span key={p.productId} className="rounded-full border border-warn/40 bg-card px-3 py-1 text-xs font-medium">
                    {p.name} <span className="text-muted-foreground">— {p.closing.toLocaleString()} {p.unit} (reorder at {p.reorderLevel.toLocaleString()})</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="mt-7 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="overflow-hidden rounded-sm border bg-card shadow-sm">
              <header className="border-b p-4"><h2 className="font-semibold">By product</h2></header>
              {report.byProduct.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No stock activity in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5 text-right">Opening</th>
                        <th className="px-4 py-2.5 text-right">Received</th>
                        <th className="px-4 py-2.5 text-right">Used</th>
                        <th className="px-4 py-2.5 text-right">Damaged</th>
                        <th className="px-4 py-2.5 text-right">Closing</th>
                        <th className="px-4 py-2.5 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byProduct.map((p) => (
                        <tr key={p.productId} className="border-t">
                          <td className="px-4 py-3">
                            <p className="font-medium">{p.name}</p>
                            {p.low && <span className="text-xs font-semibold text-warn">Low stock</span>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.opening.toLocaleString()} {p.unit}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-success">{p.purchased ? `+${p.purchased.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-secondary">{p.sold ? `-${p.sold.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-destructive">{p.damaged ? `-${p.damaged.toLocaleString()}` : '—'}</td>
                          <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', p.low && 'text-warn')}>{p.closing.toLocaleString()} {p.unit}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatKes(p.closingValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-sm border bg-card shadow-sm">
              <header className="border-b p-4"><h2 className="font-semibold">Received vs. used, by day</h2></header>
              {report.byDay.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No stock activity in this range.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5 text-right">Received</th><th className="px-4 py-2.5 text-right">Used</th></tr>
                  </thead>
                  <tbody>
                    {report.byDay.map((d) => (
                      <tr key={d.date} className="border-t">
                        <td className="px-4 py-3">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-success">{d.purchasesValue ? formatKes(d.purchasesValue) : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-secondary">{d.salesValue ? formatKes(d.salesValue) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
