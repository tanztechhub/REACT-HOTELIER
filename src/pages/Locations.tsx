import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { LuCircleAlert, LuLoaderCircle, LuMapPin, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const LOCATION_TYPES = ['RECEPTION', 'RESTAURANT', 'CAFE', 'BAKERY', 'BAR', 'GYM', 'SPA', 'STORE', 'SHOP', 'HOUSEKEEPING'] as const
type LocationType = (typeof LOCATION_TYPES)[number]
const typeLabels: Record<LocationType, string> = {
  RECEPTION: 'Reception', RESTAURANT: 'Restaurant', CAFE: 'Cafe', BAKERY: 'Bakery', BAR: 'Bar', GYM: 'Gym', SPA: 'Spa', STORE: 'Store', SHOP: 'Shop', HOUSEKEEPING: 'Housekeeping',
}

const SELLING_PERMISSIONS = [
  { key: 'canSellRooms', label: 'Can Sell Rooms', description: 'Reception & room bookings' },
  { key: 'canSellMenu', label: 'Can Sell Menu', description: 'Food, drinks, and add-ons' },
  { key: 'canSellServices', label: 'Can Sell Services', description: 'Spa, gym, and other services' },
  { key: 'canSellProducts', label: 'Can Sell Products', description: 'Retail store items' },
] as const

type Employee = { id: string; firstName: string; lastName: string }
type LocationRow = {
  id: string
  name: string
  type: LocationType | null
  description: string | null
  address: string | null
  managerId: string | null
  manager: Employee | null
  primaryPhone: string | null
  secondaryPhone: string | null
  email: string | null
  openingTime: string | null
  closingTime: string | null
  isActive: boolean
  canSellRooms: boolean
  canSellMenu: boolean
  canSellServices: boolean
  canSellProducts: boolean
  servesDirectly: boolean
  _count: { menuItems: number; employees: number }
}
type LocationForm = {
  name: string
  type: LocationType | ''
  description: string
  address: string
  managerId: string
  primaryPhone: string
  secondaryPhone: string
  email: string
  openingTime: string
  closingTime: string
  isActive: boolean
  canSellRooms: boolean
  canSellMenu: boolean
  canSellServices: boolean
  canSellProducts: boolean
  servesDirectly: boolean
}
const emptyLocationForm: LocationForm = {
  name: '', type: '', description: '', address: '', managerId: '',
  primaryPhone: '', secondaryPhone: '', email: '', openingTime: '', closingTime: '',
  isActive: true,
  canSellRooms: true, canSellMenu: true, canSellServices: true, canSellProducts: true,
  servesDirectly: false,
}

export default function Locations() {
  const toast = useToast()
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<LocationForm>(emptyLocationForm)
  const [editing, setEditing] = useState<LocationRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api<{ locations: LocationRow[] }>('/locations')
      setLocations(response.locations)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load locations'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    api<{ employees: Employee[] }>('/employees')
      .then((response) => setEmployees(response.employees))
      .catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Could not load employees'))
  }, [toast])

  function openCreate() {
    setEditing(null)
    setForm(emptyLocationForm)
    setShowForm(true)
  }

  function openEdit(location: LocationRow) {
    setEditing(location)
    setForm({
      name: location.name,
      type: location.type ?? '',
      description: location.description ?? '',
      address: location.address ?? '',
      managerId: location.managerId ?? '',
      primaryPhone: location.primaryPhone ?? '',
      secondaryPhone: location.secondaryPhone ?? '',
      email: location.email ?? '',
      openingTime: location.openingTime ?? '',
      closingTime: location.closingTime ?? '',
      isActive: location.isActive,
      canSellRooms: location.canSellRooms,
      canSellMenu: location.canSellMenu,
      canSellServices: location.canSellServices,
      canSellProducts: location.canSellProducts,
      servesDirectly: location.servesDirectly,
    })
    setShowForm(true)
  }

  async function saveLocation(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await api(editing ? `/locations/${editing.id}` : '/locations', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) })
      toast.success(editing ? 'Location updated.' : 'Location created.')
      setShowForm(false)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save location')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLocation(location: LocationRow) {
    if (!window.confirm(`Delete "${location.name}"?`)) return
    try {
      await api(`/locations/${location.id}`, { method: 'DELETE' })
      toast.success('Location deleted.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete location')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">System</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Locations</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Physical selling points across the property. Menu items and staff can optionally be scoped to one, so the POS only ever shows what's actually sellable there.
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15">
          <LuPlus /> Add location
        </button>
      </header>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-7 flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading locations…</div>
      ) : locations.length === 0 ? (
        <div className="mt-7 min-h-64 rounded-sm border bg-card p-16 text-center text-sm text-muted-foreground shadow-sm">No locations yet. If you never add one, everything behaves as a single point of sale.</div>
      ) : (
        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <article key={location.id} className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-sm bg-secondary/10 text-secondary"><LuMapPin className="size-4" /></span>
                <span className={cn('rounded-sm px-2.5 py-1 text-xs font-semibold', location.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{location.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <h2 className="mt-4 font-semibold">{location.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{[location.type ? typeLabels[location.type] : null, location.address].filter(Boolean).join(' · ') || 'No details set'}</p>
              {location.manager && <p className="mt-1 text-xs text-muted-foreground">Manager: {location.manager.firstName} {location.manager.lastName}</p>}
              {(location.openingTime || location.closingTime) && <p className="mt-1 text-xs text-muted-foreground">Hours: {location.openingTime ?? '—'} – {location.closingTime ?? '—'}</p>}
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <span>{location._count.menuItems} menu item{location._count.menuItems === 1 ? '' : 's'}</span>
                <span>{location._count.employees} staff</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(location)} className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><LuPencil className="size-3.5" /> Edit</button>
                <button onClick={() => void deleteLocation(location)} className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"><LuTrash2 className="size-3.5" /> Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <form onSubmit={saveLocation} className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit location' : 'New location'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add a location'}</h2>
            </div>

            <FieldGroup title="Basics">
              <Field label="Name" required className="sm:col-span-2"><input required placeholder="e.g. Poolside Bar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
              <Field label="Type" required>
                <select required className="input" value={form.type} onChange={(e) => {
                  const type = e.target.value as LocationType | ''
                  // A warehouse or the internal Housekeeping supply point
                  // doesn't run its own POS — SHOP is a genuine customer-
                  // facing retail point, so it keeps the normal defaults.
                  const isWarehouse = type === 'STORE' || type === 'HOUSEKEEPING'
                  // Just a starting point — the owner can flip this per
                  // location below regardless of type.
                  const servesDirectly = type === 'BAR' || type === 'BAKERY' || type === 'CAFE'
                  setForm({ ...form, type, servesDirectly, ...(isWarehouse ? { canSellRooms: false, canSellMenu: false, canSellServices: false, canSellProducts: false } : {}) })
                }}>
                  <option value="" disabled>Select type</option>
                  {LOCATION_TYPES.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
                </select>
              </Field>
              <Field label="Manager">
                <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">No manager assigned</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </Field>
              <Field label="Description" className="sm:col-span-2"><input placeholder="Short note about this location" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
              <Field label="Address" className="sm:col-span-2"><input placeholder="e.g. Ground floor, near the pool" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Contact">
              <Field label="Primary Phone"><input type="tel" placeholder="e.g. 0712 345 678" value={form.primaryPhone} onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })} className="input" /></Field>
              <Field label="Secondary Phone"><input type="tel" placeholder="e.g. 0733 987 654" value={form.secondaryPhone} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} className="input" /></Field>
              <Field label="Email" className="sm:col-span-2"><input type="email" placeholder="e.g. poolside@hotel.co.ke" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <FieldGroup title="Hours">
              <Field label="Opening Time"><input type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} className="input" /></Field>
              <Field label="Closing Time"><input type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} className="input" /></Field>
            </FieldGroup>

            <div className="mt-6 border-t pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selling Permissions</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SELLING_PERMISSIONS.map((perm) => (
                  <label key={perm.key} className="flex cursor-pointer items-start gap-2.5 rounded-sm border bg-muted/40 p-3">
                    <input
                      type="checkbox"
                      checked={form[perm.key]}
                      onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                      className="mt-0.5 size-4 accent-secondary"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{perm.label}</span>
                      <span className="block text-xs text-muted-foreground">{perm.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {form.canSellMenu && (
              <div className="mt-6 border-t pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Handling</p>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-sm border bg-muted/40 p-3">
                  <input
                    type="checkbox"
                    checked={form.servesDirectly}
                    onChange={(e) => setForm({ ...form, servesDirectly: e.target.checked })}
                    className="mt-0.5 size-4 accent-secondary"
                  />
                  <span>
                    <span className="block text-sm font-semibold">Serves food directly</span>
                    <span className="block text-xs text-muted-foreground">No Kitchen ticket — staff hand the item over on the spot instead of sending it to prepare. Turn this off for a location that needs cook/prep time tracked.</span>
                  </span>
                </label>
              </div>
            )}

            <label className="mt-6 flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
              Active
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" />
            </label>

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create location'}
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
    <label className={cn('block text-sm font-medium', className)}>
      {label}
      {required && <span className="text-destructive"> *</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
