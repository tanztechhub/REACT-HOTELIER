import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  LuBoxes,
  LuCircleAlert,
  LuCircleCheck,
  LuLoaderCircle,
  LuPackage,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTriangleAlert,
  LuTrash2,
} from 'react-icons/lu'
import { api, hasApiTenant } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const UNITS_OF_MEASURE = [
  'Each', 'Pieces', 'Kg', 'Grams', 'Litres', 'Millilitres', 'Box', 'Carton',
  'Pack', 'Dozen', 'Roll', 'Bottle', 'Can', 'Bag', 'Set', 'Pair', 'Meter',
] as const

type Store = { id: string; name: string; code: string }
type Category = { id: string; name: string; level: number; parentId: string | null }
type Product = {
  id: string
  storeId: string
  store: { id: string; name: string; code: string }
  categoryId: string | null
  category: { id: string; name: string; level: number } | null
  name: string
  sku: string | null
  barcode: string | null
  brand: string | null
  description: string | null
  unit: string
  isPerishable: boolean
  shelfLifeDays: number | null
  quantity: string
  reorderLevel: string
  maxStockLevel: string | null
  unitCost: string | null
  preferredSupplier: string | null
  isActive: boolean
  createdAt: string
}
type Summary = { total: number; active: number; inactive: number; lowStock: number }
type Movement = { id: string; type: 'RECEIPT' | 'DISPATCH' | 'ADJUSTMENT'; quantity: string; note: string | null; occurredAt: string }

type ProductForm = {
  storeId: string
  categoryId: string
  name: string
  sku: string
  barcode: string
  brand: string
  description: string
  unit: (typeof UNITS_OF_MEASURE)[number]
  isPerishable: boolean
  shelfLifeDays: string
  quantity: string
  reorderLevel: string
  maxStockLevel: string
  unitCost: string
  preferredSupplier: string
  isActive: boolean
}
const emptyForm: ProductForm = {
  storeId: '', categoryId: '', name: '', sku: '', barcode: '', brand: '', description: '',
  unit: 'Each', isPerishable: false, shelfLifeDays: '',
  quantity: '0', reorderLevel: '0', maxStockLevel: '', unitCost: '', preferredSupplier: '',
  isActive: true,
}

function SetupMessage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">Workspace not resolved yet.</p>
    </div>
  )
}

