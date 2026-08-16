import { useEffect, useMemo, useState } from 'react'
import { LuCircleAlert, LuCircleCheck, LuCoffee, LuLoaderCircle, LuMinus, LuPlus, LuReceiptText, LuRefreshCw, LuSearch, LuShoppingBag, LuTrash2 } from 'react-icons/lu'

import { api } from '../lib/api'

type ApiMenuItem = {
  id: string
  name: string
  description: string | null
  price: string | number
  temperature: 'HOT' | 'COLD' | 'OTHER'
  category: { id: string; name: string }
}
type ApiAddon = { id: string; name: string; price: string | number; isActive: boolean }
type MenuItem = Omit<ApiMenuItem, 'price'> & { price: number }
type Addon = Omit<ApiAddon, 'price'> & { price: number }
type CartItem = MenuItem & { quantity: number; addons: Addon[] }
type CreatedOrder = { id: string; orderNumber: number }
type ReadyNotification = { type: 'ORDER_READY'; message: string; order: { id: string; orderNumber: number; tableLabel: string | null } }

const formatKes = (price: number) => `KSh ${price.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function PointOfSale() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [activeCategory, setActiveCategory] = useState('All items')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableLabel, setTableLabel] = useState('Table 1')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<CreatedOrder | null>(null)
  const [readyOrders, setReadyOrders] = useState<ReadyNotification[]>([])

  async function loadPos() {
    setLoading(true)
    setError('')
    try {
      const [menuResponse, addonResponse] = await Promise.all([
        api<{ items: ApiMenuItem[] }>('/pos/menu-items'),
        api<{ addons: ApiAddon[] }>('/pos/addons'),
      ])
      setMenuItems(menuResponse.items.map((item) => ({ ...item, price: Number(item.price) })))
      setAddons(addonResponse.addons.filter((addon) => addon.isActive).map((addon) => ({ ...addon, price: Number(addon.price) })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the POS menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPos() }, [])
  useEffect(() => {
    async function loadReady() {
      try { const response = await api<{ notifications: ReadyNotification[] }>('/pos/orders/ready'); setReadyOrders(response.notifications) } catch { /* Main POS error handling remains with menu and checkout actions. */ }
    }
    void loadReady()
    const timer = window.setInterval(() => void loadReady(), 15000)
    return () => window.clearInterval(timer)
  }, [])

  const categories = useMemo(() => ['All items', ...Array.from(new Set(menuItems.map((item) => item.category.name)))], [menuItems])
  const visibleItems = menuItems.filter((item) => (activeCategory === 'All items' || item.category.name === activeCategory) && (!search.trim() || `${item.name} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())))
  const total = useMemo(() => cart.reduce((sum, item) => sum + (item.price + item.addons.reduce((addonTotal, addon) => addonTotal + addon.price, 0)) * item.quantity, 0), [cart])

  function addItem(item: MenuItem) {
    setConfirmation(null)
    setCart((current) => {
      const match = current.find((cartItem) => cartItem.id === item.id)
      return match ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1, addons: [] }]
    })
  }

  function changeQuantity(id: string, change: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const quantity = item.quantity + change
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  function toggleAddon(itemId: string, addon: Addon) {
    setCart((current) => current.map((item) => item.id !== itemId ? item : { ...item, addons: item.addons.some((selected) => selected.id === addon.id) ? item.addons.filter((selected) => selected.id !== addon.id) : [...item.addons, addon] }))
  }

  async function submitOrder() {
    if (!cart.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api<{ order: CreatedOrder }>('/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          tableLabel: tableLabel.trim() || undefined,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            addons: item.addons.map((addon) => ({ addonId: addon.id, quantity: 1 })),
          })),
        }),
      })
      setCart([])
      setConfirmation(response.order)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the order')
    } finally {
      setSubmitting(false)
    }
  }

  async function markServed(notification: ReadyNotification) {
    try {
      await api(`/pos/orders/${notification.order.id}/serve`, { method: 'PATCH' })
      setReadyOrders((current) => current.filter((item) => item.order.id !== notification.order.id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not mark the order served') }
  }

  return (
    <div className="mx-auto grid min-h-full max-w-7xl gap-7 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:px-10">
      <section>
        <header className="relative mb-6 overflow-hidden rounded-sm bg-linear-to-br from-primary via-primary to-secondary p-7 text-primary-foreground shadow-xl shadow-primary/15"><div className="absolute -right-12 -top-16 size-48 rounded-full bg-white/10 blur-2xl" /><div className="relative"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/65"><LuShoppingBag /> Café point of sale</div><h1 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight">A faster, friendlier way to take every order.</h1><p className="mt-2 max-w-xl text-sm text-white/70">Live menu, accurate pricing, and orders sent straight to your kitchen.</p><div className="mt-5 flex gap-5 text-sm"><span><strong className="text-lg text-white">{menuItems.length}</strong><span className="ml-1.5 text-white/60">menu items</span></span><span><strong className="text-lg text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)}</strong><span className="ml-1.5 text-white/60">in order</span></span></div></div></header>
        {error && <div className="mb-5 flex items-center justify-between gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><span className="flex items-center gap-2"><LuCircleAlert />{error}</span><button onClick={() => void loadPos()} className="rounded p-1 hover:bg-destructive/10" title="Try again"><LuRefreshCw /></button></div>}
        {confirmation && <div className="mb-5 flex items-center gap-2 rounded-sm border border-success/30 bg-success/10 p-3 text-sm font-medium text-success"><LuCircleCheck />Order #{confirmation.orderNumber} was saved and sent to the kitchen.</div>}
        {readyOrders.length > 0 && <div className="mb-5 space-y-2">{readyOrders.map((notification) => <div key={notification.order.id} className="flex items-center justify-between gap-3 rounded-sm border border-success/30 bg-success/10 p-3 text-sm text-success"><span className="flex items-center gap-2 font-semibold"><LuCircleCheck />{notification.message} · {notification.order.tableLabel || 'Takeaway'}</span><button onClick={() => void markServed(notification)} className="rounded-sm bg-success px-3 py-1.5 text-xs font-bold text-success-foreground">Mark served</button></div>)}</div>}
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`rounded-sm px-4 py-2 text-sm font-semibold transition ${activeCategory === category ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15' : 'border bg-card text-muted-foreground hover:border-secondary/40 hover:text-foreground'}`}>{category}</button>)}</div><label className="relative min-w-56"><LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu…" className="w-full rounded-sm border bg-card py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring" /></label></div>
        {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading menu from database…</div> : visibleItems.length === 0 ? <div className="rounded-sm border border-dashed p-10 text-center text-sm text-muted-foreground">No menu items match this view.</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <button key={item.id} onClick={() => addItem(item)} className="group relative overflow-hidden rounded-sm border border-border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-xl"><div className="flex items-start justify-between"><span className={`flex size-11 items-center justify-center rounded-sm ${item.temperature === 'HOT' ? 'bg-warning/15 text-warning' : item.temperature === 'COLD' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent'}`}><LuCoffee className="size-5" /></span><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.category.name}</span></div><h2 className="mt-5 text-base font-semibold text-foreground">{item.name}</h2><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{item.description || item.category.name}</p><div className="mt-4 flex items-center justify-between border-t pt-4"><span className="text-lg font-bold text-foreground">{formatKes(item.price)}</span><span className="flex size-8 items-center justify-center rounded-full bg-secondary text-lg text-white shadow-md transition group-hover:scale-110"><LuPlus /></span></div></button>)}</div>}
      </section>
      <aside className="flex h-fit min-h-105 flex-col rounded-sm border border-border bg-card shadow-sm"><div className="flex items-center gap-2 border-b p-5"><span className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground"><LuReceiptText className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">Current order</h2><input aria-label="Table or customer label" value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} maxLength={60} className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring" placeholder="Table 1 or Takeaway" /></div></div><div className="flex-1 p-4">{cart.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-center"><LuCoffee className="size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Your order is empty</p><p className="mt-1 text-xs text-muted-foreground">Choose a menu item to begin.</p></div> : <div className="space-y-3">{cart.map((item) => { const itemPrice = item.price + item.addons.reduce((sum, addon) => sum + addon.price, 0); return <div key={item.id} className="rounded-sm bg-muted/50 p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatKes(itemPrice)} each</p></div><button onClick={() => changeQuantity(item.id, -item.quantity)} className="text-muted-foreground hover:text-destructive"><LuTrash2 /></button></div>{item.temperature !== 'OTHER' && addons.length > 0 && <div className="mt-3 border-t pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add-ons</p><div className="mt-2 flex flex-wrap gap-1.5">{addons.map((addon) => <button key={addon.id} onClick={() => toggleAddon(item.id, addon)} className={`rounded-full border px-2 py-1 text-xs ${item.addons.some((selected) => selected.id === addon.id) ? 'border-secondary bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground'}`}>{addon.name} · {formatKes(addon.price)}</button>)}</div></div>}<div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.id, -1)} className="rounded border bg-card p-1"><LuMinus className="size-3" /></button><span className="w-5 text-center text-sm font-medium">{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} className="rounded border bg-card p-1"><LuPlus className="size-3" /></button></div><span className="text-sm font-semibold">{formatKes(itemPrice * item.quantity)}</span></div></div> })}</div>}</div><footer className="border-t p-5"><div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatKes(total)}</span></div><button disabled={cart.length === 0 || submitting} onClick={() => void submitOrder()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-secondary py-2.5 text-sm font-medium text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50">{submitting && <LuLoaderCircle className="animate-spin" />}{submitting ? 'Saving order…' : `Charge ${formatKes(total)}`}</button></footer></aside>
    </div>
  )
}
