import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LuUserRound, LuX } from 'react-icons/lu'
import { api } from '@/lib/api'

export type PickedCustomer = { id: string; firstName: string; lastName: string | null; phone: string }

/** Optional "who is this sale for" — search an existing Customer or quick-add
 * one on the spot, mirroring Reception's own quick-add guest form (just
 * first name + phone). Never blocks a sale: a quick anonymous cash sale
 * doesn't have to stop and create a customer record. */
export default function CustomerPicker({ customer, onChange }: {
  customer: PickedCustomer | null
  onChange: (customer: PickedCustomer | null) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickedCustomer[]>([])
  const [open, setOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || quickAdd) return
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      api<{ customers: PickedCustomer[] }>(`/customers${query.size ? `?${query}` : ''}`).then((r) => setResults(r.customers.slice(0, 8))).catch(() => setResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, quickAdd, search])

  async function saveQuickAdd(event: FormEvent) {
    event.preventDefault()
    if (!quickAddName.trim() || !quickAddPhone.trim()) return
    setSaving(true)
    setError('')
    try {
      const response = await api<{ customer: PickedCustomer }>('/customers', { method: 'POST', body: JSON.stringify({ firstName: quickAddName, phone: quickAddPhone }) })
      onChange(response.customer)
      setOpen(false)
      setQuickAdd(false)
      setQuickAddName('')
      setQuickAddPhone('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add customer')
    } finally {
      setSaving(false)
    }
  }

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-sm border bg-secondary/5 p-2.5 text-sm">
        <span className="flex items-center gap-1.5"><LuUserRound className="size-3.5 text-muted-foreground" /> {customer.firstName} {customer.lastName ?? ''} · {customer.phone}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-secondary hover:underline">Change</button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 rounded-sm border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40">
        <LuUserRound className="size-3.5" /> Attach a customer (optional)
      </button>
    )
  }

  return (
    <div className="rounded-sm border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{quickAdd ? 'New customer' : 'Find customer'}</p>
        <button type="button" onClick={() => { setOpen(false); setQuickAdd(false) }} className="text-muted-foreground hover:text-foreground"><LuX className="size-3.5" /></button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {quickAdd ? (
        <div className="mt-2 space-y-2">
          <input placeholder="Full name" className="input" value={quickAddName} onChange={(e) => setQuickAddName(e.target.value)} />
          <input placeholder="Phone" className="input" value={quickAddPhone} onChange={(e) => setQuickAddPhone(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setQuickAdd(false)} className="flex-1 rounded-sm border py-1.5 text-xs font-semibold hover:bg-muted">Back to search</button>
            <button type="button" onClick={saveQuickAdd} disabled={saving || !quickAddName.trim() || !quickAddPhone.trim()} className="flex-1 rounded-sm bg-secondary py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-60">Add</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <input autoFocus placeholder="Search name or phone…" className="input" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c); setOpen(false) }} className="block w-full rounded-sm border p-2 text-left text-xs hover:bg-muted/40">
                {c.firstName} {c.lastName ?? ''} <span className="text-muted-foreground">· {c.phone}</span>
              </button>
            ))}
            {results.length === 0 && <p className="p-1.5 text-center text-xs text-muted-foreground">No matches.</p>}
          </div>
          <button type="button" onClick={() => setQuickAdd(true)} className="w-full rounded-sm border border-dashed py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/5">+ Add new customer</button>
        </div>
      )}
    </div>
  )
}
