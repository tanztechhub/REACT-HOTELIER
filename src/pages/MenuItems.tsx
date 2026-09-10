import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuEyeOff,
  LuImageOff,
  LuLayers,
  LuLoaderCircle,
  LuPencil,
  LuPlus,
  LuPower,
  LuSearch,
  LuTrash2,
  LuX,
} from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const TEMPERATURES = ['OTHER', 'HOT', 'COLD'] as const
type Temperature = (typeof TEMPERATURES)[number]
const tempLabel: Record<Temperature, string> = { OTHER: 'Not a drink', HOT: 'Hot drink', COLD: 'Cold drink' }

type Category = { id: string; name: string; isActive: boolean }
type MenuItem = {
  id: string
  name: string
  shortName: string | null
  menuCategoryId: string
  menuCategory: { id: string; name: string; isActive: boolean }
  description: string | null
  sku: string | null
  price: string
  taxRate: string | null
  photoUrl: string | null
  temperature: Temperature
  isVegetarian: boolean
  isActive: boolean
  isAvailable: boolean
  sortOrder: number
  _count: { orderItems: number; variants: number }
}

type Variant = {
  id: string
  menuItemId: string
  name: string
  sku: string | null
  price: string
  isActive: boolean
  sortOrder: number
}

type Form = {
  name: string
  shortName: string
  menuCategoryId: string
  description: string
  sku: string
  price: string
  taxRate: string
  photoUrl: string
  temperature: Temperature
  isVegetarian: boolean
  isActive: boolean
  isAvailable: boolean
}
const emptyForm: Form = {
  name: '', shortName: '', menuCategoryId: '', description: '', sku: '', price: '', taxRate: '',
  photoUrl: '', temperature: 'OTHER', isVegetarian: false, isActive: true, isAvailable: true,
}

