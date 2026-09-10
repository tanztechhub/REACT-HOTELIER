import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LuBedDouble, LuBuilding2, LuCheck, LuChevronDown, LuCircleAlert, LuCircleCheck, LuClipboardList, LuCoffee, LuLoaderCircle, LuMapPin, LuMinus,
  LuPause, LuPlus, LuReceiptText, LuSearch, LuSlidersHorizontal, LuTrash2, LuUserRound, LuX,
} from 'react-icons/lu'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store/hooks'
import { useWorkingLocation } from '@/lib/useWorkingLocation'
import { cn } from '@/lib/utils'
import CustomerSelectModal, { partyLabel, type SaleParty } from '@/components/pos/CustomerSelectModal'
import OrderSettlementPanel from '@/components/pos/OrderSettlementPanel'
import { type ReceiptProfile } from '@/components/pos/OrderReceipt'

type ApiVariant = { id: string; name: string; price: string | number; sku: string | null }
type ApiCatalogAddon = {
  id: string
  name: string
  description: string | null
  price: string | number
  imageUrl: string | null
  menuCategoryId: string | null
  menuCategory: { id: string; name: string } | null
}
type TaxMode = 'INCLUSIVE' | 'EXCLUSIVE'
type TaxTreatment = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT'
type ApiMenuItem = {
  id: string
  name: string
  description: string | null
  price: string | number
  temperature: 'HOT' | 'COLD' | 'OTHER'
  category: { id: string; name: string }
  variants: ApiVariant[]
  taxRate: string | number | null
  taxMode: TaxMode | null
  taxTreatment: TaxTreatment | null
}
type RestaurantTable = { id: string; label: string; area: string | null; status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE' }
type Location = { id: string; name: string; type: string | null; isActive: boolean; servesDirectly: boolean }
type BusinessProfile = { businessName: string; taxRate: string | null; taxMode: TaxMode }

type LineTax = { rate: number; mode: TaxMode; treatment: TaxTreatment }
type Addon = { id: string; name: string; price: number }
// The flat add-on catalog — each add-on optionally tagged with a menu
// category the POS picker filters on.
type CatalogAddon = Addon & { categoryId: string | null; categoryName: string | null }
type Variant = { id: string; name: string; price: number }
type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  temperature: 'HOT' | 'COLD' | 'OTHER'
  category: { id: string; name: string }
  variants: Variant[]
  tax: LineTax
}
// One configured line in the sale: an item, the chosen variant (size/option)
// if any, and the flattened set of chosen add-ons. Keyed by a generated id so
// the same item can sit on the cart twice with different options.
type CartLine = { key: string; item: MenuItem; variant: Variant | null; addons: Addon[]; quantity: number }
type CreatedOrder = { id: string; orderNumber: number }
type ReadyNotification = { type: 'ORDER_READY'; message: string; order: { id: string; orderNumber: number; table: { label: string } | null } }
type HeldSale = { key: string; label: string; tableId: string; discount: string; notes: string; cart: CartLine[] }
type PaymentMethod = { id: string; name: string; requiresReference: boolean }
type ActiveOrder = { id: string; orderNumber: number; status: string; total: number; customer: { firstName: string; lastName: string | null } | null; table: { label: string } | null }

const NON_FINAL_STATUSES = ['OPEN', 'PREPARING', 'READY', 'SERVED']

