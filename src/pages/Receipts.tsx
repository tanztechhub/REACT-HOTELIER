import { useCallback, useEffect, useState } from 'react'
import { LuCircleAlert, LuLoaderCircle, LuReceiptText, LuSearch, LuWallet } from 'react-icons/lu'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useWorkingLocation } from '@/lib/useWorkingLocation'
import { type ReceiptOrder, type ReceiptProfile } from '@/components/pos/OrderReceipt'
import OrderSettlementPanel from '@/components/pos/OrderSettlementPanel'
import ReceiptPreviewModal from '@/components/pos/ReceiptPreviewModal'

type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
type ReceiptRow = ReceiptOrder & { total: number; paid: number; paymentStatus?: PaymentStatus }
type LocationOption = { id: string; name: string }
type PaymentMethod = { id: string; name: string; requiresReference: boolean }

const formatKes = (value: number | string) => `KES ${Number(value).toLocaleString()}`

const badgeFor = (row: ReceiptRow) => {
  const owed = Math.max(0, row.total - row.paid)
  if (row.paymentStatus === 'PAID' || owed <= 0.01) return { label: 'Paid', cls: 'bg-success/10 text-success' }
  if (row.paymentStatus === 'PARTIAL' || row.paid > 0.01) return { label: 'Part-paid', cls: 'bg-warning/15 text-warning' }
  return { label: 'On credit', cls: 'bg-destructive/10 text-destructive' }
}

export default function Receipts() {
  const toast = useToast()
  const [orders, setOrders] = useState<ReceiptRow[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [profile, setProfile] = useState<ReceiptProfile>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState<'ALL' | 'OWING' | 'PAID'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)

  const { fixed: fixedLocation, options: pickableLocations, selectedId: selectedLocationId, setLocation, effectiveId: effectiveLocationId } = useWorkingLocation(locations, { persist: false })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = effectiveLocationId ? `&locationId=${effectiveLocationId}` : ''
      const [orderResponse, profileResponse, locationResponse, methodsResponse] = await Promise.all([
        api<{ orders: ReceiptRow[] }>(`/pos/orders?status=COMPLETED${query}`),
        api<{ profile: ReceiptProfile }>('/business-profile'),
        api<{ locations: LocationOption[] }>('/locations'),
        api<{ methods: (PaymentMethod & { code: string })[] }>('/payment-methods?activeOnly=true'),
      ])
      setOrders(orderResponse.orders)
      setProfile(profileResponse.profile)
      setLocations(locationResponse.locations)
      setPaymentMethods(methodsResponse.methods.filter((m) => m.code !== 'ROOM_CHARGE'))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load receipts'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [effectiveLocationId, toast])

  useEffect(() => { void load() }, [load])

  const owingCount = orders.filter((o) => Math.max(0, o.total - o.paid) > 0.01).length

  const visible = orders.filter((order) => {
    const owed = Math.max(0, order.total - order.paid) > 0.01
    if (payFilter === 'OWING' && !owed) return false
    if (payFilter === 'PAID' && owed) return false
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block max-w-sm flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order # or table…" className="w-full rounded-sm border bg-card py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {([['ALL', 'All'], ['OWING', 'Owing'], ['PAID', 'Fully paid']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPayFilter(value)}
              className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', payFilter === value ? 'border-secondary bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              {label}{value === 'OWING' && owingCount > 0 && ` (${owingCount})`}
            </button>
          ))}
        </div>
        {!fixedLocation && pickableLocations.length > 0 && (
          <select aria-label="Filter by location" value={selectedLocationId} onChange={(e) => setLocation(e.target.value)} className="rounded-sm border bg-card px-3 py-2.5 text-sm shadow-sm outline-none">
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
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No completed sales {search.trim() || payFilter !== 'ALL' ? 'match this view' : 'yet'}.</div>
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
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const badge = badgeFor(order)
                  const owed = Math.max(0, order.total - order.paid)
                  return (
                    <tr key={order.id} className="cursor-pointer border-t transition hover:bg-muted/30" onClick={() => setReceiptId(order.id)}>
                      <td className="px-5 py-4 font-semibold">#{order.orderNumber}</td>
                      <td className="px-5 py-4 text-muted-foreground">{order.table?.label ?? 'Takeaway'}</td>
                      <td className="px-5 py-4 text-muted-foreground">{new Date(order.updatedAt).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide', badge.cls)}>{badge.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{[...new Set(order.payments.map((p) => p.paymentMethod.name))].join(', ') || '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">{formatKes(order.paid)}{owed > 0.01 && <span className="block text-[11px] font-semibold text-warning">owing {formatKes(owed)}</span>}</td>
                      <td className="px-5 py-4 text-right font-semibold">{formatKes(order.total)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {owed > 0.01 && (
                            <button onClick={(e) => { e.stopPropagation(); setPayId(order.id) }} title="Take payment" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuWallet /></button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setReceiptId(order.id) }} title="View receipt" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuReceiptText /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {receiptId && (
        <ReceiptPreviewModal orderId={receiptId} profile={profile} onClose={() => setReceiptId(null)} />
      )}

      {payId && (
        <OrderSettlementPanel
          orderId={payId}
          title="Take payment"
          profile={profile}
          paymentMethods={paymentMethods}
          onClose={() => setPayId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  )
}
