import { useCallback, useEffect, useState } from 'react'
import { LuCircleAlert, LuLoaderCircle, LuPackageCheck, LuSearch, LuWallet } from 'react-icons/lu'
import { api, hasApiTenant } from '@/lib/api'
import StatCard from '@/components/ui/StatCard'

type Employee = { id: string; firstName: string; lastName: string }
type ReceiptItem = { id: string; quantity: string; unitCost: string; note: string | null; product: { id: string; name: string; unit: string } }
type Receipt = {
  id: string
  receiptNo: string
  receivedAt: string
  note: string | null
  value: number
  purchase: { id: string; purchaseNo: string; supplier: { id: string; name: string } }
  location: { id: string; name: string }
  createdByEmployee: Employee | null
  items: ReceiptItem[]
}
type Summary = { total: number; totalValue: number }

const formatKes = (value: number) => `KSh ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function SetupMessage() {
  return <div className="mx-auto max-w-7xl px-6 py-16 text-center"><p className="text-sm text-muted-foreground">Workspace not resolved yet.</p></div>
}

export default function GoodsReceived() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, totalValue: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Receipt | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      const response = await api<{ receipts: Receipt[]; summary: Summary }>(`/goods-receipts${query.size ? `?${query}` : ''}`)
      setReceipts(response.receipts)
      setSummary(response.summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load goods receipts')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { const t = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(t) }, [load])

  if (!hasApiTenant()) return <SetupMessage />

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">Inventory</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Goods Received</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Every delivery posted against a purchase order — each one moved real stock into the location it names. To receive a new delivery, open the purchase order under Purchases and use "Receive goods".</p>
      </header>

      <section className="mt-7 grid gap-3 sm:grid-cols-2">
        <StatCard index={0} label="Receipts" value={summary.total} icon={<LuPackageCheck />} />
        <StatCard index={1} label="Total value received" value={formatKes(summary.totalValue)} icon={<LuWallet />} />
      </section>

      {error && <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}

      <section className="mt-6 overflow-hidden rounded-sm border bg-card shadow-sm">
        <div className="border-b p-4">
          <label className="relative block max-w-sm">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipt no, PO no or supplier…" className="w-full rounded-sm border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading goods receipts…</div>
        ) : receipts.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">No goods have been received yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3">Purchase order</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-t transition hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <button onClick={() => setDetail(r)} className="font-semibold text-secondary hover:underline">{r.receiptNo}</button>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{r.purchase.purchaseNo}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.purchase.supplier.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.location.name}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatKes(r.value)}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(r.receivedAt).toLocaleDateString()}
                      {r.createdByEmployee && <> · {r.createdByEmployee.firstName} {r.createdByEmployee.lastName}</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null) }}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <p className="text-sm font-semibold text-secondary">Goods receipt</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{detail.receiptNo}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Against {detail.purchase.purchaseNo} ({detail.purchase.supplier.name}) · into {detail.location.name} · {new Date(detail.receivedAt).toLocaleDateString()}
            </p>

            <div className="mt-5 overflow-hidden rounded-sm border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2">Product</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Unit cost</th><th className="px-4 py-2 text-right">Value</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="px-4 py-2">{i.product.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{Number(i.quantity)} {i.product.unit}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatKes(Number(i.unitCost))}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatKes(Number(i.quantity) * Number(i.unitCost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.note && <p className="mt-4 rounded-sm bg-muted/50 p-3 text-sm text-muted-foreground">{detail.note}</p>}
            {detail.createdByEmployee && <p className="mt-4 text-xs text-muted-foreground">Received by {detail.createdByEmployee.firstName} {detail.createdByEmployee.lastName}</p>}

            <div className="mt-6 flex justify-end border-t pt-5">
              <button onClick={() => setDetail(null)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
