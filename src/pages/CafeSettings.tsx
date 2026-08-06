import { useState } from 'react'
import type { FormEvent } from 'react'
import { LuCircleCheck, LuInfo, LuPackagePlus, LuStore, LuWandSparkles } from 'react-icons/lu'

type Store = { name: string; code: string }
type InventoryItem = { name: string; sku: string; store: string; quantity: string; unit: string; reorderLevel: string }

const starterStores: Store[] = [
  { name: 'Main Café Store', code: 'CAFE-MAIN' },
]

export default function CafeSettings() {
  const [cafeName, setCafeName] = useState('TANZ Café')
  const [currency, setCurrency] = useState('KES')
  const [inventoryEnabled, setInventoryEnabled] = useState(true)
  const [lowStockAlerts, setLowStockAlerts] = useState(true)
  const [stores, setStores] = useState<Store[]>(starterStores)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [saved, setSaved] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemSku, setItemSku] = useState('')
  const [itemQuantity, setItemQuantity] = useState('0')
  const [itemReorderLevel, setItemReorderLevel] = useState('0')

  function saveSettings(event: FormEvent) {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  function addStore(event: FormEvent) {
    event.preventDefault()
    const name = storeName.trim()
    if (!name) return
    setStores((current) => [...current, { name, code: name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 20) }])
    setStoreName('')
  }

  function addItem(event: FormEvent) {
    event.preventDefault()
    if (!itemName.trim() || !itemSku.trim() || stores.length === 0) return
    setItems((current) => [...current, {
      name: itemName.trim(), sku: itemSku.trim().toUpperCase(), store: stores[0].name,
      quantity: itemQuantity, unit: 'each', reorderLevel: itemReorderLevel,
    }])
    setItemName('')
    setItemSku('')
    setItemQuantity('0')
    setItemReorderLevel('0')
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Café settings</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">Set up your POS and inventory</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Configure where stock lives, what you sell, and when your team should be notified. These settings keep every sale and stock count connected.</p>
        </div>
        {saved && <span className="inline-flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success"><LuCircleCheck /> Settings saved</span>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <form onSubmit={saveSettings} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><LuWandSparkles className="size-4" /></span>
              <div><h2 className="font-semibold text-foreground">Café profile</h2><p className="mt-0.5 text-sm text-muted-foreground">This name and currency appear in POS sales and inventory reports.</p></div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">Café name<input value={cafeName} onChange={(e) => setCafeName(e.target.value)} className="mt-1.5 block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="text-sm font-medium text-foreground">Currency<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1.5 block w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"><option>KES</option><option>USD</option><option>TZS</option><option>EUR</option></select></label>
            </div>
            <div className="mt-5 space-y-3 rounded-lg bg-muted/60 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-medium">Track inventory with every sale</span><span className="block text-xs text-muted-foreground">Keep POS products linked to stock in a store.</span></span><input type="checkbox" checked={inventoryEnabled} onChange={(e) => setInventoryEnabled(e.target.checked)} className="size-4 accent-secondary" /></label>
              <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-medium">Low-stock alerts</span><span className="block text-xs text-muted-foreground">Flag items that reach their reorder level.</span></span><input type="checkbox" checked={lowStockAlerts} onChange={(e) => setLowStockAlerts(e.target.checked)} className="size-4 accent-secondary" /></label>
            </div>
            <button className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save café settings</button>
          </form>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><LuStore className="size-4" /></span><div><h2 className="font-semibold text-foreground">Stores</h2><p className="mt-0.5 text-sm text-muted-foreground">A store is the physical place you count stock, such as the café counter, kitchen, or central store.</p></div></div>
            <div className="mt-5 space-y-2">{stores.map((store) => <div key={store.code} className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"><span className="text-sm font-medium">{store.name}</span><span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{store.code}</span></div>)}</div>
            <form onSubmit={addStore} className="mt-4 flex gap-2"><input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Kitchen store" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Add store</button></form>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-warning/15 text-warning"><LuPackagePlus className="size-4" /></span><div><h2 className="font-semibold text-foreground">Opening inventory</h2><p className="mt-0.5 text-sm text-muted-foreground">Add the ingredients and products you want the POS to monitor first.</p></div></div>
            <form onSubmit={addItem} className="mt-5 grid gap-3 sm:grid-cols-2"><input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><input value={itemSku} onChange={(e) => setItemSku(e.target.value)} placeholder="SKU / product code" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><input type="number" min="0" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} placeholder="Opening quantity" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><input type="number" min="0" value={itemReorderLevel} onChange={(e) => setItemReorderLevel(e.target.value)} placeholder="Alert at quantity" className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button className="sm:col-span-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">Add inventory item</button></form>
            {items.length > 0 && <div className="mt-5 overflow-hidden rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Store</th><th className="px-3 py-2">On hand</th><th className="px-3 py-2">Alert at</th></tr></thead><tbody>{items.map((item) => <tr key={item.sku} className="border-t"><td className="px-3 py-2"><span className="block font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.sku}</span></td><td className="px-3 py-2">{item.store}</td><td className="px-3 py-2">{item.quantity} {item.unit}</td><td className="px-3 py-2">{item.reorderLevel}</td></tr>)}</tbody></table></div>}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold"><LuInfo className="text-secondary" /> How this works</div><ol className="mt-4 space-y-4 text-sm text-muted-foreground"><li><span className="mr-2 font-semibold text-foreground">1.</span>Create each place that holds stock.</li><li><span className="mr-2 font-semibold text-foreground">2.</span>Add items and the lowest safe quantity.</li><li><span className="mr-2 font-semibold text-foreground">3.</span>Link POS menu products to their ingredients so each sale reduces stock.</li></ol><div className="mt-5 rounded-lg bg-secondary/10 p-3 text-xs leading-5 text-secondary">Need a quick answer? Ask: “Where should I add milk stock?” Use <strong>Stores</strong> for the location and <strong>Opening inventory</strong> for the quantity.</div></aside>
      </div>
    </div>
  )
}
