import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LuArrowDownToLine, LuArrowUpFromLine, LuPackage, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import { api, hasApiTenant } from '@/lib/api'

type Store = { id: string; name: string; code: string }
type Product = { id: string; name: string; sku: string; unit: string; quantity: string | number; reorderLevel: string | number; isActive: boolean; store: Store }
type Movement = { id: string; type: 'RECEIPT' | 'DISPATCH' | 'ADJUSTMENT'; quantity: string | number; note: string | null; occurredAt: string; store: Store }
type ProductForm = { storeId: string; name: string; sku: string; unit: string; quantity: string; reorderLevel: string; isActive: boolean }

const emptyForm: ProductForm = { storeId: '', name: '', sku: '', unit: 'each', quantity: '0', reorderLevel: '0', isActive: true }
const units = ['each', 'kg', 'g', 'litres', 'ml', 'pack', 'box']

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [movementType, setMovementType] = useState<Movement['type']>('RECEIPT')
  const [movementQuantity, setMovementQuantity] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!hasApiTenant()) { setLoading(false); return }
    try {
      setLoading(true)
      const [productsResponse, storesResponse] = await Promise.all([api<{ products: Product[] }>('/products/'), api<{ stores: Store[] }>('/products/stores')])
      setProducts(productsResponse.products)
      setStores(storesResponse.stores)
      setForm((current) => current.storeId ? current : { ...current, storeId: storesResponse.stores[0]?.id ?? '' })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load products') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  function resetForm() { setEditing(null); setForm({ ...emptyForm, storeId: stores[0]?.id ?? '' }) }
  function editProduct(product: Product) { setEditing(product); setForm({ storeId: product.store.id, name: product.name, sku: product.sku, unit: product.unit, quantity: String(product.quantity), reorderLevel: String(product.reorderLevel), isActive: product.isActive }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function saveProduct(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const body = { storeId: form.storeId, name: form.name, sku: form.sku, unit: form.unit, reorderLevel: Number(form.reorderLevel), isActive: form.isActive, ...(editing ? {} : { quantity: Number(form.quantity) }) }
      await api(editing ? `/products/${editing.id}` : '/products/', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      setNotice(editing ? 'Product updated.' : 'Product saved to inventory.')
      resetForm(); await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save product') }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return
    try { await api(`/products/${product.id}`, { method: 'DELETE' }); if (selected?.id === product.id) { setSelected(null); setMovements([]) }; setNotice('Product deleted.'); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete product') }
  }

  async function selectProduct(product: Product) {
    setSelected(product); setMovements([]); setError('')
    try { const response = await api<{ movements: Movement[] }>(`/products/${product.id}/movements`); setMovements(response.movements) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load movement history') }
  }

  async function saveMovement(event: FormEvent) {
    event.preventDefault(); if (!selected) return
    try { await api(`/products/${selected.id}/movements`, { method: 'POST', body: JSON.stringify({ type: movementType, quantity: Number(movementQuantity), note: movementNote || undefined }) }); setNotice('Stock movement recorded.'); setMovementQuantity(''); setMovementNote(''); await selectProduct(selected); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not record stock movement') }
  }

  if (!hasApiTenant()) return <SetupMessage />
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10"><header className="mb-7"><p className="text-sm font-medium text-secondary">Inventory</p><h1 className="mt-1 font-display text-2xl font-semibold">Products and ingredients</h1><p className="mt-1 text-sm text-muted-foreground">Create and manage the ingredients held in your stores. Use stock movements to record every receipt and dispatch.</p></header>{error && <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}{notice && <div className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>}<div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]"><form onSubmit={saveProduct} className="h-fit rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">{editing ? 'Edit product' : 'New product'}</h2>{editing && <button type="button" onClick={resetForm} className="text-sm text-secondary">Cancel</button>}</div><div className="mt-4 space-y-3"><Field label="Ingredient name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Fresh milk" /></Field><Field label="SKU"><input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} placeholder="e.g. MLK-001" /></Field><Field label="Store"><select required value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}><option value="">Select a store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Unit"><select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></Field><Field label="Reorder at"><input required min="0" type="number" step="0.001" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })} /></Field></div>{!editing && <Field label="Opening quantity"><input required min="0" type="number" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="accent-secondary" /> Active and available to recipes</label></div><button disabled={!stores.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"><LuPlus className="size-4" />{editing ? 'Save changes' : 'Save product'}</button>{!stores.length && <p className="mt-3 text-xs text-warning">Create an active store first.</p>}</form><section><div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Ingredient</th><th className="px-4 py-3">Store</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Reorder</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading products…</td></tr> : products.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No products yet. Create your first ingredient.</td></tr> : products.map((product) => { const low = Number(product.quantity) <= Number(product.reorderLevel); return <tr key={product.id} className={`border-t ${selected?.id === product.id ? 'bg-secondary/5' : ''}`}><td className="px-4 py-4"><button onClick={() => void selectProduct(product)} className="text-left"><span className="block font-medium">{product.name}</span><span className="font-mono text-xs text-muted-foreground">{product.sku}</span></button></td><td className="px-4 py-4">{product.store.name}</td><td className="px-4 py-4">{product.quantity} {product.unit}{low && <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">Low</span>}</td><td className="px-4 py-4">{product.reorderLevel} {product.unit}</td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => editProduct(product)} className="rounded border p-1.5 text-secondary" title="Edit"><LuPencil className="size-3.5" /></button><button onClick={() => removeProduct(product)} className="rounded border border-destructive/30 p-1.5 text-destructive" title="Delete"><LuTrash2 className="size-3.5" /></button></div></td></tr> })}</tbody></table></div>{selected && <section className="mt-6 grid gap-5 rounded-xl border bg-card p-5 shadow-sm lg:grid-cols-2"><div><h2 className="font-semibold">Record stock movement · {selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">Receipts increase stock; dispatches reduce it. All records are time-stamped.</p><form onSubmit={saveMovement} className="mt-4 grid gap-3 sm:grid-cols-2"><select value={movementType} onChange={(event) => setMovementType(event.target.value as Movement['type'])}><option value="RECEIPT">Receive stock</option><option value="DISPATCH">Dispatch stock</option><option value="ADJUSTMENT">Adjustment (+ or −)</option></select><input required type="number" step="0.001" value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} placeholder="Quantity" /><input className="sm:col-span-2" value={movementNote} onChange={(event) => setMovementNote(event.target.value)} placeholder="Note / supplier / reason" /><button className="sm:col-span-2 flex items-center justify-center gap-2 rounded-lg bg-secondary py-2 text-sm font-medium text-secondary-foreground">{movementType === 'DISPATCH' ? <LuArrowUpFromLine className="size-4" /> : <LuArrowDownToLine className="size-4" />}Record movement</button></form></div><div><h2 className="font-semibold">Movement history</h2><div className="mt-3 max-h-62 overflow-y-auto rounded-lg border">{movements.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No movements recorded.</p> : movements.map((movement) => <div key={movement.id} className="border-b p-3 last:border-0"><div className="flex justify-between"><span className={`text-sm font-medium ${movement.type === 'DISPATCH' ? 'text-warning' : 'text-success'}`}>{movement.type} · {movement.quantity} {selected.unit}</span><span className="text-xs text-muted-foreground">{new Date(movement.occurredAt).toLocaleString()}</span></div>{movement.note && <p className="mt-1 text-xs text-muted-foreground">{movement.note}</p>}</div>)}</div></div></section>}</section></div></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-foreground"><span>{label}</span><span className="mt-1 block [&_input]:block [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_select]:block [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm">{children}</span></label> }

function SetupMessage() { return <div className="mx-auto max-w-2xl px-6 py-12"><div className="rounded-xl border bg-card p-6 shadow-sm"><LuPackage className="size-8 text-secondary" /><h1 className="mt-4 text-xl font-semibold">Connect Products to your database</h1><p className="mt-2 text-sm text-muted-foreground">Run <code>npm run seed</code> inside NODE, then copy the displayed tenant ID into <code>REACT/.env</code> as <code>VITE_TENANT_ID</code>. Restart the React development server afterwards.</p></div></div> }
