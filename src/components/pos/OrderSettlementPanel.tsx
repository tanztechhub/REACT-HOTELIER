import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LuCircleAlert, LuLoaderCircle, LuPrinter, LuReceiptText, LuX } from 'react-icons/lu'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import OrderReceipt, { type ReceiptOrder, type ReceiptProfile } from './OrderReceipt'

type PaymentMethod = { id: string; name: string; requiresReference: boolean }
type CheckedInStay = { id: string; reservationNo: string; customer: { firstName: string; lastName: string | null }; room: { number: string } }
type Order = ReceiptOrder & {
  notes: string | null
  total: number
  paid: number
  customer: { firstName: string; lastName: string | null } | null
  // Present when the tab was rung up "bill to Room X" — settlement then
  // defaults to charging that folio (staff can still switch to cash).
  reservation: CheckedInStay | null
}

const formatKes = (value: number | string) => `KES ${Number(value).toLocaleString()}`

/** The full "view a served order, print/preview the bill, settle it (cash
 * now or charged to a checked-in guest's room), or cancel it before serving"
 * flow — shared by Tables.tsx and the Point of Sale's Active Orders tab so
 * neither has to keep its own copy of this in sync. */
export default function OrderSettlementPanel({ orderId, title, subtitle, profile, paymentMethods, onClose, onChanged }: {
  orderId: string
  title: string
  subtitle?: string
  profile: ReceiptProfile
  paymentMethods: PaymentMethod[]
  onClose: () => void
  onChanged: () => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)

  const [mode, setMode] = useState<'PAY' | 'ROOM'>('PAY')
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [staySearch, setStaySearch] = useState('')
  const [stays, setStays] = useState<CheckedInStay[]>([])
  const [reservationId, setReservationId] = useState('')
  const [paying, setPaying] = useState(false)

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId)
  const selectedStay = stays.find((s) => s.id === reservationId)
  const remaining = order ? Math.max(0, order.total - order.paid) : 0

  async function loadOrder() {
    setLoading(true)
    setError('')
    try {
      const response = await api<{ order: Order }>(`/pos/orders/${orderId}`)
      setOrder(response.order)
      setAmount(String(Math.max(0, response.order.total - response.order.paid)))
      if (response.order.reservation) {
        setMode('ROOM')
        setReservationId(response.order.reservation.id)
        setStays([response.order.reservation])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOrder() }, [orderId])

  useEffect(() => {
    if (mode !== 'ROOM') return
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ status: 'CHECKED_IN' })
      if (staySearch.trim()) query.set('search', staySearch.trim())
      api<{ reservations: CheckedInStay[] }>(`/reception/reservations?${query}`).then((r) => setStays(r.reservations)).catch(() => setStays([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [mode, staySearch])

  async function cancelOrder() {
    if (!order || !window.confirm(`Cancel order #${order.orderNumber}?`)) return
    setError('')
    try {
      await api(`/pos/orders/${order.id}/cancel`, { method: 'PATCH' })
      onChanged()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not cancel this order')
    }
  }

  async function settle(event: FormEvent) {
    event.preventDefault()
    if (!order) return
    if (mode === 'PAY' && !paymentMethodId) return
    if (mode === 'ROOM' && !reservationId) { setError('Choose a checked-in stay to bill this to'); return }
    if (mode === 'PAY' && selectedMethod?.requiresReference && !reference.trim()) { setError(`${selectedMethod.name} requires a reference number`); return }
    setPaying(true)
    setError('')
    try {
      const response = await api<{ order: Order }>(`/pos/orders/${order.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(
          mode === 'PAY'
            ? { method: 'PAY', paymentMethodId, amount: Number(amount) || remaining, reference: reference || undefined }
            : { method: 'ROOM', reservationId, amount: Number(amount) || remaining },
        ),
      })
      setOrder(response.order)
      setAmount(String(Math.max(0, response.order.total - response.order.paid)))
      setReference('')
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record this payment')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
        <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary">{title}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{order ? `Order #${order.orderNumber}` : 'Loading…'}</h2>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="rounded-sm p-2 text-muted-foreground hover:bg-muted"><LuX /></button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <LuCircleAlert />
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading order…</div>
          ) : !order ? (
            <p className="mt-6 text-sm text-muted-foreground">This order could not be found.</p>
          ) : (
            <>
              {order.customer && <p className="mt-4 text-sm"><span className="text-muted-foreground">Customer:</span> {order.customer.firstName} {order.customer.lastName ?? ''}</p>}
              {order.reservation && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
                  Rung up to bill Room {order.reservation.room.number}
                </p>
              )}

              <div className="mt-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-sm bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between font-medium">
                      <span>{item.quantity}&times; {item.menuItem.name}{item.variant ? ` (${item.variant.name})` : ''}</span>
                      <span>{formatKes(Number(item.unitPrice) * item.quantity)}</span>
                    </div>
                    {item.addons.length > 0 && <p className="mt-1 text-xs text-muted-foreground">+ {item.addons.map((a) => a.addon.name).join(', ')}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatKes(order.financials.subtotal)}</span></div>
                {order.financials.discount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-{formatKes(order.financials.discount)}</span></div>}
                {order.financials.taxRate > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({order.financials.taxRate}%)</span><span>{formatKes(order.financials.taxAmount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatKes(order.total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-semibold text-success">{formatKes(order.paid)}</span></div>
                <div className="flex justify-between border-t pt-1 text-base"><span className="font-semibold">Balance due</span><span className="font-bold">{formatKes(remaining)}</span></div>
              </div>

              {order.payments.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments</p>
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{p.paymentMethod.name}{p.reference ? ` · ${p.reference}` : ''}</span>
                      <span>{formatKes(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowReceipt(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-sm border py-2.5 text-sm font-semibold hover:bg-muted">
                <LuReceiptText className="size-4" /> {order.status === 'COMPLETED' ? 'View receipt' : 'Preview bill'}
              </button>

              {['OPEN', 'PREPARING', 'READY'].includes(order.status) && (
                <button onClick={() => void cancelOrder()} className="mt-2 w-full rounded-sm border border-destructive/30 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">Cancel order</button>
              )}

              {order.status === 'SERVED' && remaining > 0 && (
                <form onSubmit={settle} className="mt-5 space-y-3 border-t pt-5">
                  <div className="flex gap-1 rounded-sm bg-muted/50 p-1">
                    {(['PAY', 'ROOM'] as const).map((value) => (
                      <button key={value} type="button" onClick={() => setMode(value)} className={cn('flex-1 rounded-sm py-1.5 text-sm font-semibold', mode === value ? 'bg-card text-secondary shadow-sm' : 'text-muted-foreground')}>
                        {value === 'PAY' ? 'Pay now' : 'Charge to Room'}
                      </button>
                    ))}
                  </div>

                  {mode === 'PAY' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium">
                          Method
                          <select className="input mt-1.5" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                            <option value="">Select method</option>
                            {paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </label>
                        <label className="block text-sm font-medium">
                          Amount
                          <input required type="number" min="0" step="0.01" max={remaining} className="input mt-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </label>
                      </div>
                      <label className="block text-sm font-medium">
                        {selectedMethod?.requiresReference ? 'Reference' : 'Reference (optional)'}
                        <input placeholder="e.g. M-Pesa code" required={selectedMethod?.requiresReference} className="input mt-1.5" value={reference} onChange={(e) => setReference(e.target.value)} />
                      </label>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Search checked-in stays
                        <input placeholder="Guest name, room, reservation no…" className="input mt-1.5" value={staySearch} onChange={(e) => { setStaySearch(e.target.value); setReservationId('') }} />
                      </label>
                      {selectedStay ? (
                        <div className="flex items-center justify-between rounded-sm border bg-secondary/5 p-2.5 text-sm">
                          <span>Room {selectedStay.room.number} — {selectedStay.customer.firstName} {selectedStay.customer.lastName ?? ''} ({selectedStay.reservationNo})</span>
                          <button type="button" onClick={() => setReservationId('')} className="text-xs font-semibold text-secondary hover:underline">Change</button>
                        </div>
                      ) : (
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                          {stays.length === 0 && <p className="p-1.5 text-center text-xs text-muted-foreground">No checked-in stays match.</p>}
                          {stays.map((stay) => (
                            <button key={stay.id} type="button" onClick={() => setReservationId(stay.id)} className="block w-full rounded-sm border p-2 text-left text-xs hover:bg-muted/40">
                              Room {stay.room.number} — {stay.customer.firstName} {stay.customer.lastName ?? ''} <span className="text-muted-foreground">({stay.reservationNo})</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="block text-sm font-medium">
                        Amount
                        <input required type="number" min="0" step="0.01" max={remaining} className="input mt-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </label>
                    </div>
                  )}

                  <button disabled={paying || (mode === 'PAY' ? !paymentMethodId : !reservationId)} className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {paying && <LuLoaderCircle className="animate-spin" />}
                    {mode === 'PAY' ? 'Record payment' : 'Charge to room'}
                  </button>
                </form>
              )}

              {order.status === 'READY' && <p className="mt-5 text-sm text-warning">Waiting for the waiter to mark this order served before payment can be taken.</p>}
              {order.status === 'COMPLETED' && <p className="mt-5 text-sm font-semibold text-success">Paid in full.</p>}
            </>
          )}
        </div>
      </div>

      {showReceipt && order && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReceipt(false) }}>
          <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-sm bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b p-3 print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><LuPrinter className="size-3.5" /> Print</button>
              <button onClick={() => setShowReceipt(false)} className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted"><LuX className="size-4" /></button>
            </div>
            <OrderReceipt order={order} profile={profile} />
          </div>
        </div>
      )}
    </>
  )
}
