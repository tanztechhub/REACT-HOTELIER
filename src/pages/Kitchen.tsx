import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuChefHat, LuCheck, LuCircleAlert, LuClock3, LuCoffee, LuFlame, LuGlassWater, LuLoaderCircle, LuPackageCheck, LuRefreshCw, LuSparkles, LuUtensilsCrossed } from 'react-icons/lu'

import { api } from '@/lib/api'

type InventoryItem = { id: string; name: string; quantity: string | number; unit: string }
type Ingredient = { quantity: string | number; inventoryItem: InventoryItem }
type MenuItem = { id: string; name: string; temperature: 'HOT' | 'COLD' | 'OTHER'; category: { name: string }; inventoryItem: InventoryItem | null; ingredients: Ingredient[] }
type OrderItem = { id: string; quantity: number; menuItem: MenuItem; addons: { id: string; addon: { name: string } }[] }
type Order = { id: string; orderNumber: number; tableLabel: string | null; notes: string | null; status: 'OPEN' | 'PREPARING'; createdAt: string; items: OrderItem[] }
type Station = 'All' | 'Hot' | 'Cold' | 'Bakery'

function stationFor(item: MenuItem): Exclude<Station, 'All'> {
  if (item.temperature === 'HOT') return 'Hot'
  if (item.temperature === 'COLD') return 'Cold'
  return 'Bakery'
}

