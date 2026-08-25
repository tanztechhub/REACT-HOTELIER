import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuArrowRight, LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuSearch, LuTrash2, LuTruck, LuWarehouse } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Location = { id: string; name: string; type: string | null }
type StockByLocation = { locationId: string; locationName: string; quantity: string }
type Product = { id: string; name: string; unit: string; stockByLocation: StockByLocation[] }
type BatchItem = { productId: string; name: string; unit: string; quantity: string; maxAvailable: number }

export default function InventoryWorkspace() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [search, setSearch] = useState('')
  const [batch, setBatch] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [productsRes, locationsRes] = await Promise.all([
        api<{ products: Product[] }>('/products'),
        api<{ locations: Location[] }>('/locations'),
      ])
      setProducts(productsRes.products)
      setLocations(locationsRes.locations)
      setFromLocationId((current) => current || locationsRes.locations.find((l) => l.type === 'STORE')?.id || '')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load distribution data'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const availableAt = useMemo(() => {
    return (product: Product) => Number(product.stockByLocation.find((s) => s.locationId === fromLocationId)?.quantity ?? 0)
  }, [fromLocationId])

  const visibleProducts = products.filter((p) => availableAt(p) > 0 && (!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())))

  function setBatchQuantity(product: Product, quantity: string) {
    setBatch((current) => {
      const existing = current.find((b) => b.productId === product.id)
      if (!quantity || Number(quantity) <= 0) return current.filter((b) => b.productId !== product.id)
      const item: BatchItem = { productId: product.id, name: product.name, unit: product.unit, quantity, maxAvailable: availableAt(product) }
      return existing ? current.map((b) => b.productId === product.id ? item : b) : [...current, item]
    })
  }

  function removeFromBatch(productId: string) {
    setBatch((current) => current.filter((b) => b.productId !== productId))
  }

  async function sendDistribution() {
    if (!fromLocationId || !toLocationId || batch.length === 0) return
    setSending(true)
    setError('')
    try {
      await api('/products/distribute', {
        method: 'POST',
        body: JSON.stringify({ fromLocationId, toLocationId, items: batch.map((b) => ({ productId: b.productId, quantity: Number(b.quantity) })) }),
      })
      setNotice(`Distributed ${batch.length} item${batch.length === 1 ? '' : 's'} to ${locations.find((l) => l.id === toLocationId)?.name ?? 'destination'}.`)
      toast.success('Stock distributed.')
      setBatch([])
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not distribute stock'
      setError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">Inventory</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-semibold"><LuTruck className="text-secondary" /> Distribute Stock</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Move stock from the warehouse out to a selling point — Reception, the Gym, the Spa, wherever it's needed.</p>
      </header>

      {error && <Msg error text={error} />}
      {notice && <Msg text={notice} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          From
          <select className="input mt-1.5" value={fromLocationId} onChange={(e) => { setFromLocationId(e.target.value); setBatch([]) }}>
            <option value="">Select source location</option>
            {locations.map((l) => <option key={l.id} value={l.id} disabled={l.id === toLocationId}>{l.name}{l.type === 'STORE' ? ' (warehouse)' : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          To
          <select className="input mt-1.5" value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
            <option value="">Select destination location</option>
            {locations.map((l) => <option key={l.id} value={l.id} disabled={l.id === fromLocationId}>{l.name}</option>)}
          </select>
        </label>
      </div>

      {fromLocationId && toLocationId && (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <label className="relative block">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products at the source location…" className="w-full rounded-sm border bg-card py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <div className="mt-4 overflow-hidden rounded-sm border bg-card shadow-sm">
                {loading ? (
                  <div className="p-16 text-center text-sm text-muted-foreground"><LuLoaderCircle className="mx-auto animate-spin" /></div>
                ) : visibleProducts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    <LuWarehouse className="mx-auto mb-2 size-6" />
                    No products with stock at this source location.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-primary text-xs uppercase text-primary-foreground">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">On hand</th>
                        <th className="px-4 py-3">Send</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProducts.map((product) => {
                        const max = availableAt(product)
                        const staged = batch.find((b) => b.productId === product.id)
                        return (
                          <tr key={product.id} className="border-t">
                            <td className="px-4 py-3 font-medium">{product.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{max.toLocaleString()} {product.unit}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number" min="0" max={max} step="0.001"
                                value={staged?.quantity ?? ''}
                                onChange={(e) => setBatchQuantity(product, e.target.value)}
                                placeholder="0"
                                className="w-24 rounded-sm border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-sm border bg-card p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {locations.find((l) => l.id === fromLocationId)?.name} <LuArrowRight className="size-3.5 text-muted-foreground" /> {locations.find((l) => l.id === toLocationId)?.name}
              </p>
              <div className="mt-3 space-y-2">
                {batch.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items staged yet — enter a quantity next to a product.</p>
                ) : batch.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between rounded-sm bg-muted/40 px-3 py-2 text-sm">
                    <span className="truncate">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.quantity} {item.unit}</span>
                      <button onClick={() => removeFromBatch(item.productId)} className="text-muted-foreground hover:text-destructive"><LuTrash2 className="size-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                disabled={batch.length === 0 || sending}
                onClick={() => void sendDistribution()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {sending && <LuLoaderCircle className="animate-spin" />} Send {batch.length > 0 ? `${batch.length} item${batch.length === 1 ? '' : 's'}` : ''}
              </button>
            </aside>
          </div>
        </>
      )}

      {(!fromLocationId || !toLocationId) && !loading && (
        <div className="mt-7 flex min-h-64 flex-col items-center justify-center gap-3 rounded-sm border bg-card p-16 text-center shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-sm bg-secondary/10 text-secondary">
            <LuWarehouse className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">Choose a source and destination location to begin.</p>
        </div>
      )}
    </div>
  )
}

function Msg({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={cn('mt-5 flex items-center gap-2 rounded-sm p-3 text-sm', error ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
      {error ? <LuCircleAlert /> : <LuCircleCheck />}
      {text}
    </div>
  )
}
