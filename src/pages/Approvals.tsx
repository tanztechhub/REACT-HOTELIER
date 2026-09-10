import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuBadgeCheck, LuCircleAlert, LuClock3, LuLoaderCircle, LuUserRound, LuX } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

type OrderItem = { id: string; quantity: number; menuItem: { name: string } | null; variant: { name: string } | null }
type PendingOrder = {
  id: string
  orderNumber: number
  status: string
  statusBeforeCancel: string | null
  total: number
  cancelReason: string | null
  cancelRequestedBy: string | null
  cancelRequestedAt: string | null
  table: { label: string } | null
  customer: { firstName: string; lastName: string | null } | null
  items: OrderItem[]
}
type Employee = { id: string; firstName: string; lastName: string | null }

const money = (v: number) => `KSh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const ago = (iso: string | null) => {
  if (!iso) return ''
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs} h ago` : new Date(iso).toLocaleString()
}

export default function Approvals() {
  const toast = useToast()
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [staff, setStaff] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api<{ orders: PendingOrder[] }>('/pos/orders?channel=FOOD&status=PENDING_CANCELLATION')
      setOrders(r.orders)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load approvals'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    api<{ employees: Employee[] }>('/employees').then((r) => {
      setStaff(Object.fromEntries(r.employees.map((e) => [e.id, `${e.firstName} ${e.lastName ?? ''}`.trim()])))
    }).catch(() => {})
  }, [])

  async function decide(order: PendingOrder, action: 'approve' | 'reject') {
    let note: string | undefined
    if (action === 'reject') {
      const input = window.prompt(`Reject the cancellation of order #${order.orderNumber}? Optional note for the waiter:`, '')
      if (input === null) return
      note = input.trim() || undefined
    } else if (!window.confirm(`Approve cancelling order #${order.orderNumber}? It will be marked cancelled.`)) {
      return
    }
    setBusyId(order.id)
    try {
      await api(`/pos/orders/${order.id}/cancel/${action}`, { method: 'POST', body: JSON.stringify(action === 'reject' ? { note } : {}) })
      toast.success(action === 'approve' ? `Order #${order.orderNumber} cancelled.` : `Cancellation of #${order.orderNumber} rejected.`)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not record the decision')
    } finally {
      setBusyId(null)
    }
  }

  const heading = useMemo(() => `${orders.length} awaiting decision`, [orders.length])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-sm bg-secondary/10 text-secondary"><LuBadgeCheck className="size-5" /></span>
        <div>
          <h1 className="font-display text-3xl font-semibold">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cancellation requests from the floor. Approve to cancel the order, or reject to send it back.</p>
        </div>
      </header>

      {error && <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}

      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cancellation requests · {heading}</p>

      {loading ? (
        <div className="mt-4 flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading…</div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-sm border border-dashed p-12 text-center text-sm text-muted-foreground">Nothing waiting for approval.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold">Order #{order.orderNumber}</h2>
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-warning">Pending approval</span>
                    {order.statusBeforeCancel && <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">was {order.statusBeforeCancel.toLowerCase()}</span>}
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{order.table?.label ?? 'Takeaway'}</span>
                    <span className="flex items-center gap-1"><LuUserRound className="size-3.5" /> {order.customer ? `${order.customer.firstName} ${order.customer.lastName ?? ''}` : 'Walk-in'}</span>
                    <span className="flex items-center gap-1"><LuClock3 className="size-3.5" /> requested {ago(order.cancelRequestedAt)}{order.cancelRequestedBy && staff[order.cancelRequestedBy] ? ` by ${staff[order.cancelRequestedBy]}` : ''}</span>
                  </p>
                </div>
                <p className="text-lg font-bold">{money(order.total)}</p>
              </div>

              <div className="mt-3 rounded-sm bg-muted/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
                <p className="mt-0.5 text-sm">{order.cancelReason || <span className="italic text-muted-foreground">No reason given</span>}</p>
              </div>

              {order.items.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {order.items.map((i) => `${i.quantity}× ${i.menuItem?.name ?? 'item'}${i.variant ? ` (${i.variant.name})` : ''}`).join(' · ')}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={busyId === order.id}
                  onClick={() => void decide(order, 'approve')}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busyId === order.id ? <LuLoaderCircle className="size-4 animate-spin" /> : <LuBadgeCheck className="size-4" />} Approve cancellation
                </button>
                <button
                  disabled={busyId === order.id}
                  onClick={() => void decide(order, 'reject')}
                  className="inline-flex items-center gap-1.5 rounded-sm border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  <LuX className="size-4" /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