function elapsed(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
  return minutes < 1 ? 'Just now' : `${minutes} min ago`
}

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [activeStation, setActiveStation] = useState<Station>('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [clock, setClock] = useState(Date.now())

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const [orderResponse, menuResponse] = await Promise.all([api<{ orders: Order[] }>('/kitchen/orders'), api<{ items: MenuItem[] }>('/kitchen/menu-items')])
      setOrders(orderResponse.orders); setMenu(menuResponse.items); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the kitchen queue') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => {
    void load()
    const poll = window.setInterval(() => void load(true), 15000)
    const timer = window.setInterval(() => setClock(Date.now()), 30000)
    return () => { window.clearInterval(poll); window.clearInterval(timer) }
  }, [load])

  const visibleOrders = orders.filter((order) => activeStation === 'All' || order.items.some((item) => stationFor(item.menuItem) === activeStation))
  const counts = useMemo(() => ({
    new: orders.filter((order) => order.status === 'OPEN').length,
    preparing: orders.filter((order) => order.status === 'PREPARING').length,
    hot: orders.filter((order) => order.items.some((item) => item.menuItem.temperature === 'HOT')).length,
    cold: orders.filter((order) => order.items.some((item) => item.menuItem.temperature === 'COLD')).length,
  }), [orders])
  const offerings = useMemo(() => ({ Hot: menu.filter((item) => stationFor(item) === 'Hot'), Cold: menu.filter((item) => stationFor(item) === 'Cold'), Bakery: menu.filter((item) => stationFor(item) === 'Bakery') }), [menu])

  async function advance(order: Order) {
    setWorkingId(order.id); setError(''); setNotice('')
    try {
      if (order.status === 'OPEN') {
        await api(`/kitchen/orders/${order.id}/start`, { method: 'PATCH' })
        setNotice(`Order #${order.orderNumber} is now being prepared.`)
      } else {
        await api(`/kitchen/orders/${order.id}/ready`, { method: 'PATCH' })
        setNotice(`Order #${order.orderNumber} is ready. POS has been notified and linked stock was deducted.`)
      }
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this order') }
    finally { setWorkingId('') }
  }

  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
    <header className="relative overflow-hidden rounded-sm bg-linear-to-r from-primary via-primary to-[#173b67] p-7 text-white shadow-xl shadow-primary/15"><div className="absolute -right-10 -top-20 size-64 rounded-full bg-warning/20 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/60"><LuChefHat /> Kitchen command centre</div><h1 className="mt-3 font-display text-3xl font-semibold">Every ticket, perfectly timed.</h1><p className="mt-2 max-w-xl text-sm text-white/65">Live orders from POS, recipes from Products, and stock updated when preparation is complete.</p></div><div className="flex items-center gap-3"><span className="flex items-center gap-2 rounded-full bg-success/20 px-3 py-1.5 text-xs font-semibold text-success"><span className="size-2 animate-pulse rounded-full bg-success" /> Live sync</span><button onClick={() => void load(true)} className="rounded-sm bg-white/10 p-2.5 text-white transition hover:bg-white/20" title="Refresh queue"><LuRefreshCw className={refreshing ? 'animate-spin' : ''} /></button></div></div></header>

    {error && <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}
    {notice && <div className="mt-5 flex items-center gap-2 rounded-sm border border-success/25 bg-success/10 p-3 text-sm text-success"><LuCheck />{notice}</div>}

    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="New tickets" value={counts.new} icon={<LuClock3 />} tone="secondary" /><Metric label="In preparation" value={counts.preparing} icon={<LuFlame />} tone="warning" /><Metric label="Hot queue" value={counts.hot} icon={<LuCoffee />} tone="warning" /><Metric label="Cold queue" value={counts.cold} icon={<LuGlassWater />} tone="secondary" /></section>

    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-semibold">Active preparation queue</h2><p className="text-sm text-muted-foreground">Oldest tickets appear first.</p></div><div className="flex flex-wrap rounded-sm border bg-card p-1 shadow-sm">{(['All', 'Hot', 'Cold', 'Bakery'] as const).map((station) => <button key={station} onClick={() => setActiveStation(station)} className={`rounded-sm px-4 py-2 text-sm font-semibold transition ${activeStation === station ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>{station}</button>)}</div></div>

    <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section>{loading ? <div className="flex min-h-72 items-center justify-center gap-2 rounded-sm border bg-card text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading live tickets…</div> : visibleOrders.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center rounded-sm border border-dashed bg-card text-center"><span className="flex size-14 items-center justify-center rounded-sm bg-success/10 text-success"><LuSparkles className="size-6" /></span><h3 className="mt-4 font-semibold">Kitchen is all caught up</h3><p className="mt-1 text-sm text-muted-foreground">New POS orders will appear automatically.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{visibleOrders.map((order) => <Ticket key={order.id} order={order} now={clock} working={workingId === order.id} onAdvance={() => void advance(order)} />)}</div>}</section>
      <aside className="space-y-4"><section className="rounded-sm border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-sm bg-accent/10 text-accent"><LuPackageCheck /></span><div><h3 className="font-semibold">Products connected</h3><p className="text-xs text-muted-foreground">Live recipe availability</p></div></div><div className="mt-4 space-y-3">{(['Hot', 'Cold', 'Bakery'] as const).map((station) => <div key={station} className="flex items-center justify-between rounded-sm bg-muted/50 px-3 py-2.5"><span className="text-sm font-medium">{station} menu</span><span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold text-secondary">{offerings[station].length}</span></div>)}</div></section><section className="rounded-sm border bg-card p-5 shadow-sm"><h3 className="flex items-center gap-2 font-semibold"><LuUtensilsCrossed className="text-secondary" /> Available menu</h3><div className="scrollbar-thin mt-4 max-h-80 space-y-2 overflow-y-auto">{menu.map((item) => { const ingredients = item.ingredients.length ? item.ingredients : item.inventoryItem ? [{ quantity: 1, inventoryItem: item.inventoryItem }] : []; const low = ingredients.some((ingredient) => Number(ingredient.inventoryItem.quantity) < Number(ingredient.quantity)); return <div key={item.id} className="rounded-sm border p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><span className={`size-2 rounded-full ${low ? 'bg-warning' : 'bg-success'}`} title={low ? 'Low ingredients' : 'Ingredients available'} /></div><p className="mt-1 text-xs text-muted-foreground">{ingredients.length ? ingredients.map((ingredient) => ingredient.inventoryItem.name).join(' · ') : 'No product recipe linked'}</p></div> })}</div></section></aside>
    </div>
  </div>
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'secondary' | 'warning' }) { return <div className="rounded-sm border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span><span className={`flex size-9 items-center justify-center rounded-sm ${tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-secondary/10 text-secondary'}`}>{icon}</span></div><p className="mt-2 font-display text-3xl font-semibold">{value}</p></div> }

function Ticket({ order, now, working, onAdvance }: { order: Order; now: number; working: boolean; onAdvance: () => void }) {
  const stations = Array.from(new Set(order.items.map((item) => stationFor(item.menuItem))) )
  const old = now - new Date(order.createdAt).getTime() > 10 * 60000
  return <article className={`overflow-hidden rounded-sm border bg-card shadow-sm transition hover:shadow-lg ${old ? 'border-warning/50' : ''}`}><div className={`h-1.5 ${order.status === 'OPEN' ? 'bg-secondary' : 'bg-warning'}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-display text-xl font-bold">#{order.orderNumber}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${order.status === 'OPEN' ? 'bg-secondary/10 text-secondary' : 'bg-warning/15 text-warning'}`}>{order.status === 'OPEN' ? 'New' : 'Preparing'}</span></div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><LuClock3 />{order.tableLabel || 'Takeaway'} · {elapsed(order.createdAt)}</p></div><div className="flex gap-1">{stations.map((station) => <span key={station} className="rounded-sm bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{station}</span>)}</div></div><div className="mt-4 space-y-3 border-y py-4">{order.items.map((item) => <div key={item.id} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">{item.quantity}</span><div><p className="text-sm font-semibold">{item.menuItem.name}</p>{item.addons.length > 0 && <p className="mt-0.5 text-xs text-secondary">+ {item.addons.map((addon) => addon.addon.name).join(', ')}</p>}<p className="mt-1 text-[11px] text-muted-foreground">{item.menuItem.ingredients.length ? `Recipe: ${item.menuItem.ingredients.map((ingredient) => `${ingredient.inventoryItem.name} ${ingredient.quantity}${ingredient.inventoryItem.unit}`).join(' · ')}` : item.menuItem.inventoryItem ? `Product: ${item.menuItem.inventoryItem.name}` : 'No stock recipe linked'}</p></div></div>)}</div>{order.notes && <p className="mt-3 rounded-sm bg-warning/10 p-3 text-xs text-warning"><strong>Note:</strong> {order.notes}</p>}<button disabled={working} onClick={onAdvance} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-sm py-3 text-sm font-bold transition disabled:opacity-60 ${order.status === 'OPEN' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-success text-success-foreground hover:bg-success/90'}`}>{working ? <LuLoaderCircle className="animate-spin" /> : order.status === 'OPEN' ? <LuFlame /> : <LuCheck />}{working ? 'Updating…' : order.status === 'OPEN' ? 'Start preparing' : 'Mark ready & use stock'}</button></div></article>
}