export default function Products() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, inactive: 0, lowStock: 0 })
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [movements, setMovements] = useState<Movement[] | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (storeFilter) query.set('storeId', storeFilter)
      if (lowStockOnly) query.set('lowStock', 'true')
      const response = await api<{ products: Product[]; summary: Summary }>(`/products${query.size ? `?${query}` : ''}`)
      setProducts(response.products)
      setSummary(response.summary)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load products'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [search, storeFilter, lowStockOnly, toast])

  useEffect(() => { const timer = window.setTimeout(() => void loadProducts(), 250); return () => window.clearTimeout(timer) }, [loadProducts])

  useEffect(() => {
    Promise.all([
      api<{ stores: Store[] }>('/stores'),
      api<{ categories: Category[] }>('/categories'),
    ]).then(([storeRes, categoryRes]) => {
      setStores(storeRes.stores)
      setCategories(categoryRes.categories)
    }).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Could not load stores/categories'))
  }, [toast])

  const categoryLabel = useMemo(() => (c: Category) => '— '.repeat(c.level - 1) + c.name, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, storeId: stores[0]?.id ?? '' })
    setMovements(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      storeId: product.storeId,
      categoryId: product.categoryId ?? '',
      name: product.name,
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      brand: product.brand ?? '',
      description: product.description ?? '',
      unit: product.unit as (typeof UNITS_OF_MEASURE)[number],
      isPerishable: product.isPerishable,
      shelfLifeDays: product.shelfLifeDays?.toString() ?? '',
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      maxStockLevel: product.maxStockLevel ?? '',
      unitCost: product.unitCost ?? '',
      preferredSupplier: product.preferredSupplier ?? '',
      isActive: product.isActive,
    })
    setMovements(null)
    setError('')
    setShowForm(true)
    api<{ movements: Movement[] }>(`/products/${product.id}/movements`).then((r) => setMovements(r.movements)).catch(() => setMovements([]))
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = { ...form, ...(editing ? { quantity: undefined } : {}) }
      await api(editing ? `/products/${editing.id}` : '/products', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      setNotice(editing ? 'Product updated.' : 'Product added.')
      toast.success(editing ? 'Product updated.' : 'Product added.')
      setShowForm(false)
      await loadProducts()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save product'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Permanently delete ${product.name}?`)) return
    setError('')
    setNotice('')
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' })
      setNotice('Product deleted.')
      toast.success('Product deleted.')
      await loadProducts()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not delete product'
      setError(message)
      toast.error(message)
    }
  }

  if (!hasApiTenant()) return <SetupMessage />

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Inventory</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Products</h1>
          <p className="mt-2 text-sm text-muted-foreground">Record everything received into your stores and track stock on hand.</p>
        </div>
        <button onClick={openCreate} disabled={stores.length === 0} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 disabled:opacity-50">
          <LuPlus /> Add product
        </button>
      </header>
      {stores.length === 0 && !loading && (
        <p className="mt-3 text-sm text-warning">Create a store first (Inventory &rarr; Store) before adding products.</p>
      )}

      <section className="mt-7 grid gap-3 sm:grid-cols-4">
        {([
          ['Total products', summary.total, <LuPackage key="a" />],
          ['Active', summary.active, <LuBoxes key="b" />],
          ['Inactive', summary.inactive, <LuBoxes key="c" />],
          ['Low stock', summary.lowStock, <LuTriangleAlert key="d" />],
        ] as const).map(([label, value, icon]) => (
          <div key={label} className="rounded-sm border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm font-medium">{label}</span>
              <span className={label === 'Low stock' && Number(value) > 0 ? 'text-warning' : 'text-secondary'}>{icon}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-success/25 bg-success/10 p-3 text-sm text-success">
          <LuCircleCheck />
          {notice}
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-sm border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, barcode, brand…" className="w-full rounded-sm border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="rounded-sm border bg-background px-3 py-2.5 text-sm outline-none">
            <option value="">All stores</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="size-4 accent-secondary" />
            Low stock only
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading products…</div>
        ) : products.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">No products match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Store</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Unit Cost</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const low = Number(product.quantity) <= Number(product.reorderLevel)
                  return (
                    <tr key={product.id} className="border-t transition hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{[product.sku, product.brand].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{product.category?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-muted-foreground">{product.store.name}</td>
                      <td className="px-5 py-4">
                        <span className={cn('font-semibold', low ? 'text-warning' : 'text-foreground')}>{Number(product.quantity).toLocaleString()} {product.unit}</span>
                        {low && <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">Low</span>}
                        {!product.isActive && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Inactive</span>}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{product.unitCost ? `KES ${Number(product.unitCost).toLocaleString()}` : '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(product)} title="Edit product" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil /></button>
                          <button onClick={() => void deleteProduct(product)} title="Delete product" className="rounded-sm p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveProduct} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit product' : 'New product'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Record a product'}</h2>
            </div>

            <FieldGroup title="Identity">
              <Field label="Name" required className="sm:col-span-2"><input required placeholder="e.g. Coca-Cola 500ml" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="SKU"><input placeholder="e.g. COKE-500" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" /></Field>
              <Field label="Barcode"><input placeholder="e.g. 5449000000996" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input" /></Field>
              <Field label="Brand"><input placeholder="e.g. Coca-Cola" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" /></Field>
              <Field label="Category">
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}
                </select>
              </Field>
              <Field label="Description" className="sm:col-span-2"><input placeholder="e.g. 500ml glass bottle" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Classification">
              <Field label="Unit of Measure" required>
                <select required className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as ProductForm['unit'] })}>
                  {UNITS_OF_MEASURE.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Shelf Life (days)"><input type="number" min="0" placeholder="e.g. 180" value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} className="input" /></Field>
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" checked={form.isPerishable} onChange={(e) => setForm({ ...form, isPerishable: e.target.checked })} className="size-4 accent-secondary" />
                This product is perishable
              </label>
            </FieldGroup>

            <FieldGroup title="Stock">
              <Field label="Store" required>
                <select required className="input" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                  <option value="" disabled>Select store</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              {editing ? (
                <Field label="Current Stock">
                  <input disabled className="input opacity-70" value={`${Number(editing.quantity).toLocaleString()} ${editing.unit}`} />
                </Field>
              ) : (
                <Field label="Opening Stock" required><input required type="number" min="0" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input" /></Field>
              )}
              <Field label="Reorder Level"><input type="number" min="0" step="0.001" placeholder="e.g. 12" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="input" /></Field>
              <Field label="Max Stock Level"><input type="number" min="0" step="0.001" placeholder="e.g. 200" value={form.maxStockLevel} onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Costing">
              <Field label="Unit Cost (KES)"><input type="number" min="0" step="0.01" placeholder="e.g. 45.50" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input" /></Field>
              <Field label="Preferred Supplier"><input placeholder="e.g. Nairobi Bottlers Ltd" value={form.preferredSupplier} onChange={(e) => setForm({ ...form, preferredSupplier: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <label className="mt-6 flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
              Active
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" />
            </label>

            {editing && movements && movements.length > 0 && (
              <div className="mt-6 border-t pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Stock Movements</p>
                <div className="space-y-1.5">
                  {movements.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-sm bg-muted/50 px-3 py-2 text-xs">
                      <span className="font-medium">{m.type === 'DISPATCH' ? 'Dispatch' : m.type === 'RECEIPT' ? 'Receipt' : 'Adjustment'}{m.note ? ` — ${m.note}` : ''}</span>
                      <span className={cn('font-semibold', Number(m.quantity) < 0 ? 'text-destructive' : 'text-success')}>{Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-t pt-5 first:mt-6 first:border-t">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cn('text-sm font-medium', className)}>
      {label}
      {required && <span className="text-destructive"> *</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