const money = (v: string | number) => `KSh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default function MenuItems() {
  const toast = useToast()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unavailable'>('all')
  const [form, setForm] = useState<Form>(emptyForm)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [variantsFor, setVariantsFor] = useState<MenuItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (categoryFilter) query.set('categoryId', categoryFilter)
      if (statusFilter === 'active') query.set('active', 'true')
      if (statusFilter === 'inactive') query.set('active', 'false')
      if (statusFilter === 'unavailable') query.set('available', 'false')
      const response = await api<{ items: MenuItem[] }>(`/menu-items${query.size ? `?${query}` : ''}`)
      setItems(response.items)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load menu items'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter, toast])

  useEffect(() => { const t = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(t) }, [load])
  useEffect(() => {
    api<{ categories: Category[] }>('/menu-categories').then((r) => setCategories(r.categories)).catch(() => {})
  }, [])

  const summary = useMemo(() => ({
    total: items.length,
    unavailable: items.filter((i) => !i.isAvailable).length,
    inactive: items.filter((i) => !i.isActive).length,
  }), [items])

  const canReorder = !!categoryFilter && !search.trim() && statusFilter === 'all'

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, menuCategoryId: categoryFilter || categories.find((c) => c.isActive)?.id || '' })
    setShowForm(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setForm({
      name: item.name,
      shortName: item.shortName ?? '',
      menuCategoryId: item.menuCategoryId,
      description: item.description ?? '',
      sku: item.sku ?? '',
      price: String(Number(item.price)),
      taxRate: item.taxRate != null ? String(Number(item.taxRate)) : '',
      photoUrl: item.photoUrl ?? '',
      temperature: item.temperature,
      isVegetarian: item.isVegetarian,
      isActive: item.isActive,
      isAvailable: item.isAvailable,
    })
    setShowForm(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.menuCategoryId || form.price === '') return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        menuCategoryId: form.menuCategoryId,
        description: form.description.trim() || undefined,
        sku: form.sku.trim() || undefined,
        price: Number(form.price),
        taxRate: form.taxRate.trim() === '' ? undefined : Number(form.taxRate),
        photoUrl: form.photoUrl.trim() || undefined,
        temperature: form.temperature,
        isVegetarian: form.isVegetarian,
        isActive: form.isActive,
        isAvailable: form.isAvailable,
      }
      await api(editing ? `/menu-items/${editing.id}` : '/menu-items', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      toast.success(editing ? 'Menu item updated.' : 'Menu item created.')
      setShowForm(false)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save menu item')
    } finally {
      setSaving(false)
    }
  }

  async function patch(item: MenuItem, body: Partial<Pick<MenuItem, 'isActive' | 'isAvailable'>>, message: string) {
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      toast.success(message)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update menu item')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: MenuItem) {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    try {
      await api(`/menu-items/${item.id}`, { method: 'DELETE' })
      toast.success('Menu item deleted.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete menu item')
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (!canReorder || target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    setBusy(true)
    try {
      await api('/menu-items/reorder', { method: 'POST', body: JSON.stringify({ menuCategoryId: categoryFilter, orderedIds: next.map((i) => i.id) }) })
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not reorder')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{items.length} · Menu</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Menu Items</h1>
        </div>
        <button onClick={openCreate} disabled={categories.length === 0} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 disabled:opacity-60">
          <LuPlus /> New item
        </button>
      </header>

      {categories.length === 0 && !loading && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
          <LuCircleAlert /> Add a menu category first — Menu ▸ Menu Categories.
        </div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {([['Items', summary.total], ['Unavailable', summary.unavailable], ['Inactive', summary.inactive]] as const).map(([label, value]) => (
          <div key={label} className="rounded-sm border bg-card p-5 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, short name or SKU…" className="w-full rounded-sm border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="all">Any status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="unavailable">Unavailable only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading menu items…</div>
        ) : items.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">{search.trim() || categoryFilter || statusFilter !== 'all' ? 'No items match these filters.' : 'No menu items yet.'}</div>
        ) : (
          <div className="overflow-x-auto">
            {!canReorder && !search.trim() && !categoryFilter && (
              <p className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Filter by a single category to drag items into order.</p>
            )}
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                  <th className="w-14 text-center">Order</th>
                  <th className="w-14" aria-label="Image" />
                  <th>Item</th>
                  <th>Category</th>
                  <th className="text-right">Price</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0">
                {items.map((item, index) => (
                  <tr key={item.id} className={cn('align-middle transition hover:bg-muted/40', !item.isActive && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => void move(index, -1)} disabled={busy || !canReorder || index === 0} title={canReorder ? 'Move up' : 'Filter to one category to reorder'} className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-20">
                          <LuChevronUp className="size-4" />
                        </button>
                        <button onClick={() => void move(index, 1)} disabled={busy || !canReorder || index === items.length - 1} title={canReorder ? 'Move down' : 'Filter to one category to reorder'} className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-20">
                          <LuChevronDown className="size-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted/50 text-muted-foreground">
                        {item.photoUrl
                          ? <img src={item.photoUrl} alt="" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          : <LuImageOff className="size-4" />}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.shortName, item.sku && `SKU ${item.sku}`].filter(Boolean).join(' · ') || <span className="italic">no short name</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.menuCategory.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {item._count.variants > 0 ? <span className="text-xs font-normal text-muted-foreground">from </span> : null}
                      {money(item.price)}
                      {item.taxRate != null && <span className="ml-1 text-xs text-muted-foreground">+{Number(item.taxRate)}%</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void patch(item, { isAvailable: !item.isAvailable }, item.isAvailable ? 'Marked unavailable.' : 'Marked available.')}
                        disabled={busy}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition',
                          item.isAvailable ? 'border-success/40 text-success hover:bg-success/10' : 'border-warning/40 text-warning hover:bg-warning/10',
                        )}
                      >
                        {!item.isAvailable && <LuEyeOff className="size-3" />}
                        {item.isAvailable ? 'Available' : 'Sold out'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                        item.isActive ? 'border-success/40 text-success' : 'border-muted-foreground/30 text-muted-foreground',
                      )}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setVariantsFor(item)} title="Variants (sizes / options)" className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary">
                          <LuLayers className="size-4" />
                          {item._count.variants > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-4 text-secondary-foreground">{item._count.variants}</span>}
                        </button>
                        <button onClick={() => openEdit(item)} title="Edit" className="rounded-md p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil className="size-4" /></button>
                        <button
                          onClick={() => void patch(item, { isActive: !item.isActive }, item.isActive ? 'Item deactivated.' : 'Item activated.')}
                          disabled={busy}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                          className={cn('rounded-md p-2 hover:bg-muted', item.isActive ? 'text-muted-foreground' : 'text-success')}
                        >
                          <LuPower className="size-4" />
                        </button>
                        <button
                          onClick={() => void remove(item)}
                          disabled={item._count.orderItems > 0}
                          title={item._count.orderItems > 0 ? 'On an order — deactivate instead' : 'Delete'}
                          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        >
                          <LuTrash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit item' : 'New item'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add a menu item'}</h2>
            </div>

            <FieldGroup title="Basics">
              <Field label="Name" required className="sm:col-span-2"><input required autoFocus placeholder="e.g. Chicken Burger" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Short name"><input placeholder="Receipt / KOT label" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className="input" /></Field>
              <Field label="Category" required>
                <select required className="input" value={form.menuCategoryId} onChange={(e) => setForm({ ...form, menuCategoryId: e.target.value })}>
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
                </select>
              </Field>
              <Field label="Description" className="sm:col-span-2"><textarea rows={2} placeholder="Shown on the menu" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
              <Field label="Image URL" className="sm:col-span-2">
                <input type="url" placeholder="https://…" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} className="input" />
                {form.photoUrl.trim() && (
                  <span className="mt-2 flex size-24 items-center justify-center overflow-hidden rounded-md border bg-muted/50">
                    <img src={form.photoUrl} alt="preview" className="size-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0.15' }} />
                  </span>
                )}
              </Field>
            </FieldGroup>

            <FieldGroup title="Pricing">
              <Field label="Price (KSh)" required><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></Field>
              <Field label="Tax rate (%)"><input type="number" min="0" max="100" step="0.01" placeholder="Leave blank for the property default" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="input" /></Field>
              <Field label="SKU"><input placeholder="Optional — unique" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" /></Field>
              <Field label="Drink type">
                <select className="input" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value as Temperature })}>
                  {TEMPERATURES.map((t) => <option key={t} value={t}>{tempLabel[t]}</option>)}
                </select>
              </Field>
            </FieldGroup>

            <div className="mt-6 border-t pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menu flags</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ['isActive', 'On the menu', 'Uncheck to hide it entirely'],
                  ['isAvailable', 'Available now', 'Uncheck when temporarily sold out'],
                  ['isVegetarian', 'Vegetarian', ''],
                ] as const).map(([key, label, hint]) => (
                  <label key={key} className="flex cursor-pointer items-start gap-2.5 rounded-sm border bg-muted/40 p-3">
                    <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="mt-0.5 size-4 accent-secondary" />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving || !form.name.trim() || !form.menuCategoryId || form.price === ''} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {variantsFor && (
        <VariantsModal item={variantsFor} onClose={() => setVariantsFor(null)} onChanged={load} />
      )}
    </div>
  )
}

function VariantsModal({ item, onClose, onChanged }: { item: MenuItem; onClose: () => void; onChanged: () => Promise<void> }) {
  const toast = useToast()
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ name: '', price: '', sku: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', price: '', sku: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ variants: Variant[] }>(`/menu-items/${item.id}/variants`)
      setVariants(r.variants)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not load variants')
    } finally {
      setLoading(false)
    }
  }, [item.id, toast])
  useEffect(() => { void load() }, [load])

  async function add(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || draft.price === '') return
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}/variants`, { method: 'POST', body: JSON.stringify({ name: draft.name.trim(), price: Number(draft.price), sku: draft.sku.trim() || undefined }) })
      setDraft({ name: '', price: '', sku: '' })
      await load()
      await onChanged()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not add variant')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(id: string) {
    if (!editDraft.name.trim() || editDraft.price === '') return
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}/variants/${id}`, { method: 'PATCH', body: JSON.stringify({ name: editDraft.name.trim(), price: Number(editDraft.price), sku: editDraft.sku.trim() || undefined }) })
      setEditingId(null)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update variant')
    } finally {
      setBusy(false)
    }
  }

  async function patchVariant(v: Variant, body: Record<string, unknown>) {
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}/variants/${v.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update variant')
    } finally {
      setBusy(false)
    }
  }

  async function removeVariant(v: Variant) {
    if (!window.confirm(`Delete the "${v.name}" variant?`)) return
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}/variants/${v.id}`, { method: 'DELETE' })
      await load()
      await onChanged()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete variant')
    } finally {
      setBusy(false)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= variants.length) return
    const next = [...variants]
    ;[next[index], next[target]] = [next[target], next[index]]
    setVariants(next)
    setBusy(true)
    try {
      await api(`/menu-items/${item.id}/variants/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds: next.map((v) => v.id) }) })
    } catch {
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-secondary">Variants</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sizes / options with their own price — like Small / Medium / Large. <span className="font-medium text-foreground">Not add-ons.</span></p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><LuX className="size-4" /></button>
        </div>

        <form onSubmit={add} className="mt-5 grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
          <label className="text-xs font-medium">Name<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Large" className="input mt-1" /></label>
          <label className="text-xs font-medium">Price<input required type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="input mt-1" /></label>
          <label className="text-xs font-medium">SKU<input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="opt." className="input mt-1" /></label>
          <button disabled={busy || !draft.name.trim() || draft.price === ''} className="rounded-sm bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">Add</button>
        </form>

        <div className="mt-5 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading…</div>
          ) : variants.length === 0 ? (
            <p className="rounded-sm border border-dashed p-4 text-center text-sm text-muted-foreground">No variants — the base price of <span className="font-semibold text-foreground">{money(item.price)}</span> is used.</p>
          ) : variants.map((v, index) => (
            <div key={v.id} className={cn('rounded-sm border p-3', !v.isActive && 'opacity-60')}>
              {editingId === v.id ? (
                <div className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
                  <label className="text-xs font-medium">Name<input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="input mt-1" /></label>
                  <label className="text-xs font-medium">Price<input type="number" min="0" step="0.01" value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} className="input mt-1" /></label>
                  <label className="text-xs font-medium">SKU<input value={editDraft.sku} onChange={(e) => setEditDraft({ ...editDraft, sku: e.target.value })} className="input mt-1" /></label>
                  <div className="flex gap-1">
                    <button onClick={() => void saveEdit(v.id)} disabled={busy} className="rounded-sm bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground">Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded-sm border px-2.5 py-2 text-xs font-semibold hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => void move(index, -1)} disabled={busy || index === 0} className="rounded-sm text-muted-foreground hover:bg-muted disabled:opacity-20"><LuChevronUp className="size-3.5" /></button>
                    <button onClick={() => void move(index, 1)} disabled={busy || index === variants.length - 1} className="rounded-sm text-muted-foreground hover:bg-muted disabled:opacity-20"><LuChevronDown className="size-3.5" /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    {v.sku && <p className="text-xs text-muted-foreground">SKU {v.sku}</p>}
                  </div>
                  <span className="tabular-nums text-sm font-medium">{money(v.price)}</span>
                  <button onClick={() => void patchVariant(v, { isActive: !v.isActive })} disabled={busy} title={v.isActive ? 'Deactivate' : 'Activate'} className={cn('rounded-md p-1.5 hover:bg-muted', v.isActive ? 'text-muted-foreground' : 'text-success')}><LuPower className="size-3.5" /></button>
                  <button onClick={() => { setEditingId(v.id); setEditDraft({ name: v.name, price: String(Number(v.price)), sku: v.sku ?? '' }) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil className="size-3.5" /></button>
                  <button onClick={() => void removeVariant(v)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 className="size-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end border-t pt-4">
          <button onClick={onClose} className="rounded-sm border px-4 py-2 text-sm font-semibold hover:bg-muted">Done</button>
        </div>
      </div>
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-t pt-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cn('block text-sm font-medium', className)}>
      {label}
      {required && <span className="text-destructive"> *</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
