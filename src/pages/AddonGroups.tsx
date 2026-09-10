import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuLoaderCircle,
  LuPencil,
  LuPlus,
  LuPower,
  LuSearch,
  LuTrash2,
} from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type SelectionType = 'SINGLE' | 'MULTIPLE'
type AddonGroup = {
  id: string
  name: string
  description: string | null
  selectionType: SelectionType
  minSelections: number
  maxSelections: number
  required: boolean
  isActive: boolean
  sortOrder: number
}
type Form = {
  name: string
  description: string
  selectionType: SelectionType
  minSelections: number
  maxSelections: number
  required: boolean
  isActive: boolean
}
const emptyForm: Form = { name: '', description: '', selectionType: 'SINGLE', minSelections: 1, maxSelections: 1, required: false, isActive: true }

function ruleSentence(g: Pick<AddonGroup, 'selectionType' | 'minSelections' | 'maxSelections' | 'required'>) {
  let core: string
  if (g.selectionType === 'SINGLE') {
    core = g.required ? 'Pick exactly 1' : 'Pick 1'
  } else if (g.minSelections === g.maxSelections) {
    core = `Pick exactly ${g.maxSelections}`
  } else if (g.minSelections === 0) {
    core = `Pick up to ${g.maxSelections}`
  } else {
    core = `Pick ${g.minSelections}–${g.maxSelections}`
  }
  return g.required ? `${core} · required` : core
}