const formatKes = (price: number) => `KSh ${price.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const toNumber = (value: string | number) => (typeof value === 'number' ? value : Number(value))

function normalizeMenuItem(raw: ApiMenuItem): MenuItem {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    price: toNumber(raw.price),
    temperature: raw.temperature,
    category: raw.category,
    variants: raw.variants.map((v) => ({ id: v.id, name: v.name, price: toNumber(v.price) })),
    tax: {
      rate: raw.taxRate != null ? toNumber(raw.taxRate) : 0,
      mode: raw.taxMode ?? 'INCLUSIVE',
      treatment: raw.taxTreatment ?? 'STANDARD',
    },
  }
}

const taxLabel = (t: LineTax) =>
  t.treatment === 'EXEMPT' ? 'Exempt'
    : t.treatment === 'ZERO_RATED' || t.rate <= 0 ? 'Zero-rated (0%)'
    : `VAT ${t.rate}%${t.mode === 'INCLUSIVE' ? ' (incl)' : ''}`

/** Whether tapping the item opens the options step: it has sizes to pick, or
 * there are add-ons in the catalog to attach. Otherwise it drops straight
 * onto the cart. */
const needsCustomize = (item: MenuItem, addonCount: number) => item.variants.length > 0 || addonCount > 0

/** Same item + same variant + same multiset of add-ons is the same line. */
const configKey = (itemId: string, variantId: string | null, addonIds: string[]) =>
  `${itemId}::${variantId ?? ''}::${[...addonIds].sort().join(',')}`

const lineUnitPrice = (line: CartLine) => (line.variant?.price ?? line.item.price) + line.addons.reduce((sum, a) => sum + a.price, 0)
const lineTotal = (line: CartLine) => lineUnitPrice(line) * line.quantity

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

type TaxBucket = { key: string; label: string; net: number; tax: number; gross: number }

/** Live mirror of the server's computeOrderFinancials: tax is worked out per
 * line from the line's own treatment/rate/mode (menu-item override else the
 * property default, already resolved by the API), the order discount is
 * apportioned by line value, and lines are bucketed for the receipt-style
 * breakdown. Kept deliberately in step with lib/orderTotals.ts on the server. */
function computeFinancials(cart: CartLine[], discountInput: string) {
  const rows = cart.map((line) => ({ sub: lineTotal(line), tax: line.item.tax }))
  const subtotal = rows.reduce((s, r) => s + r.sub, 0)
  const discount = Math.min(Number(discountInput) || 0, subtotal)

  const buckets = new Map<string, TaxBucket>()
  let net = 0
  let taxAmount = 0
  let total = 0

  for (const { sub, tax } of rows) {
    const share = subtotal > 0 ? sub - discount * (sub / subtotal) : 0
    let lineNet: number
    let lineTax: number
    if (tax.treatment === 'EXEMPT' || tax.treatment === 'ZERO_RATED' || tax.rate <= 0) {
      lineNet = share; lineTax = 0
    } else if (tax.mode === 'EXCLUSIVE') {
      lineNet = share; lineTax = lineNet * (tax.rate / 100)
    } else {
      lineNet = share / (1 + tax.rate / 100); lineTax = share - lineNet
    }
    const lineGross = lineNet + lineTax
    net += lineNet; taxAmount += lineTax; total += lineGross

    const label = taxLabel(tax)
    const bucket = buckets.get(label) ?? { key: label, label, net: 0, tax: 0, gross: 0 }
    bucket.net += lineNet; bucket.tax += lineTax; bucket.gross += lineGross
    buckets.set(label, bucket)
  }

  const taxLines = [...buckets.values()].map((b) => ({ ...b, net: round2(b.net), tax: round2(b.tax), gross: round2(b.gross) }))
  return { subtotal: round2(subtotal), discount: round2(discount), net: round2(net), taxAmount: round2(taxAmount), total: round2(total), taxLines }
}

export default function PointOfSale() {
  const user = useAppSelector((s) => s.auth.user)
  const [tab, setTab] = useState<'NEW' | 'ACTIVE'>('NEW')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [allAddons, setAllAddons] = useState<CatalogAddon[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [activeCategory, setActiveCategory] = useState('All items')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')
  const categoryRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customizing, setCustomizing] = useState<MenuItem | null>(null)
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
    setMenuItems(menuResponse.items.map(normalizeMenuItem))
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
      const [profileResponse, locationResponse, methodsResponse, addonResponse] = await Promise.all([
        api<{ profile: BusinessProfile | null }>('/business-profile'),
        api<{ locations: Location[] }>('/locations'),
        api<{ methods: (PaymentMethod & { code: string })[] }>('/payment-methods?activeOnly=true'),
        api<{ addons: ApiCatalogAddon[] }>('/pos/addons'),
      ])
      setProfile(profileResponse.profile)
      setLocations(locationResponse.locations)
      // Room Charge is a system method the backend resolves by code when
      // settling to a folio — it isn't a real "how did they pay" choice.
      setPaymentMethods(methodsResponse.methods.filter((m) => m.code !== 'ROOM_CHARGE'))
      setAllAddons(addonResponse.addons.map((a) => ({
        id: a.id, name: a.name, price: toNumber(a.price),
        categoryId: a.menuCategoryId, categoryName: a.menuCategory?.name ?? null,
      })))
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
  const financials = useMemo(() => computeFinancials(cart, discount), [cart, discount])
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const instantServe = locations.find((l) => l.id === effectiveLocationId)?.servesDirectly === true

  function addConfiguredLine(item: MenuItem, variant: Variant | null, addons: Addon[], quantity: number) {
    setConfirmation(null)
    setCart((current) => {
      const key = configKey(item.id, variant?.id ?? null, addons.map((a) => a.id))
      const match = current.find((line) => configKey(line.item.id, line.variant?.id ?? null, line.addons.map((a) => a.id)) === key)
      if (match) return current.map((line) => (line === match ? { ...line, quantity: line.quantity + quantity } : line))
      return [...current, { key: crypto.randomUUID(), item, variant, addons, quantity }]
    })
  }

  function onItemClick(item: MenuItem) {
    if (needsCustomize(item, allAddons.length)) { setCustomizing(item); return }
    addConfiguredLine(item, null, [], 1)
  }

  function changeQuantity(key: string, change: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.key !== key) return [line]
      const quantity = line.quantity + change
      return quantity > 0 ? [{ ...line, quantity }] : []
    }))
  }

  function removeLine(key: string) {
    setCart((current) => current.filter((line) => line.key !== key))
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
          items: cart.map((line) => ({
            menuItemId: line.item.id,
            variantId: line.variant?.id,
            quantity: line.quantity,
            addons: line.addons.map((addon) => ({ addonId: addon.id, quantity: 1 })),
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
        <div className="pointer-events-none absolute -bottom-2 left-3 right-1 top-2 rotate-[0.6deg] rounded-sm border border-black/10 bg-white/70" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-2.5 -top-2.5 size-12 rotate-12 rounded-sm bg-[#f2921a] shadow-lg" aria-hidden="true" />
        <div
          className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-sm border border-black/10 bg-[#faf7f0] px-5 py-4 text-slate-800 shadow-[0_1px_1px_rgba(2,6,23,0.05),0_3px_5px_rgba(2,6,23,0.06),0_12px_22px_-8px_rgba(2,6,23,0.18)]"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(2,6,23,0.055) 28px)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">Point of Sale</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5"><LuBuilding2 className="size-3.5" /> {profile?.businessName ?? '—'}</span>
            <span className="flex items-center gap-1.5"><LuUserRound className="size-3.5" /> {user ? `${user.firstName} ${user.lastName}` : '—'}</span>
            {fixedLocation ? (
              <span className="flex items-center gap-1.5"><LuMapPin className="size-3.5" /> {fixedLocation.name}</span>
            ) : pickableLocations.length > 0 ? (
              <label className="flex items-center gap-1.5">
                <LuMapPin className="size-3.5" />
                <select value={selectedLocationId} onChange={(e) => setLocation(e.target.value)} className="rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-xs font-medium text-slate-700 outline-none">
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

      <div className="mt-6 flex w-fit flex-wrap gap-2.5">
        {([
          ['NEW', 'New Sale', <LuPlus key="i" className="size-4" />],
          ['ACTIVE', `Active Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}`, <LuClipboardList key="i" className="size-4" />],
        ] as const).map(([value, label, icon]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'inline-flex items-center gap-2.5 rounded-md py-2.5 pl-2.5 pr-4 text-sm font-semibold transition',
              tab === value
                ? 'bg-amber-400 text-amber-950 shadow-[0_1px_2px_rgba(2,6,23,0.08),0_10px_20px_-8px_rgba(2,6,23,0.35)]'
                : 'bg-amber-400/15 text-amber-700 hover:bg-amber-400/25',
            )}
          >
            <span className={cn('flex size-6 items-center justify-center rounded', tab === value ? 'bg-amber-950/10' : 'bg-amber-400/25')}>{icon}</span>
            {label}
          </button>
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
                  {visibleItems.map((item) => {
                    const priceFrom = item.variants.length > 0 ? Math.min(...item.variants.map((v) => v.price)) : item.price
                    return (
                      <button key={item.id} onClick={() => onItemClick(item)} className="group relative overflow-hidden rounded-sm border border-border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-xl">
                        <div className="flex items-start justify-between">
                          <span className={cn('flex size-11 items-center justify-center rounded-sm', item.temperature === 'HOT' ? 'bg-warning/15 text-warning' : item.temperature === 'COLD' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent')}><LuCoffee className="size-5" /></span>
                          <span className="rounded-sm bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.category.name}</span>
                        </div>
                        <h2 className="mt-5 text-base font-semibold text-foreground">{item.name}</h2>
                        <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{item.description || item.category.name}</p>
                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                          <span className="text-lg font-bold text-foreground">{item.variants.length > 0 ? `from ${formatKes(priceFrom)}` : formatKes(item.price)}</span>
                          <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-lg text-accent-foreground shadow-md transition group-hover:scale-110">{needsCustomize(item, allAddons.length) ? <LuSlidersHorizontal className="size-4" /> : <LuPlus />}</span>
                        </div>
                        {needsCustomize(item, allAddons.length) && (
                          <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-accent">
                            {[item.variants.length > 0 && 'Options', allAddons.length > 0 && 'Add-ons'].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    )
                  })}
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
                    {cart.map((line) => (
                      <div key={line.key} className="rounded-sm border bg-muted/40 p-3">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{line.item.name}</p>
                            {line.variant && <p className="text-xs font-medium text-secondary">{line.variant.name}</p>}
                            <p className="text-xs text-muted-foreground">{line.quantity} × {formatKes(line.variant?.price ?? line.item.price)}</p>
                          </div>
                          <button onClick={() => removeLine(line.key)} className="shrink-0 text-muted-foreground hover:text-destructive"><LuTrash2 className="size-4" /></button>
                        </div>
                        {line.addons.length > 0 && (
                          <ul className="mt-2 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
                            {line.addons.map((addon) => (
                              <li key={addon.id} className="flex justify-between"><span>+ {addon.name}</span><span>{formatKes(addon.price)}</span></li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => changeQuantity(line.key, -1)} className="rounded-sm border bg-card p-1"><LuMinus className="size-3" /></button>
                            <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                            <button onClick={() => changeQuantity(line.key, 1)} className="rounded-sm border bg-card p-1"><LuPlus className="size-3" /></button>
                          </div>
                          <span className="text-sm font-semibold">{formatKes(lineTotal(line))}</span>
                        </div>
                      </div>
                    ))}
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
                <div className="flex justify-between text-muted-foreground"><span>Net</span><span>{formatKes(financials.net)}</span></div>
                {financials.taxLines.map((t) => (
                  <div key={t.key} className="flex justify-between text-muted-foreground"><span>{t.label}</span><span>{formatKes(t.tax)}</span></div>
                ))}
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

      {customizing && (
        <CustomizeModal
          item={customizing}
          allAddons={allAddons}
          onClose={() => setCustomizing(null)}
          onAdd={(variant, addons, quantity) => { addConfiguredLine(customizing, variant, addons, quantity); setCustomizing(null) }}
        />
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
          allAddons={allAddons}
          onClose={() => setAddItemsOrder(null)}
          onAdded={() => { setAddItemsOrder(null); void loadActiveOrders() }}
        />
      )}
    </div>
  )
}

/** The options step: pick a variant (size/option) if the item has any, then
 * attach add-ons from the flat catalog. The add-on list is filtered by menu
 * category (defaulting to the item's own), or "All". Tap to add, × to remove.
 * Shown whenever the item has variants or the catalog has add-ons. */
function CustomizeModal({ item, allAddons, onClose, onAdd }: {
  item: MenuItem
  allAddons: CatalogAddon[]
  onClose: () => void
  onAdd: (variant: Variant | null, addons: Addon[], quantity: number) => void
}) {
  const [variantId, setVariantId] = useState(item.variants[0]?.id ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)

  // Category chips: "All" + every distinct category present in the catalog.
  const catOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const a of allAddons) if (a.categoryId && a.categoryName) seen.set(a.categoryId, a.categoryName)
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [allAddons])
  const [catFilter, setCatFilter] = useState<string>(() =>
    allAddons.some((a) => a.categoryId === item.category.id) ? item.category.id : 'ALL',
  )

  const variant = item.variants.find((v) => v.id === variantId) ?? null
  const filtered = catFilter === 'ALL' ? allAddons : allAddons.filter((a) => a.categoryId === catFilter)
  const selected = selectedIds.map((id) => allAddons.find((a) => a.id === id)!).filter(Boolean)

  const toggle = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const canAdd = item.variants.length === 0 || !!variant
  const chosenAddons: Addon[] = selected.map((a) => ({ id: a.id, name: a.name, price: a.price }))
  const unitPrice = (variant?.price ?? item.price) + chosenAddons.reduce((sum, a) => sum + a.price, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="grid max-h-[88vh] w-full max-w-lg grid-rows-[auto_1fr_auto] overflow-hidden rounded-sm border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.category.name}</p>
            <h2 className="truncate font-display text-xl font-semibold">{item.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-sm p-2 text-muted-foreground hover:bg-muted"><LuX /></button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4">
          {item.variants.length > 0 && (
            <fieldset>
              <legend className="mb-2 flex items-center justify-between text-sm font-semibold">
                Option <span className="text-[11px] font-medium uppercase tracking-wide text-accent">Choose 1</span>
              </legend>
              <div className="space-y-1.5">
                {item.variants.map((v) => (
                  <label key={v.id} className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm', variantId === v.id ? 'border-secondary bg-secondary/10 font-semibold' : 'hover:bg-muted')}>
                    <span className="flex items-center gap-2.5">
                      <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="accent-secondary" />
                      {v.name}
                    </span>
                    <span>{formatKes(v.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {allAddons.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Add-ons</p>
                {selected.length > 0 && <span className="text-[11px] font-medium text-muted-foreground">{selected.length} added</span>}
              </div>

              {catOptions.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {[{ id: 'ALL', name: 'All' }, ...catOptions].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCatFilter(c.id)}
                      className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', catFilter === c.id ? 'border-secondary bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {selected.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {selected.map((a) => (
                    <button key={a.id} type="button" onClick={() => toggle(a.id)} className="inline-flex items-center gap-1.5 rounded-full border border-secondary bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                      {a.name}{a.price > 0 ? ` · ${formatKes(a.price)}` : ''}
                      <LuX className="size-3" />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {filtered.length === 0 ? (
                  <p className="rounded-sm border border-dashed p-3 text-center text-xs text-muted-foreground">No add-ons in this category.</p>
                ) : filtered.map((addon) => {
                  const on = selectedIds.includes(addon.id)
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggle(addon.id)}
                      className={cn('flex w-full items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left text-sm', on ? 'border-secondary bg-secondary/10 font-medium' : 'hover:bg-muted')}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn('flex size-5 items-center justify-center rounded-sm border', on ? 'border-secondary bg-secondary text-secondary-foreground' : 'text-muted-foreground')}>
                          {on ? <LuCheck className="size-3.5" /> : <LuPlus className="size-3.5" />}
                        </span>
                        {addon.name}
                      </span>
                      <span className="text-muted-foreground">{addon.price > 0 ? `+ ${formatKes(addon.price)}` : 'Free'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="rounded-sm border bg-background p-1.5"><LuMinus className="size-3.5" /></button>
            <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="rounded-sm border bg-background p-1.5"><LuPlus className="size-3.5" /></button>
          </div>
          <button
            disabled={!canAdd}
            onClick={() => onAdd(variant, chosenAddons, quantity)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LuPlus className="size-4" /> Add · {formatKes(unitPrice * quantity)}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Appends more rounds to an order already in progress — same menu and the
 * same options step, a lighter-weight cart, no table/customer fields since
 * the order already has those. Posts to /pos/orders/:id/items. */
function AddItemsModal({ order, menuItems, allAddons, onClose, onAdded }: {
  order: ActiveOrder
  menuItems: MenuItem[]
  allAddons: CatalogAddon[]
  onClose: () => void
  onAdded: () => void
}) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customizing, setCustomizing] = useState<MenuItem | null>(null)
  const [existingItems, setExistingItems] = useState<{ id: string; name: string; variant: string | null; quantity: number; addons: string[] }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // What the customer already has on this order — shown read-only so the
  // cashier isn't ringing up a fresh round blind.
  useEffect(() => {
    api<{ order: { items: { id: string; quantity: number; menuItem: { name: string }; variant: { name: string } | null; addons: { addon: { name: string } }[] }[] } }>(`/pos/orders/${order.id}`)
      .then((r) => setExistingItems(r.order.items.map((i) => ({ id: i.id, name: i.menuItem.name, variant: i.variant?.name ?? null, quantity: i.quantity, addons: i.addons.map((a) => a.addon.name) }))))
      .catch(() => setExistingItems([]))
  }, [order.id])

  const visibleItems = menuItems.filter((item) => !search.trim() || `${item.name} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  const total = cart.reduce((sum, line) => sum + lineTotal(line), 0)

  function addConfiguredLine(item: MenuItem, variant: Variant | null, addons: Addon[], quantity: number) {
    setCart((current) => {
      const key = configKey(item.id, variant?.id ?? null, addons.map((a) => a.id))
      const match = current.find((line) => configKey(line.item.id, line.variant?.id ?? null, line.addons.map((a) => a.id)) === key)
      if (match) return current.map((line) => (line === match ? { ...line, quantity: line.quantity + quantity } : line))
      return [...current, { key: crypto.randomUUID(), item, variant, addons, quantity }]
    })
  }

  function onItemClick(item: MenuItem) {
    if (needsCustomize(item, allAddons.length)) { setCustomizing(item); return }
    addConfiguredLine(item, null, [], 1)
  }

  function changeQuantity(key: string, change: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.key !== key) return [line]
      const quantity = line.quantity + change
      return quantity > 0 ? [{ ...line, quantity }] : []
    }))
  }

  async function submit() {
    if (!cart.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api(`/pos/orders/${order.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ items: cart.map((line) => ({ menuItemId: line.item.id, variantId: line.variant?.id, quantity: line.quantity, addons: line.addons.map((addon) => ({ addonId: addon.id, quantity: 1 })) })) }),
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
                <button key={item.id} onClick={() => onItemClick(item)} className="flex items-center justify-between gap-2 rounded-sm border bg-card p-3 text-left text-sm shadow-sm hover:border-accent/50">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    {needsCustomize(item) && <LuSlidersHorizontal className="size-3.5 text-accent" />}
                    {item.variants.length > 0 ? `from ${formatKes(Math.min(...item.variants.map((v) => v.price)))}` : formatKes(item.price)}
                  </span>
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
                      <span className="font-semibold text-foreground">{i.quantity}&times;</span> {i.name}{i.variant ? ` (${i.variant})` : ''}
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
                {cart.map((line) => (
                  <div key={line.key} className="rounded-sm border bg-card p-2.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{line.item.name}{line.variant ? ` · ${line.variant.name}` : ''}</span>
                      <button onClick={() => changeQuantity(line.key, -line.quantity)} className="shrink-0 text-muted-foreground hover:text-destructive"><LuTrash2 className="size-3.5" /></button>
                    </div>
                    {line.addons.length > 0 && <p className="mt-1 text-[10px] text-muted-foreground">{line.addons.map((a) => a.name).join(', ')}</p>}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQuantity(line.key, -1)} className="rounded-sm border bg-background p-1"><LuMinus className="size-3" /></button>
                        <span className="w-5 text-center text-xs font-medium">{line.quantity}</span>
                        <button onClick={() => changeQuantity(line.key, 1)} className="rounded-sm border bg-background p-1"><LuPlus className="size-3" /></button>
                      </div>
                      <span className="text-xs font-semibold">{formatKes(lineTotal(line))}</span>
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

      {customizing && (
        <CustomizeModal
          item={customizing}
          allAddons={allAddons}
          onClose={() => setCustomizing(null)}
          onAdd={(variant, addons, quantity) => { addConfiguredLine(customizing, variant, addons, quantity); setCustomizing(null) }}
        />
      )}
    </div>
  )
}
