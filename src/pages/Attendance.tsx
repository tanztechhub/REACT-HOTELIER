import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuLoaderCircle } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string; status: string }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE'
type AttendanceRecord = { employeeId: string; date: string; status: AttendanceStatus; notes: string | null }

// Cycling order a click steps through: blank -> Present -> Absent -> Late -> On leave -> blank.
const CYCLE: (AttendanceStatus | null)[] = [null, 'PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE']
const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success/15 text-success',
  ABSENT: 'bg-destructive/15 text-destructive',
  LATE: 'bg-warning/15 text-warning',
  ON_LEAVE: 'bg-secondary/15 text-secondary',
}
const STATUS_LETTER: Record<AttendanceStatus, string> = { PRESENT: 'P', ABSENT: 'A', LATE: 'L', ON_LEAVE: 'O' }

function monthKey(date: string): string {
  // "YYYY-MM-DD" -> day-of-month, cheaply, without a Date/timezone round trip.
  return date.slice(8, 10)
}

export default function Attendance() {
  const toast = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month])
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])
  const monthLabel = useMemo(() => new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [year, month])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [e, r] = await Promise.all([
        api<{ employees: Employee[] }>('/employees'),
        api<{ records: AttendanceRecord[] }>(`/attendance?year=${year}&month=${month}`),
      ])
      setEmployees(e.employees.filter((emp) => emp.status === 'ACTIVE'))
      setRecords(new Map(r.records.map((rec) => [`${rec.employeeId}|${monthKey(rec.date)}`, rec])))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load attendance'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [year, month, toast])

  useEffect(() => { void load() }, [load])

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
  }

  async function cycleCell(employeeId: string, day: number) {
    const key = `${employeeId}|${String(day).padStart(2, '0')}`
    const current = records.get(key)?.status ?? null
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSaving(key)
    try {
      if (next) {
        await api<{ record: AttendanceRecord }>('/attendance/mark', { method: 'PUT', body: JSON.stringify({ employeeId, date: dateStr, status: next }) })
      } else {
        await api(`/attendance/${employeeId}/${dateStr}`, { method: 'DELETE' })
      }
      setRecords((prev) => {
        const copy = new Map(prev)
        if (next) copy.set(key, { employeeId, date: dateStr, status: next, notes: null })
        else copy.delete(key)
        return copy
      })
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update attendance')
    } finally {
      setSaving(null)
    }
  }

  const summary = useMemo(() => {
    const counts = new Map<string, Record<AttendanceStatus, number>>()
    for (const rec of records.values()) {
      const row = counts.get(rec.employeeId) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, ON_LEAVE: 0 }
      row[rec.status] += 1
      counts.set(rec.employeeId, row)
    }
    return counts
  }, [records])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Team</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Attendance</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Marked by hand, one day at a time — click a cell to cycle Present → Absent → Late → On leave → blank. Any past month is one click away.</p>
        </div>
        <div className="flex items-center gap-2 rounded-sm border bg-card px-2 py-1.5 shadow-sm">
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-sm p-1.5 hover:bg-muted"><LuChevronLeft className="size-4" /></button>
          <span className="min-w-32 text-center text-sm font-semibold">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-sm p-1.5 hover:bg-muted"><LuChevronRight className="size-4" /></button>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(Object.keys(STATUS_LETTER) as AttendanceStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn('flex size-5 items-center justify-center rounded-sm text-[10px] font-bold', STATUS_STYLE[s])}>{STATUS_LETTER[s]}</span>
            {s === 'ON_LEAVE' ? 'On leave' : s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading attendance…</div>
        ) : employees.length === 0 ? (
          <div className="min-h-64 p-16 text-center text-sm text-muted-foreground">No active employees yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-primary px-3 py-2 font-semibold">Employee</th>
                  {days.map((d) => <th key={d} className="w-8 px-0.5 py-2 text-center font-semibold">{d}</th>)}
                  <th className="px-2 py-2 text-center font-semibold">P</th>
                  <th className="px-2 py-2 text-center font-semibold">A</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0">
                {employees.map((emp) => {
                  const row = summary.get(emp.id)
                  return (
                    <tr key={emp.id} className="align-middle">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 font-semibold">{emp.firstName} {emp.lastName}</td>
                      {days.map((d) => {
                        const key = `${emp.id}|${String(d).padStart(2, '0')}`
                        const status = records.get(key)?.status
                        const isSaving = saving === key
                        return (
                          <td key={d} className="p-0.5 text-center">
                            <button
                              onClick={() => void cycleCell(emp.id, d)}
                              disabled={isSaving}
                              className={cn(
                                'flex size-6 items-center justify-center rounded-sm text-[10px] font-bold transition-colors hover:opacity-80 disabled:opacity-50',
                                status ? STATUS_STYLE[status] : 'bg-muted/50 text-transparent hover:bg-muted',
                              )}
                            >
                              {isSaving ? <LuLoaderCircle className="size-3 animate-spin text-muted-foreground" /> : (status ? STATUS_LETTER[status] : '·')}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-center tabular-nums text-success">{row?.PRESENT ?? 0}</td>
                      <td className="px-2 py-1.5 text-center tabular-nums text-destructive">{row?.ABSENT ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
