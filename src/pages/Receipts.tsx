import { useCallback, useEffect, useState } from 'react'
import { LuCircleAlert, LuLoaderCircle, LuPrinter, LuReceiptText, LuSearch, LuX } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useAppSelector } from '@/store/hooks'
import OrderReceipt, { type ReceiptOrder, type ReceiptProfile } from '@/components/pos/OrderReceipt'

type ReceiptRow = ReceiptOrder & { total: number; paid: number }
type LocationOption = { id: string; name: string }

const formatKes = (value: number | string) => `KES ${Number(value).toLocaleString()}`

export default function Receipts() {
  const toast = useToast()
  const user = useAppSelector((s) => s.auth.user)
  const [orders, setOrders] = useState<ReceiptRow[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [profile, setProfile] = useState<ReceiptProfile>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ReceiptRow | null>(null)

  const myLocations = user?.locations ?? []
  const fixedLocation = myLocations.length === 1 ? myLocations[0] : null
  const pickableLocations = myLocations.length > 1 ? myLocations : locations
  // Same convention as Tables.tsx: fixed-location staff only ever see their
  // own location's sales; a floating manager sees everything by default,
  // with an optional filter rather than a forced pick.
  const effectiveLocationId = fixedLocation?.id ?? selectedLocationId

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = effectiveLocationId ? `&locationId=${effectiveLocationId}` : ''
      const [orderResponse, profileResponse, locationResponse] = await Promise.all([
        api<{ orders: ReceiptRow[] }>(`/pos/orders?status=COMPLETED${query}`),
        api<{ profile: ReceiptProfile }>('/business-profile'),
        api<{ locations: LocationOption[] }>('/locations'),
      ])
      setOrders(orderResponse.orders)
      setProfile(profileResponse.profile)
      setLocations(locationResponse.locations)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load receipts'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [effectiveLocationId, toast])

  useEffect(() => { void load() }, [load])

  const visible = orders.filter((order) => {
    if (!search.trim()) return true
    const query = search.trim().toLowerCase()
    return String(order.orderNumber).includes(query) || (order.table?.label ?? 'takeaway').toLowerCase().includes(query)
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">Sales</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Receipts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every completed sale, with the full itemized breakdown and payment record.</p>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block max-w-sm flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order # or table…" className="w-full rounded-sm border bg-card py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {!fixedLocation && pickableLocations.length > 0 && (
          <select aria-label="Filter by location" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="rounded-sm border bg-card px-3 py-2.5 text-sm shadow-sm outline-none">
            <option value="">All locations</option>
            {pickableLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading receipts…</div>
      ) : visible.length === 0 ? (
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No completed sales {search.trim() ? 'match your search' : 'yet'}.</div>
      ) : (
        <section className="mt-7 overflow-hidden rounded-sm border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Table</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id} className="cursor-pointer border-t transition hover:bg-muted/30" onClick={() => setSelected(order)}>
                    <td className="px-5 py-4 font-semibold">#{order.orderNumber}</td>
                    <td className="px-5 py-4 text-muted-foreground">{order.table?.label ?? 'Takeaway'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{new Date(order.updatedAt).toLocaleString()}</td>
                    <td className="px-5 py-4 text-muted-foreground">{[...new Set(order.payments.map((p) => p.paymentMethod.name))].join(', ') || '—'}</td>
                    <td className="px-5 py-4 text-right font-semibold">{formatKes(order.total)}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(order) }} title="View receipt" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuReceiptText /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-sm bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b p-3 print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><LuPrinter className="size-3.5" /> Print</button>
              <button onClick={() => setSelected(null)} className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted"><LuX className="size-4" /></button>
            </div>
            <OrderReceipt order={selected} profile={profile} />
          </div>
        </div>
      )}
    </div>
  )
}
