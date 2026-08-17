import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuPackage, LuPencil, LuPlus, LuTrash2, LuWarehouse } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Store = { id: string; name: string; code: string; isActive: boolean; _count: { products: number } }
type StoreForm = { name: string; code: string; isActive: boolean }
const emptyForm: StoreForm = { name: '', code: '', isActive: true }

export default function InventoryWorkspace() {
  const toast = useToast()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<StoreForm>(emptyForm)
  const [editing, setEditing] = useState<Store | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api<{ stores: Store[] }>('/stores')
      setStores(response.stores)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load stores'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(store: Store) {
    setEditing(store)
    setForm({ name: store.name, code: store.code, isActive: store.isActive })
    setError('')
    setShowForm(true)
  }

  async function saveStore(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api(editing ? `/stores/${editing.id}` : '/stores', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) })
      setNotice(editing ? 'Store updated.' : 'Store created.')
      toast.success(editing ? 'Store updated.' : 'Store created.')
      setShowForm(false)
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save store'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteStore(store: Store) {
    if (!window.confirm(`Delete "${store.name}"?`)) return
    setError('')
    setNotice('')
    try {
      await api(`/stores/${store.id}`, { method: 'DELETE' })
      setNotice('Store deleted.')
      toast.success('Store deleted.')
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not delete store'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Inventory</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Store</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage the physical stock locations products are received into.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15">
          <LuPlus /> Add store
        </button>
      </header>

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
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading stores…</div>
      ) : stores.length === 0 ? (
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No stores yet. Add your first one to start receiving products.</div>
      ) : (
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <article key={store.id} className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-sm bg-secondary/10 text-secondary"><LuWarehouse className="size-4" /></span>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', store.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{store.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <h2 className="mt-4 font-semibold">{store.name}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{store.code}</p>
              <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <LuPackage className="size-4" /> {store._count.products} product{store._count.products === 1 ? '' : 's'}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(store)} className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><LuPencil className="size-3.5" /> Edit</button>
                <button onClick={() => void deleteStore(store)} className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"><LuTrash2 className="size-3.5" /> Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveStore} className="w-full max-w-md rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit store' : 'New store'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add a store'}</h2>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Name <span className="text-destructive">*</span>
                <span className="mt-1.5 block"><input required placeholder="e.g. Main Store" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></span>
              </label>
              <label className="block text-sm font-medium">Code <span className="text-destructive">*</span>
                <span className="mt-1.5 block"><input required placeholder="e.g. MAIN" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" /></span>
              </label>
              <label className="flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                Active
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create store'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