export default function AddonGroups() {
  const toast = useToast()
  const [groups, setGroups] = useState<AddonGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Form>(emptyForm)
  const [editing, setEditing] = useState<AddonGroup | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api<{ groups: AddonGroup[] }>('/addon-groups')
      setGroups(r.groups)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load add-on groups'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups
  }, [groups, search])

  function openCreate() { setEditing(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(g: AddonGroup) {
    setEditing(g)
    setForm({ name: g.name, description: g.description ?? '', selectionType: g.selectionType, minSelections: g.minSelections, maxSelections: g.maxSelections, required: g.required, isActive: g.isActive })
    setShowForm(true)
  }

  // Keep the form internally consistent as the user toggles things.
  function updateForm(patch: Partial<Form>) {
    setForm((f) => {
      const next = { ...f, ...patch }
      if (next.selectionType === 'SINGLE') {
        next.maxSelections = 1
        next.minSelections = next.required ? 1 : Math.min(next.minSelections, 1)
      }
      if (next.required && next.minSelections < 1) next.minSelections = 1
      if (next.maxSelections < next.minSelections) next.maxSelections = next.minSelections
      return next
    })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        selectionType: form.selectionType,
        minSelections: form.minSelections,
        maxSelections: form.maxSelections,
        required: form.required,
        isActive: form.isActive,
      }
      await api(editing ? `/addon-groups/${editing.id}` : '/addon-groups', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      toast.success(editing ? 'Group updated.' : 'Group created.')
      setShowForm(false)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save group')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(g: AddonGroup) {
    setBusy(true)
    try {
      await api(`/addon-groups/${g.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !g.isActive }) })
      toast.success(g.isActive ? 'Group deactivated.' : 'Group activated.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update group')
    } finally {
      setBusy(false)
    }
  }

  async function remove(g: AddonGroup) {
    if (!window.confirm(`Delete "${g.name}"?`)) return
    try {
      await api(`/addon-groups/${g.id}`, { method: 'DELETE' })
      toast.success('Group deleted.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete group')
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= groups.length || search.trim()) return
    const next = [...groups]
    ;[next[index], next[target]] = [next[target], next[index]]
    setGroups(next)
    setBusy(true)
    try {
      await api('/addon-groups/reorder', { method: 'POST', body: JSON.stringify({ orderedIds: next.map((g) => g.id) }) })
    } catch {
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8 lg:px-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{groups.length} · Menu</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Add-on Groups</h1>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />{error}
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Groups</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Selection rule-sets</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Reusable rules for choosing extras — "Choose Cheese" (pick one), "Extras" (pick a few). You add the actual add-ons to a group next; then attach groups to menu items.
            </p>
          </div>
          <button onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15">
            <LuPlus /> New group
          </button>
        </div>

        <div className="border-b p-4">
          <label className="relative block">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups…" className="w-full rounded-sm border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading groups…</div>
        ) : visible.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">{search.trim() ? 'No groups match your search.' : 'No add-on groups yet.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide">
                  <th className="w-16 text-center">Order</th>
                  <th>Group</th>
                  <th>Rule</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0">
                {visible.map((g, index) => (
                  <tr key={g.id} className={cn('align-middle transition hover:bg-muted/40', !g.isActive && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => void move(index, -1)} disabled={busy || index === 0 || !!search.trim()} className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-25"><LuChevronUp className="size-4" /></button>
                        <button onClick={() => void move(index, 1)} disabled={busy || index === visible.length - 1 || !!search.trim()} className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-25"><LuChevronDown className="size-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{g.name}</p>
                      {g.description && <p className="max-w-sm truncate text-xs text-muted-foreground">{g.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                        {ruleSentence(g)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide', g.isActive ? 'border-success/40 text-success' : 'border-muted-foreground/30 text-muted-foreground')}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(g)} title="Edit" className="rounded-md p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil className="size-4" /></button>
                        <button onClick={() => void toggleActive(g)} disabled={busy} title={g.isActive ? 'Deactivate' : 'Activate'} className={cn('rounded-md p-2 hover:bg-muted', g.isActive ? 'text-muted-foreground' : 'text-success')}><LuPower className="size-4" /></button>
                        <button onClick={() => void remove(g)} title="Delete" className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 className="size-4" /></button>
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
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-sm border bg-card p-6 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-secondary">{editing ? 'Edit group' : 'New group'}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{editing ? editing.name : 'Add an add-on group'}</h2>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Name" required>
                <input required autoFocus placeholder="e.g. Choose Cheese" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} className="input" />
              </Field>
              <Field label="Description">
                <input placeholder="Optional — shown to staff / guests" value={form.description} onChange={(e) => updateForm({ description: e.target.value })} className="input" />
              </Field>

              <div>
                <p className="text-sm font-medium">Selection type</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(['SINGLE', 'MULTIPLE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateForm({ selectionType: t })}
                      className={cn('rounded-sm border px-3 py-2 text-sm font-semibold transition', form.selectionType === t ? 'border-secondary bg-secondary/10 text-secondary' : 'hover:bg-muted')}
                    >
                      {t === 'SINGLE' ? 'Single choice' : 'Multiple choice'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Min selections">
                  <input type="number" min="0" max="50" value={form.minSelections} onChange={(e) => updateForm({ minSelections: Math.max(0, Number(e.target.value) || 0) })} className="input" />
                </Field>
                <Field label="Max selections">
                  <input type="number" min="1" max="50" disabled={form.selectionType === 'SINGLE'} value={form.maxSelections} onChange={(e) => updateForm({ maxSelections: Math.max(1, Number(e.target.value) || 1) })} className="input disabled:opacity-60" />
                </Field>
              </div>

              <label className="flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                Required — the guest must choose
                <input type="checkbox" checked={form.required} onChange={(e) => updateForm({ required: e.target.checked })} className="size-4 accent-secondary" />
              </label>

              <p className="rounded-sm bg-muted/50 p-3 text-sm">
                <span className="font-semibold text-foreground">Guests will:</span> {ruleSentence(form)}
              </p>

              <label className="flex items-center justify-between rounded-sm border bg-background px-3 py-2.5 text-sm font-medium">
                Active
                <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm({ isActive: e.target.checked })} className="size-4 accent-secondary" />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-sm border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
              <button disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? 'Save changes' : 'Create group'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required && <span className="text-destructive"> *</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
