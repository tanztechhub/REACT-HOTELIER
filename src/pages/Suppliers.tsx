import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  LuCircleAlert,
  LuCircleCheck,
  LuLoaderCircle,
  LuMail,
  LuPencil,
  LuPhone,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuTruck,
} from 'react-icons/lu'
import { api, hasApiTenant } from '@/lib/api'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import StatCard from '@/components/ui/StatCard'

type Supplier = {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  taxPin: string | null
  paymentTerms: string | null
  notes: string | null
  balance: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByEmployee: { id: string; firstName: string; lastName: string } | null
  updatedByEmployee: { id: string; firstName: string; lastName: string } | null
}
type Summary = { total: number; active: number; totalBalance: number }

const formatKes = (value: number) => `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`

type SupplierForm = {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  city: string
  taxPin: string
  paymentTerms: string
  notes: string
  balance: string
  isActive: boolean
}
const emptyForm: SupplierForm = {
  name: '', contactPerson: '', phone: '', email: '', address: '', city: '', taxPin: '', paymentTerms: '', notes: '', balance: '', isActive: true,
}

function SetupMessage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">Workspace not resolved yet.</p>
    </div>
  )
}

export default function Suppliers() {
  const toast = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, totalBalance: 0 })
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (activeFilter !== 'all') query.set('active', activeFilter)
      const response = await api<{ suppliers: Supplier[]; summary: Summary }>(`/suppliers${query.size ? `?${query}` : ''}`)
      setSuppliers(response.suppliers)
      setSummary(response.summary)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load suppliers'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [search, activeFilter, toast])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer) }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      city: supplier.city ?? '',
      taxPin: supplier.taxPin ?? '',
      paymentTerms: supplier.paymentTerms ?? '',
      notes: supplier.notes ?? '',
      balance: supplier.balance ?? '',
      isActive: supplier.isActive,
    })
    setError('')
    setShowForm(true)
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        taxPin: form.taxPin.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
        // Opening balance is set once, at creation only.
        ...(editing ? {} : { balance: form.balance.trim() ? Number(form.balance) : undefined }),
      }
      await api(editing ? `/suppliers/${editing.id}` : '/suppliers', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      setNotice(editing ? 'Supplier updated.' : 'Supplier added.')
      toast.success(editing ? 'Supplier updated.' : 'Supplier added.')
      setShowForm(false)
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save supplier'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSupplier(supplier: Supplier) {
    if (!window.confirm(`Permanently delete ${supplier.name}?`)) return
    setError('')
    setNotice('')
    try {
      await api(`/suppliers/${supplier.id}`, { method: 'DELETE' })
      setNotice('Supplier deleted.')
      toast.success('Supplier deleted.')
      await load()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not delete supplier'
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
          <h1 className="mt-1 font-display text-3xl font-semibold">Suppliers</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vendors the property buys stock from — contacts, tax details, and payment terms in one place.</p>
        </div>
        <Button onClick={openCreate}>
          <LuPlus /> Add supplier
        </Button>
      </header>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        {([
          ['Total suppliers', summary.total],
          ['Active', summary.active],
          ['Balance owed', formatKes(summary.totalBalance)],
        ] as const).map(([label, value], i) => (
          <StatCard key={label} index={i} label={label} value={value} icon={<LuTruck />} />
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, contact, phone or email…" className="w-full rounded-sm border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading suppliers…</div>
        ) : suppliers.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">No suppliers match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Terms</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t transition hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{supplier.name}</p>
                      {supplier.contactPerson && <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {supplier.phone && <p className="flex items-center gap-1.5"><LuPhone className="size-3" /> {supplier.phone}</p>}
                        {supplier.email && <p className="flex items-center gap-1.5"><LuMail className="size-3" /> {supplier.email}</p>}
                        {!supplier.phone && !supplier.email && '—'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{supplier.city ?? '—'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{supplier.paymentTerms ?? '—'}</td>
                    <td className={cn('px-5 py-4 text-right font-semibold tabular-nums', Number(supplier.balance) > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {formatKes(Number(supplier.balance))}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        supplier.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                      )}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(supplier)} title="Edit supplier" className="rounded-sm p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil /></button>
                        <button onClick={() => void deleteSupplier(supplier)} title="Delete supplier" className="rounded-sm p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveSupplier} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit supplier' : 'New supplier'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add a supplier'}</h2>
            </div>

            <FieldGroup title="Identity">
              <Field label="Name" required className="sm:col-span-2"><input required placeholder="e.g. Nairobi Bottlers Ltd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Contact Person"><input placeholder="e.g. Jane Mwangi" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="input" /></Field>
              <Field label="KRA / Tax PIN"><input placeholder="e.g. P051234567X" value={form.taxPin} onChange={(e) => setForm({ ...form, taxPin: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Contact">
              <Field label="Phone"><input placeholder="e.g. 0722 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
              <Field label="Email"><input type="email" placeholder="e.g. sales@vendor.co.ke" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
              <Field label="Address" className="sm:col-span-2"><input placeholder="e.g. Industrial Area, Road C" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field>
              <Field label="City / Town"><input placeholder="e.g. Nairobi" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Terms">
              <Field label="Payment Terms" className="sm:col-span-2"><input placeholder="e.g. Net 30 days, cash on delivery" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="input" /></Field>
              {editing ? (
                <Field label="Current Balance (KES)" className="sm:col-span-2">
                  <input disabled className="input font-semibold opacity-70" value={formatKes(Number(editing.balance))} />
                  <span className="mt-1 block text-xs text-muted-foreground">Maintained from purchases and payments once those are wired up.</span>
                </Field>
              ) : (
                <Field label="Opening Balance (KES)" className="sm:col-span-2">
                  <input type="number" step="0.01" placeholder="0.00 — what's already owed to this supplier" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="input" />
                </Field>
              )}
              <Field label="Notes" className="sm:col-span-2">
                <textarea rows={2} placeholder="Anything worth remembering about this supplier" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
              </Field>
            </FieldGroup>

            <label className="mt-6 flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
              Active
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" />
            </label>

            {editing && (editing.createdByEmployee || editing.updatedByEmployee) && (
              <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                {editing.createdByEmployee && <>Created by {editing.createdByEmployee.firstName} {editing.createdByEmployee.lastName} on {new Date(editing.createdAt).toLocaleDateString()}</>}
                {editing.createdByEmployee && editing.updatedByEmployee && ' · '}
                {editing.updatedByEmployee && <>Last updated by {editing.updatedByEmployee.firstName} {editing.updatedByEmployee.lastName} on {new Date(editing.updatedAt).toLocaleDateString()}</>}
              </p>
            )}

            {error && (
              <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                <LuCircleAlert />
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Add supplier'}
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
