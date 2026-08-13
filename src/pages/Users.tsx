import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle, LuPencil, LuPlus, LuSearch, LuShieldCheck, LuTrash2, LuUserCheck, LuUsers } from 'react-icons/lu'

import { api } from '@/lib/api'

const roles = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'STAFF', 'BARISTA', 'STORE_KEEPER', 'RECEPTIONIST', 'HOUSEKEEPER'] as const
type Role = typeof roles[number]
type User = { id: string; email: string; firstName: string; lastName: string; role: Role; isActive: boolean; createdAt: string; updatedAt: string }
type Summary = { total: number; active: number; inactive: number }
type UserForm = { firstName: string; lastName: string; email: string; password: string; role: Role; isActive: boolean }
const emptyForm: UserForm = { firstName: '', lastName: '', email: '', password: '', role: 'STAFF', isActive: true }
const roleLabel = (role: Role) => role.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, inactive: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editing, setEditing] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (roleFilter) query.set('role', roleFilter)
      const response = await api<{ users: User[]; summary: Summary }>(`/users${query.size ? `?${query}` : ''}`)
      setUsers(response.users)
      setSummary(response.summary)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load users') }
    finally { setLoading(false) }
  }, [roleFilter, search])

  useEffect(() => { const timer = window.setTimeout(() => void loadUsers(), 250); return () => window.clearTimeout(timer) }, [loadUsers])
  const initials = useMemo(() => (user: User) => `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(), [])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true) }
  function openEdit(user: User) { setEditing(user); setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', role: user.role, isActive: user.isActive }); setError(''); setShowForm(true) }

  async function saveUser(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const payload = { ...form, ...(editing && !form.password ? { password: undefined } : {}) }
      await api(editing ? `/users/${editing.id}` : '/users', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      setNotice(editing ? 'User details updated.' : 'New team member created.')
      setShowForm(false); await loadUsers()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save user') }
    finally { setSaving(false) }
  }

  async function toggleActive(user: User) {
    setError(''); setNotice('')
    try { await api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !user.isActive }) }); setNotice(`${user.firstName} is now ${user.isActive ? 'inactive' : 'active'}.`); await loadUsers() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update user') }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Permanently delete ${user.firstName} ${user.lastName}?`)) return
    setError(''); setNotice('')
    try { await api(`/users/${user.id}`, { method: 'DELETE' }); setNotice('User deleted.'); await loadUsers() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete user') }
  }

  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-secondary">Access & team</p><h1 className="mt-1 font-display text-3xl font-semibold">User management</h1><p className="mt-2 text-sm text-muted-foreground">Create staff accounts, assign responsibilities, and control access.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15"><LuPlus /> Add user</button></header>
    <section className="mt-7 grid gap-3 sm:grid-cols-3">{[["Team members", summary.total, <LuUsers key="all" />], ["Active users", summary.active, <LuUserCheck key="active" />], ["Inactive users", summary.inactive, <LuShieldCheck key="inactive" />]].map(([label, value, icon]) => <div key={String(label)} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between text-muted-foreground"><span className="text-sm font-medium">{label}</span><span className="text-secondary">{icon}</span></div><p className="mt-2 font-display text-3xl font-semibold">{value}</p></div>)}</section>
    {error && <div className="mt-5 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><LuCircleAlert />{error}</div>}
    {notice && <div className="mt-5 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-sm text-success"><LuCircleCheck />{notice}</div>}
    <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><label className="relative flex-1"><LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none"><option value="">All roles</option>{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></div>
      {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading users…</div> : users.length === 0 ? <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">No users match your search.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Added</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t transition hover:bg-muted/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-secondary to-accent text-xs font-bold text-white">{initials(user)}</span><div><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-lg bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">{roleLabel(user.role)}</span></td><td className="px-5 py-4"><button onClick={() => void toggleActive(user)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{user.isActive ? 'Active' : 'Inactive'}</button></td><td className="px-5 py-4 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(user)} title="Edit user" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/10 hover:text-secondary"><LuPencil /></button><button onClick={() => void deleteUser(user)} title="Delete user" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LuTrash2 /></button></div></td></tr>)}</tbody></table></div>}
    </section>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}><form onSubmit={saveUser} className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl"><div><p className="text-sm font-semibold text-secondary">{editing ? 'Edit account' : 'New account'}</p><h2 className="mt-1 font-display text-2xl font-semibold">{editing ? `${editing.firstName} ${editing.lastName}` : 'Add a team member'}</h2></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="First name"><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input" /></Field><Field label="Last name"><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input" /></Field><Field label="Email"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field><Field label={editing ? 'New password (optional)' : 'Temporary password'}><input required={!editing} minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" /></Field><Field label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input">{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></Field><label className="flex items-end"><span className="flex w-full items-center justify-between rounded-xl border bg-background px-3 py-2.5 text-sm font-medium">Account active<input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-secondary" /></span></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <LuLoaderCircle className="animate-spin" />}{editing ? 'Save changes' : 'Create user'}</button></div></form></div>}
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-medium">{label}<span className="mt-1.5 block">{children}</span></label> }
