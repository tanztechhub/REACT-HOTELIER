import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { LuCircleAlert, LuCircleCheck, LuLeaf, LuLoaderCircle, LuPencil, LuPlus, LuTrash2, LuUtensils } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import Categories from '@/pages/Categories'

type Category = { id: string; name: string; level: number }
type Product = { id: string; name: string }
type Recipe = { id: string; name: string }
type Addon = { id: string; name: string; price: string; isActive: boolean }
type Location = { id: string; name: string; type: string | null; isActive: boolean }
type MenuItem = {
  id: string
  categoryId: string
  category: { id: string; name: string } | null
  productId: string | null
  product: { id: string; name: string } | null
  recipeId: string | null
  recipe: { id: string; name: string } | null
  name: string
  description: string | null
  photoUrl: string | null
  price: string
  temperature: 'HOT' | 'COLD' | 'OTHER'
  isVegetarian: boolean
  isAvailable: boolean
  addons: Addon[]
  locations: Location[]
}

type ItemForm = {
  categoryId: string
  productId: string
  recipeId: string
  name: string
  description: string
  photoUrl: string
  price: string
  temperature: 'HOT' | 'COLD' | 'OTHER'
  isVegetarian: boolean
  isAvailable: boolean
  addonIds: string[]
  locationIds: string[]
}
const emptyItemForm: ItemForm = {
  categoryId: '', productId: '', recipeId: '', name: '', description: '', photoUrl: '',
  price: '', temperature: 'OTHER', isVegetarian: false, isAvailable: true, addonIds: [], locationIds: [],
}

type AddonForm = { name: string; price: string; isActive: boolean }
const emptyAddonForm: AddonForm = { name: '', price: '', isActive: true }

const TABS = ['Menu Items', 'Categories', 'Addons'] as const
type Tab = (typeof TABS)[number]

export default function MenuAndAddons() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('Menu Items')

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">Kitchen</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Menu &amp; Addons</h1>
        <p className="mt-2 text-sm text-muted-foreground">Build your sellable menu — categories, dishes, and the extras guests can add to them.</p>
      </header>

      <div className="mt-6 flex flex-wrap gap-1 rounded-sm border bg-card p-1 shadow-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-sm px-4 py-2 text-sm font-semibold transition', tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Menu Items' && <MenuItemsTab toast={toast} />}
        {tab === 'Categories' && <Categories scope="RESTAURANT" title="Menu Categories" subtitle="Organize menu items up to three levels deep." embedded />}
        {tab === 'Addons' && <AddonsTab toast={toast} />}
      </div>
    </div>
  )
}

function MenuItemsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<ItemForm>(emptyItemForm)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api<{ items: MenuItem[] }>('/menu/items')
      setItems(response.items)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load menu items'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    Promise.all([
      api<{ categories: Category[] }>('/categories?scope=RESTAURANT'),
      api<{ products: Product[] }>('/products'),
      api<{ recipes: Recipe[] }>('/recipes'),
      api<{ addons: Addon[] }>('/menu/addons'),
      api<{ locations: Location[] }>('/locations'),
    ]).then(([c, p, r, a, l]) => { setCategories(c.categories); setProducts(p.products); setRecipes(r.recipes); setAddons(a.addons); setLocations(l.locations) })
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Could not load menu references'))
  }, [toast])

  function openCreate() {
    setEditing(null)
    setForm(emptyItemForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setForm({
      categoryId: item.categoryId,
      productId: item.productId ?? '',
      recipeId: item.recipeId ?? '',
      name: item.name,
      description: item.description ?? '',
      photoUrl: item.photoUrl ?? '',
      price: item.price,
      temperature: item.temperature,
      isVegetarian: item.isVegetarian,
      isAvailable: item.isAvailable,
      addonIds: item.addons.map((a) => a.id),
      locationIds: item.locations.map((l) => l.id),
    })
    setError('')
    setShowForm(true)
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = { ...form, productId: form.productId || null, recipeId: form.recipeId || null }
      await api(editing ? `/menu/items/${editing.id}` : '/menu/items', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      setNotice(editing ? 'Menu item updated.' : 'Menu item added.')
      toast.success(editing ? 'Menu item updated.' : 'Menu item added.')
      setShowForm(false)
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save menu item'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!window.confirm(`Permanently delete ${item.name}?`)) return
    setError('')
    setNotice('')
    try {
      await api(`/menu/items/${item.id}`, { method: 'DELETE' })
      setNotice('Menu item deleted.')
      toast.success('Menu item deleted.')
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not delete menu item'
      setError(message)
      toast.error(message)
    }
  }

  function toggleAddon(id: string) {
    setForm((f) => ({ ...f, addonIds: f.addonIds.includes(id) ? f.addonIds.filter((a) => a !== id) : [...f.addonIds, id] }))
  }

  function toggleLocation(id: string) {
    setForm((f) => ({ ...f, locationIds: f.locationIds.includes(id) ? f.locationIds.filter((l) => l !== id) : [...f.locationIds, id] }))
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <button onClick={openCreate} disabled={categories.length === 0} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 disabled:opacity-50">
          <LuPlus /> New menu item
        </button>
      </div>
      {categories.length === 0 && !loading && (
        <p className="mt-3 text-right text-sm text-warning">Add a menu category first (Categories tab) before adding menu items.</p>
      )}

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

      {loading ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading menu items…</div>
      ) : items.length === 0 ? (
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No menu items yet. Add your first one to start selling.</div>
      ) : (
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-secondary/10 text-secondary"><LuUtensils className="size-4" /></span>
                  <div>
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.category?.name ?? 'Uncategorized'}</p>
                  </div>
                </div>
                {item.isVegetarian && <span title="Vegetarian" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><LuLeaf className="size-3.5" /></span>}
              </div>
              {item.description && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold">KES {Number(item.price).toLocaleString()}</span>
                {!item.isAvailable && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Unavailable</span>}
                {item.recipe && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">Recipe: {item.recipe.name}</span>}
                {item.product && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">Product: {item.product.name}</span>}
              </div>
              {item.addons.length > 0 && <p className="mt-2 truncate text-xs text-muted-foreground">Add-ons: {item.addons.map((a) => a.name).join(' · ')}</p>}
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.locations.length > 0 ? `Only at: ${item.locations.map((l) => l.name).join(', ')}` : 'Available everywhere'}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><LuPencil className="size-3.5" /> Edit</button>
                <button onClick={() => void deleteItem(item)} className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"><LuTrash2 className="size-3.5" /> Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveItem} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit menu item' : 'New menu item'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add a menu item'}</h2>
            </div>

            <FieldGroup title="Overview">
              <Field label="Name" required className="sm:col-span-2"><input required placeholder="e.g. Grilled Chicken Skewers" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Category" required>
                <select required className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{'— '.repeat(c.level - 1)}{c.name}</option>)}
                </select>
              </Field>
              <Field label="Price (KES)" required><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></Field>
              <Field label="Description" className="sm:col-span-2"><input placeholder="Short description shown on the menu" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
              <Field label="Photo URL" className="sm:col-span-2"><input placeholder="https://…" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Classification">
              <Field label="Temperature">
                <select className="input" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value as ItemForm['temperature'] })}>
                  <option value="HOT">Hot</option>
                  <option value="COLD">Cold</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <div className="flex items-end gap-4">
                <label className="flex flex-1 items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                  Vegetarian
                  <input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })} className="size-4 accent-secondary" />
                </label>
                <label className="flex flex-1 items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                  Available
                  <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="size-4 accent-secondary" />
                </label>
              </div>
            </FieldGroup>

            <FieldGroup title="How it's fulfilled">
              <Field label="Recipe (made in kitchen)">
                <select className="input" value={form.recipeId} onChange={(e) => setForm({ ...form, recipeId: e.target.value, productId: e.target.value ? '' : form.productId })}>
                  <option value="">None</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Product (sold direct, e.g. bottled drink)">
                <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, recipeId: e.target.value ? '' : form.recipeId })}>
                  <option value="">None</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </FieldGroup>

            <FieldGroup title="Add-ons">
              <div className="sm:col-span-2">
                {addons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No add-ons yet — create some in the Addons tab.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {addons.map((a) => (
                      <label key={a.id} className="flex items-center justify-between rounded-sm border bg-background px-3 py-2 text-sm">
                        <span>{a.name} <span className="text-muted-foreground">(+KES {Number(a.price).toLocaleString()})</span></span>
                        <input type="checkbox" checked={form.addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} className="size-4 accent-secondary" />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FieldGroup>

            <FieldGroup title="Locations">
              <div className="sm:col-span-2">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No locations set up — this item is sellable everywhere by default. Add locations under System → Business Information to scope items to specific selling points.</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-muted-foreground">Leave all unchecked to make this item available everywhere (the default).</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {locations.map((l) => (
                        <label key={l.id} className="flex items-center justify-between rounded-sm border bg-background px-3 py-2 text-sm">
                          <span>{l.name}{l.type ? <span className="text-muted-foreground"> ({l.type})</span> : null}</span>
                          <input type="checkbox" checked={form.locationIds.includes(l.id)} onChange={() => toggleLocation(l.id)} className="size-4 accent-secondary" />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </FieldGroup>

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create menu item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function AddonsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<AddonForm>(emptyAddonForm)
  const [editing, setEditing] = useState<Addon | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api<{ addons: Addon[] }>('/menu/addons')
      setAddons(response.addons)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load add-ons'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyAddonForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(addon: Addon) {
    setEditing(addon)
    setForm({ name: addon.name, price: addon.price, isActive: addon.isActive })
    setError('')
    setShowForm(true)
  }

  async function saveAddon(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api(editing ? `/menu/addons/${editing.id}` : '/menu/addons', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) })
      setNotice(editing ? 'Add-on updated.' : 'Add-on created.')
      toast.success(editing ? 'Add-on updated.' : 'Add-on created.')
      setShowForm(false)
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save add-on'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAddon(addon: Addon) {
    if (!window.confirm(`Delete "${addon.name}"?`)) return
    setError('')
    setNotice('')
    try {
      await api(`/menu/addons/${addon.id}`, { method: 'DELETE' })
      setNotice('Add-on deleted.')
      toast.success('Add-on deleted.')
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not delete add-on'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15">
          <LuPlus /> New add-on
        </button>
      </div>

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

      {loading ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading add-ons…</div>
      ) : addons.length === 0 ? (
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No add-ons yet. Add extras like "Extra cheese" or "Oat milk".</div>
      ) : (
        <section className="mt-7 overflow-hidden rounded-sm border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Add-on</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon.id} className="border-t transition hover:bg-muted/30">
                  <td className="px-5 py-4 font-semibold">{addon.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">KES {Number(addon.price).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', addon.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{addon.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(addon)} title="Edit add-on" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil /></button>
                      <button onClick={() => void deleteAddon(addon)} title="Delete add-on" className="rounded-sm p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveAddon} className="w-full max-w-md rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit add-on' : 'New add-on'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add an extra'}</h2>
            </div>
            <div className="mt-6 space-y-4">
              <Field label="Name" required><input required placeholder="e.g. Extra cheese" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Price (KES)" required><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></Field>
              <label className="flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                Active
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create add-on'}
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
