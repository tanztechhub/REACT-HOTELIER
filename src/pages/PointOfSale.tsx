import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LuBedDouble, LuBuilding2, LuCheck, LuChevronDown, LuCircleAlert, LuCircleCheck, LuCoffee, LuLoaderCircle, LuMapPin, LuMinus,
  LuPause, LuPlus, LuReceiptText, LuSearch, LuTrash2, LuUserRound, LuX,
} from 'react-icons/lu'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store/hooks'
import { useWorkingLocation } from '@/lib/useWorkingLocation'
import { cn } from '@/lib/utils'
import CustomerSelectModal, { partyLabel, type SaleParty } from '@/components/pos/CustomerSelectModal'
import OrderSettlementPanel from '@/components/pos/OrderSettlementPanel'
import { type ReceiptProfile } from '@/components/pos/OrderReceipt'

type ApiAddon = { id: string; name: string; price: string | number; isActive: boolean }
type ApiMenuItem = {
  id: string
  name: string
  description: string | null
  price: string | number
  temperature: 'HOT' | 'COLD' | 'OTHER'
  category: { id: string; name: string }
  addons: ApiAddon[]
}
type RestaurantTable = { id: string; label: string; area: string | null; status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE' }
type Location = { id: string; name: string; type: string | null; isActive: boolean; servesDirectly: boolean }
type BusinessProfile = { businessName: string; taxRate: string | null; taxMode: 'INCLUSIVE' | 'EXCLUSIVE' }
type Addon = Omit<ApiAddon, 'price'> & { price: number }
type MenuItem = Omit<ApiMenuItem, 'price' | 'addons'> & { price: number; addons: Addon[] }
type CartItem = MenuItem & { quantity: number; selectedAddons: Addon[] }
type CreatedOrder = { id: string; orderNumber: number }
type ReadyNotification = { type: 'ORDER_READY'; message: string; order: { id: string; orderNumber: number; table: { label: string } | null } }
type HeldSale = { key: string; label: string; tableId: string; discount: string; notes: string; cart: CartItem[] }
type PaymentMethod = { id: string; name: string; requiresReference: boolean }
type ActiveOrder = { id: string; orderNumber: number; status: string; total: number; customer: { firstName: string; lastName: string | null } | null; table: { label: string } | null }

const NON_FINAL_STATUSES = ['OPEN', 'PREPARING', 'READY', 'SERVED']

const formatKes = (price: number) => `KSh ${price.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

function computeFinancials(cart: CartItem[], discountInput: string, profile: BusinessProfile | null) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity, 0)
  const discount = Math.min(Number(discountInput) || 0, subtotal)
  const taxable = subtotal - discount
  const rate = profile?.taxRate ? Number(profile.taxRate) : 0
  const taxMode = profile?.taxMode ?? 'INCLUSIVE'
  let taxAmount = 0
  let total = taxable
  if (rate > 0) {
    if (taxMode === 'EXCLUSIVE') { taxAmount = taxable * (rate / 100); total = taxable + taxAmount }
    else { taxAmount = taxable - taxable / (1 + rate / 100); total = taxable }
  }
  return { subtotal, discount, taxable, rate, taxMode, taxAmount, total }
}

export default function PointOfSale() {
  const user = useAppSelector((s) => s.auth.user)
  const [tab, setTab] = useState<'NEW' | 'ACTIVE'>('NEW')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [activeCategory, setActiveCategory] = useState('All items')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')
  const categoryRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableId, setTableId] = useState('')
  const [party, setParty] = useState<SaleParty>({ kind: 'WALK_IN' })
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [discount, setDiscount] = useState('0')
  const [heldSales, setHeldSales] = useState<HeldSale[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<CreatedOrder | null>(null)
  const [readyOrders, setReadyOrders] = useState<ReadyNotification[]>([])

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([])
  const [activeOrdersLoading, setActiveOrdersLoading] = useState(false)
  const [settlementOrderId, setSettlementOrderId] = useState<string | null>(null)
  const [addItemsOrder, setAddItemsOrder] = useState<ActiveOrder | null>(null)

  const { fixed: fixedLocation, options: pickableLocations, selectedId: selectedLocationId, setLocation, effectiveId: effectiveLocationId, needsChoice: needsLocationChoice } = useWorkingLocation(locations)

  async function loadMenuItems() {
    const query = effectiveLocationId ? `?locationId=${effectiveLocationId}` : ''
    const menuResponse = await api<{ items: ApiMenuItem[] }>(`/pos/menu-items${query}`)
    setMenuItems(menuResponse.items.map((item) => ({ ...item, price: Number(item.price), addons: item.addons.filter((a) => a.isActive).map((a) => ({ ...a, price: Number(a.price) })) })))
  }

  // Tables are scoped per location (a Bar shouldn't see a Restaurant's dine-in
  // tables) — refetches whenever the effective location changes, and
  // auto-selects a "Counter" table for that location when the current
  // selection isn't valid there (covers first load and switching locations).
  async function loadTables() {
    const query = effectiveLocationId ? `?locationId=${effectiveLocationId}` : ''
    const response = await api<{ tables: RestaurantTable[] }>(`/tables${query}`)
    setTables(response.tables)
    setTableId((current) => {
      if (response.tables.some((t) => t.id === current)) return current
      return response.tables.find((t) => t.label.toLowerCase().startsWith('counter'))?.id ?? ''
    })
  }

  async function loadActiveOrders() {
    setActiveOrdersLoading(true)
    try {
      const query = effectiveLocationId ? `&locationId=${effectiveLocationId}` : ''
      const response = await api<{ orders: ActiveOrder[] }>(`/pos/orders?channel=FOOD${query}`)
      setActiveOrders(response.orders.filter((o) => NON_FINAL_STATUSES.includes(o.status)))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load active orders')
    } finally {
      setActiveOrdersLoading(false)
    }
  }

  async function loadPos() {
    setLoading(true)
    setError('')
    try {
      const [profileResponse, locationResponse, methodsResponse] = await Promise.all([
        api<{ profile: BusinessProfile | null }>('/business-profile'),
        api<{ locations: Location[] }>('/locations'),
        api<{ methods: (PaymentMethod & { code: string })[] }>('/payment-methods?activeOnly=true'),
      ])
      setProfile(profileResponse.profile)
      setLocations(locationResponse.locations)
      // Room Charge is a system method the backend resolves by code when
      // settling to a folio — it isn't a real "how did they pay" choice.
      setPaymentMethods(methodsResponse.methods.filter((m) => m.code !== 'ROOM_CHARGE'))
      await Promise.all([loadMenuItems(), loadTables(), loadActiveOrders()])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the POS menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPos() }, [])
  useEffect(() => { if (!loading) { void loadMenuItems(); void loadTables(); void loadActiveOrders() } }, [effectiveLocationId])
  useEffect(() => {
    async function loadReady() {
      try { const response = await api<{ notifications: ReadyNotification[] }>('/pos/orders/ready'); setReadyOrders(response.notifications) } catch { /* Main POS error handling remains with menu and checkout actions. */ }
    }
    void loadReady()
    const timer = window.setInterval(() => void loadReady(), 15000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!categoryOpen) return
    const onClick = (e: MouseEvent) => { if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [categoryOpen])

  const categories = useMemo(() => ['All items', ...Array.from(new Set(menuItems.map((item) => item.category.name)))], [menuItems])
  const filteredCategories = categories.filter((c) => c.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
  const visibleItems = menuItems.filter((item) => (activeCategory === 'All items' || item.category.name === activeCategory) && (!search.trim() || `${item.name} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())))
  const financials = useMemo(() => computeFinancials(cart, discount, profile), [cart, discount, profile])
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const instantServe = locations.find((l) => l.id === effectiveLocationId)?.servesDirectly === true

  function addItem(item: MenuItem) {
    setConfirmation(null)
    setCart((current) => {
      const match = current.find((cartItem) => cartItem.id === item.id)
      return match ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1, selectedAddons: [] }]
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
    setCart((current) => current.map((item) => item.id !== itemId ? item : { ...item, selectedAddons: item.selectedAddons.some((selected) => selected.id === addon.id) ? item.selectedAddons.filter((selected) => selected.id !== addon.id) : [...item.selectedAddons, addon] }))
  }

  function resetSale() {
    setCart([])
    setTableId('')
    setDiscount('0')
    setConfirmation(null)
    setParty({ kind: 'WALK_IN' })
  }

  function holdSale() {
    if (!cart.length) return
    const table = tables.find((t) => t.id === tableId)
    setHeldSales((current) => [...current, { key: crypto.randomUUID(), label: table?.label ?? 'Takeaway', tableId, discount, notes: '', cart }])
    resetSale()
  }

  function resumeSale(held: HeldSale) {
    setCart(held.cart)
    setTableId(held.tableId)
    setDiscount(held.discount)
    setHeldSales((current) => current.filter((h) => h.key !== held.key))
  }

  function discardHeldSale(key: string) {
    setHeldSales((current) => current.filter((h) => h.key !== key))
  }

  async function submitOrder() {
    if (!cart.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api<{ order: CreatedOrder }>('/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          tableId: tableId || undefined,
          locationId: effectiveLocationId || undefined,
          customerId: party.kind === 'WALK_IN' ? undefined : party.customer.id,
          reservationId: party.kind === 'ROOM' ? party.reservationId : undefined,
          discount: financials.discount,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
            addons: item.selectedAddons.map((addon) => ({ addonId: addon.id, quantity: 1 })),
          })),
        }),
      })
      resetSale()
      setConfirmation(response.order)
      await loadPos()
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
      void loadActiveOrders()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not mark the order served') }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <div className="relative">
        <div className="pointer-events-none absolute -left-2.5 -top-2.5 size-12 rotate-12 rounded-sm bg-[#f2921a] shadow-lg" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-sm bg-secondary px-5 py-3.5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Checkout</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-white">Point of Sale</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/80">
            <span className="flex items-center gap-1.5"><LuBuilding2 className="size-3.5" /> {profile?.businessName ?? '—'}</span>
            <span className="flex items-center gap-1.5"><LuUserRound className="size-3.5" /> {user ? `${user.firstName} ${user.lastName}` : '—'}</span>
            {fixedLocation ? (
              <span className="flex items-center gap-1.5"><LuMapPin className="size-3.5" /> {fixedLocation.name}</span>
            ) : pickableLocations.length > 0 ? (
              <label className="flex items-center gap-1.5">
                <LuMapPin className="size-3.5" />
                <select value={selectedLocationId} onChange={(e) => setLocation(e.target.value)} className="rounded-sm border border-white/30 bg-white/10 px-1.5 py-1 text-xs font-medium text-white outline-none [&>option]:text-foreground">
                  <option value="">Select location…</option>
                  {pickableLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      </div>

      {error && <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}
      {confirmation && <div className="mt-5 flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 p-3 text-sm font-medium text-accent"><LuCircleCheck />{instantServe ? `Order #${confirmation.orderNumber} was served.` : `Order #${confirmation.orderNumber} was saved and sent to the kitchen.`}</div>}
      {readyOrders.length > 0 && (
        <div className="mt-5 space-y-2">
          {readyOrders.map((notification) => (
            <div key={notification.order.id} className="flex items-center justify-between gap-3 rounded-sm border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
              <span className="flex items-center gap-2 font-semibold"><LuCircleCheck />{notification.message} · {notification.order.table?.label || 'Takeaway'}</span>
              <button onClick={() => void markServed(notification)} className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Mark served</button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex w-fit gap-1 rounded-sm bg-muted/50 p-1">
        {([['NEW', 'New Sale'], ['ACTIVE', `Active Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}`]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className={cn('rounded-sm px-4 py-2 text-sm font-semibold', tab === value ? 'bg-card text-secondary shadow-sm' : 'text-muted-foreground')}>{label}</button>
        ))}
      </div>

      {tab === 'ACTIVE' ? (
        <section className="mt-6">
          {activeOrdersLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading active orders…</div>
          ) : activeOrders.length === 0 ? (
            <div className="rounded-sm border border-dashed p-10 text-center text-sm text-muted-foreground">No orders in progress right now.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeOrders.map((order) => (
                <article key={order.id} className="rounded-sm border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">{order.status}</span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><LuUserRound className="size-3.5" /> {order.customer ? `${order.customer.firstName} ${order.customer.lastName ?? ''}` : 'Walk-in'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{order.table?.label ?? 'Takeaway'}</p>
                  <p className="mt-3 text-lg font-bold">{formatKes(order.total)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setAddItemsOrder(order)} className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><LuPlus className="size-3.5" /> Add items</button>
                    <button onClick={() => setSettlementOrderId(order.id)} className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><LuReceiptText className="size-3.5" /> Complete & Pay</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mt-6 grid gap-0 lg:grid-cols-[minmax(0,1fr)_24px_360px]">
          <section>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label className="relative flex-1">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu…" className="w-full rounded-sm border bg-card py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div ref={categoryRef} className="relative sm:w-64">
                <button
                  type="button"
                  onClick={() => { setCategoryOpen((v) => !v); setCategoryQuery('') }}
                  className="flex w-full items-center justify-between gap-2 rounded-sm border bg-card px-3 py-2.5 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="truncate">{activeCategory}</span>
                  <LuChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', categoryOpen && 'rotate-180')} />
                </button>
                {categoryOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-sm border bg-card shadow-lg">
                    <div className="border-b p-2">
                      <input
                        autoFocus
                        value={categoryQuery}
                        onChange={(e) => setCategoryQuery(e.target.value)}
                        placeholder="Search categories…"
                        className="w-full rounded-sm border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="scrollbar-thin max-h-56 overflow-y-auto py-1">
                      {filteredCategories.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No categories match.</p>
                      ) : filteredCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => { setActiveCategory(category); setCategoryOpen(false) }}
                          className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted', activeCategory === category && 'bg-secondary/10 font-semibold text-secondary')}
                        >
                          {category}
                          {activeCategory === category && <LuCheck className="size-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading menu…</div>
              ) : visibleItems.length === 0 ? (
                <div className="rounded-sm border border-dashed p-10 text-center text-sm text-muted-foreground">No menu items match this view.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => (
                    <button key={item.id} onClick={() => addItem(item)} className="group relative overflow-hidden rounded-sm border border-border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-xl">
                      <div className="flex items-start justify-between">
                        <span className={cn('flex size-11 items-center justify-center rounded-sm', item.temperature === 'HOT' ? 'bg-warning/15 text-warning' : item.temperature === 'COLD' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent')}><LuCoffee className="size-5" /></span>
                        <span className="rounded-sm bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.category.name}</span>
                      </div>
                      <h2 className="mt-5 text-base font-semibold text-foreground">{item.name}</h2>
                      <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{item.description || item.category.name}</p>
                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <span className="text-lg font-bold text-foreground">{formatKes(item.price)}</span>
                        <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-lg text-accent-foreground shadow-md transition group-hover:scale-110"><LuPlus /></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Node-line divider */}
          <div className="relative hidden lg:block" aria-hidden="true">
            <span className="absolute left-1/2 -top-1.5 block size-3 -translate-x-1/2 rounded-full bg-secondary" />
            <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-secondary/30" />
            <span className="absolute bottom-0 left-1/2 block size-3 -translate-x-1/2 -translate-y-1.5 rounded-full bg-secondary" />
          </div>

          <aside className="mt-8 flex h-fit flex-col gap-3 lg:mt-0">
            {heldSales.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {heldSales.map((held) => (
                  <div key={held.key} className="flex items-center gap-1 rounded-sm border border-warning/40 bg-warning/10 py-1 pl-2.5 pr-1 text-xs font-semibold text-warning">
                    <button type="button" onClick={() => resumeSale(held)} className="flex items-center gap-1.5">
                      <LuPause className="size-3" /> {held.label} · {held.cart.reduce((s, i) => s + i.quantity, 0)} items
                    </button>
                    <button type="button" onClick={() => discardHeldSale(held.key)} title="Discard held sale" className="rounded-sm p-1 hover:bg-warning/20"><LuTrash2 className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col overflow-hidden rounded-lg border-2 border-secondary/40 bg-card shadow-md">
              <div className="flex items-start justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current Sale</p>
                  <button type="button" onClick={() => setCustomerModalOpen(true)} className="mt-1.5 flex max-w-full items-center gap-2 text-left">
                    {party.kind === 'ROOM'
                      ? <LuBedDouble className="size-4 shrink-0 text-secondary" />
                      : <LuUserRound className="size-4 shrink-0 text-primary" />}
                    <span className="truncate text-lg font-semibold text-foreground">{partyLabel(party)}</span>
                    <LuChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  {party.kind === 'ROOM' && (
                    <p className="mt-1 text-xs font-semibold text-secondary">Charges to Room {party.roomNumber} at settlement</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex size-14 flex-col items-center justify-center rounded-full border-2 border-dashed border-secondary text-[9px] font-bold uppercase leading-none tracking-wide text-secondary">
                    <span>Open</span>
                    <span className="mt-0.5">Sale</span>
                  </span>
                  <button
                    type="button"
                    onClick={resetSale}
                    disabled={cart.length === 0 && party.kind === 'WALK_IN' && !tableId}
                    title="Clear this sale"
                    className="rounded-sm p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                  >
                    <LuTrash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="border-b px-4 py-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Table</label>
                <select aria-label="Table" value={tableId} onChange={(event) => setTableId(event.target.value)} className="mt-1.5 w-full rounded-sm border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Takeaway</option>
                  {/* A table can carry several separate orders at once — only
                      one actually out of service is unselectable. */}
                  {tables.map((t) => <option key={t.id} value={t.id} disabled={t.status === 'OUT_OF_SERVICE'}>{t.label}{t.area ? ` (${t.area})` : ''}{t.status === 'OCCUPIED' ? ' — in use' : t.status === 'OUT_OF_SERVICE' ? ' — out of service' : ''}</option>)}
                </select>
              </div>

              <div className="max-h-96 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-center">
                    <LuCoffee className="size-7 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">Your order is empty</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose a menu item to begin.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const itemPrice = item.price + item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
                      return (
                        <div key={item.id} className="rounded-sm border bg-muted/40 p-3">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity} × {formatKes(item.price)}{item.selectedAddons.length > 0 && ` + ${item.selectedAddons.length} add-on${item.selectedAddons.length === 1 ? '' : 's'}`}</p>
                            </div>
                            <button onClick={() => changeQuantity(item.id, -item.quantity)} className="shrink-0 text-muted-foreground hover:text-destructive"><LuTrash2 className="size-4" /></button>
                          </div>
                          {item.addons.length > 0 && (
                            <div className="mt-2.5 border-t pt-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {item.addons.map((addon) => (
                                  <button key={addon.id} onClick={() => toggleAddon(item.id, addon)} className={cn('rounded-sm border px-2 py-1 text-[11px]', item.selectedAddons.some((selected) => selected.id === addon.id) ? 'border-secondary bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground')}>
                                    {addon.name} · {formatKes(addon.price)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => changeQuantity(item.id, -1)} className="rounded-sm border bg-card p-1"><LuMinus className="size-3" /></button>
                              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                              <button onClick={() => changeQuantity(item.id, 1)} className="rounded-sm border bg-card p-1"><LuPlus className="size-3" /></button>
                            </div>
                            <span className="text-sm font-semibold">{formatKes(itemPrice * item.quantity)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t p-4">
                <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Discount (KES)
                  <input type="number" min="0" step="1" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 rounded-sm border bg-background px-2 py-1 text-right text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>

              <div className="space-y-1.5 border-t bg-muted/30 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatKes(financials.subtotal)}</span></div>
                {financials.discount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-{formatKes(financials.discount)}</span></div>}
                {financials.rate > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({financials.rate}% {financials.taxMode === 'EXCLUSIVE' ? 'excl.' : 'incl.'})</span><span>{formatKes(financials.taxAmount)}</span></div>}
                <div className="flex justify-between border-t pt-1.5 text-base font-bold text-foreground"><span>Total</span><span>{formatKes(financials.total)}</span></div>
              </div>

              {needsLocationChoice && cart.length > 0 && (
                <p className="border-t bg-warning/10 px-4 py-2 text-center text-xs font-medium text-warning">Select which location this sale is for (top right) before sending.</p>
              )}

              <div className="flex gap-2 p-4 pt-0">
                <button disabled={cart.length === 0} onClick={holdSale} className="flex items-center justify-center gap-1.5 rounded-sm border border-warning/50 px-3 py-2.5 text-xs font-bold text-warning transition hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-40">
                  <LuPause className="size-3.5" /> Hold
                </button>
                <button disabled={cart.length === 0 || submitting || needsLocationChoice} onClick={() => void submitOrder()} className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting && <LuLoaderCircle className="animate-spin" />}
                  {submitting ? 'Sending…' : instantServe ? `Serve now · ${formatKes(financials.total)}` : `Send order · ${formatKes(financials.total)}`}
                </button>
              </div>
            </div>

            <p className="px-1 text-center text-[11px] text-muted-foreground">{itemCount} item{itemCount === 1 ? '' : 's'} in this sale · payment is decided once the order is complete</p>
          </aside>
        </div>
      )}

      {customerModalOpen && (
        <CustomerSelectModal party={party} onChange={setParty} onClose={() => setCustomerModalOpen(false)} />
      )}

      {settlementOrderId && (
        <OrderSettlementPanel
          orderId={settlementOrderId}
          title="Active order"
          profile={profile as ReceiptProfile}
          paymentMethods={paymentMethods}
          onClose={() => setSettlementOrderId(null)}
          onChanged={() => void loadActiveOrders()}
        />
      )}

      {addItemsOrder && (
        <AddItemsModal
          order={addItemsOrder}
          menuItems={menuItems}
          onClose={() => setAddItemsOrder(null)}
          onAdded={() => { setAddItemsOrder(null); void loadActiveOrders() }}
        />
      )}
    </div>
  )
}

/** Appends more rounds to an order already in progress — same menu, a
 * lighter-weight cart, no table/customer fields since the order already has
 * those. Posts to /pos/orders/:id/items. */
function AddItemsModal({ order, menuItems, onClose, onAdded }: {
  order: ActiveOrder
  menuItems: MenuItem[]
  onClose: () => void
  onAdded: () => void
}) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [existingItems, setExistingItems] = useState<{ id: string; name: string; quantity: number; addons: string[] }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // What the customer already has on this order — shown read-only so the
  // cashier isn't ringing up a fresh round blind. Adding a line that's
  // already here just bumps its quantity server-side (POST .../items).
  useEffect(() => {
    api<{ order: { items: { id: string; quantity: number; menuItem: { name: string }; addons: { addon: { name: string } }[] }[] } }>(`/pos/orders/${order.id}`)
      .then((r) => setExistingItems(r.order.items.map((i) => ({ id: i.id, name: i.menuItem.name, quantity: i.quantity, addons: i.addons.map((a) => a.addon.name) }))))
      .catch(() => setExistingItems([]))
  }, [order.id])

  const visibleItems = menuItems.filter((item) => !search.trim() || `${item.name} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const total = cart.reduce((sum, item) => sum + (item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity, 0)

  function addItem(item: MenuItem) {
    setCart((current) => {
      const match = current.find((cartItem) => cartItem.id === item.id)
      return match ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1, selectedAddons: [] }]
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
    setCart((current) => current.map((item) => item.id !== itemId ? item : { ...item, selectedAddons: item.selectedAddons.some((selected) => selected.id === addon.id) ? item.selectedAddons.filter((selected) => selected.id !== addon.id) : [...item.selectedAddons, addon] }))
  }

  async function submit() {
    if (!cart.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api(`/pos/orders/${order.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity, addons: item.selectedAddons.map((addon) => ({ addonId: addon.id, quantity: 1 })) })) }),
      })
      onAdded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add these items')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="grid max-h-[88vh] w-full max-w-3xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-sm border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <p className="text-sm font-semibold text-secondary">Order #{order.orderNumber}</p>
            <h2 className="font-display text-xl font-semibold">Add items</h2>
          </div>
          <button onClick={onClose} className="rounded-sm p-2 text-muted-foreground hover:bg-muted"><LuX /></button>
        </div>

        {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}

        <div className="grid gap-0 overflow-hidden lg:grid-cols-[1fr_300px]">
          <div className="overflow-y-auto p-4">
            <label className="relative block">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu…" className="w-full rounded-sm border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {visibleItems.map((item) => (
                <button key={item.id} onClick={() => addItem(item)} className="flex items-center justify-between gap-2 rounded-sm border bg-card p-3 text-left text-sm shadow-sm hover:border-accent/50">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">{formatKes(item.price)}</span>
                </button>
              ))}
              {visibleItems.length === 0 && <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">No menu items match.</p>}
            </div>
          </div>

          <div className="flex flex-col overflow-y-auto border-t bg-muted/20 p-4 lg:border-l lg:border-t-0">
            {existingItems.length > 0 && (
              <div className="mb-3 border-b pb-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">On this order now</p>
                <div className="space-y-1">
                  {existingItems.map((i) => (
                    <p key={i.id} className="truncate text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{i.quantity}&times;</span> {i.name}
                      {i.addons.length > 0 && ` · ${i.addons.join(', ')}`}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {existingItems.length > 0 && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adding</p>}
            {cart.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">No items added yet.</p>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-sm border bg-card p-2.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{item.name}</span>
                      <button onClick={() => changeQuantity(item.id, -item.quantity)} className="shrink-0 text-muted-foreground hover:text-destructive"><LuTrash2 className="size-3.5" /></button>
                    </div>
                    {item.addons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.addons.map((addon) => (
                          <button key={addon.id} onClick={() => toggleAddon(item.id, addon)} className={cn('rounded-sm border px-1.5 py-0.5 text-[10px]', item.selectedAddons.some((s) => s.id === addon.id) ? 'border-secondary bg-secondary text-secondary-foreground' : 'text-muted-foreground')}>{addon.name}</button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQuantity(item.id, -1)} className="rounded-sm border bg-background p-1"><LuMinus className="size-3" /></button>
                        <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)} className="rounded-sm border bg-background p-1"><LuPlus className="size-3" /></button>
                      </div>
                      <span className="text-xs font-semibold">{formatKes((item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <span className="text-sm font-semibold">Adding: {formatKes(total)}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button disabled={!cart.length || submitting} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {submitting && <LuLoaderCircle className="animate-spin" />} Add to order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
