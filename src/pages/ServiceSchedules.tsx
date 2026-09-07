import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuLayoutGrid,
  LuList,
  LuLoaderCircle,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUserRoundCheck,
  LuUsers,
} from "react-icons/lu";
import { api } from "@/lib/api";

type Provider = { id: string; name: string; specialty: string | null };
type Schedule = {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  notes: string | null;
  provider: Provider;
};
type Appointment = {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  paymentStatus: string;
  customer: { firstName: string; lastName: string; phone: string | null };
  service: { name: string; durationMinutes: number };
  membership: { plan: { name: string } } | null;
};
type Form = {
  providerId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  notes: string;
};
const blank: Form = {
  providerId: "",
  startsAt: "",
  endsAt: "",
  isAvailable: true,
  notes: "",
};
const inputDate = (value: Date | string) =>
  new Date(value).toISOString().slice(0, 16);
const activeBooking = (a: Appointment) =>
  !["CANCELLED", "NO_SHOW"].includes(a.status);

export default function ServiceSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]),
    [appointments, setAppointments] = useState<Appointment[]>([]),
    [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<Form>(blank),
    [editing, setEditing] = useState<Schedule | null>(null),
    [open, setOpen] = useState(false);
  const [query, setQuery] = useState(""),
    [providerFilter, setProviderFilter] = useState("ALL"),
    [day, setDay] = useState(""),
    [view, setView] = useState<"timeline" | "cards">(
      () =>
        (localStorage.getItem("schedule-view") as "timeline" | "cards") ||
        "timeline",
    );
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, options] = await Promise.all([
        api<{ schedules: Schedule[]; appointments: Appointment[] }>(
          "/service-center/schedules",
        ),
        api<{ providers: Provider[] }>("/service-center/schedule-options"),
      ]);
      setSchedules(data.schedules);
      setAppointments(data.appointments);
      setProviders(options.providers);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load schedules");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    localStorage.setItem("schedule-view", view);
  }, [view]);
  const bookingsFor = useCallback(
    (s: Schedule) =>
      appointments.filter(
        (a) =>
          a.providerId === s.providerId &&
          new Date(a.startsAt) < new Date(s.endsAt) &&
          new Date(a.endsAt) > new Date(s.startsAt),
      ),
    [appointments],
  );
  const visible = useMemo(
    () =>
      schedules.filter(
        (s) =>
          (providerFilter === "ALL" || s.providerId === providerFilter) &&
          (!day || new Date(s.startsAt).toISOString().slice(0, 10) === day) &&
          `${s.provider.name} ${s.provider.specialty ?? ""} ${s.notes ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [schedules, providerFilter, day, query],
  );
  const today = new Date().toDateString();
  const customersToday = appointments.filter(
    (a) => new Date(a.startsAt).toDateString() === today && activeBooking(a),
  ).length;
  function create() {
    const start = new Date(Date.now() + 3_600_000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 8 * 3_600_000);
    setEditing(null);
    setForm({
      ...blank,
      providerId: providers[0]?.id ?? "",
      startsAt: inputDate(start),
      endsAt: inputDate(end),
    });
    setOpen(true);
    setError("");
  }
  function edit(s: Schedule) {
    setEditing(s);
    setForm({
      providerId: s.providerId,
      startsAt: inputDate(s.startsAt),
      endsAt: inputDate(s.endsAt),
      isAvailable: s.isAvailable,
      notes: s.notes ?? "",
    });
    setOpen(true);
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(
        editing
          ? `/service-center/schedules/${editing.id}`
          : "/service-center/schedules",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            startsAt: new Date(form.startsAt),
            endsAt: new Date(form.endsAt),
            notes: form.notes || null,
          }),
        },
      );
      setOpen(false);
      setNotice(
        editing
          ? "Schedule updated for staff and customers."
          : "Provider schedule created.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save schedule");
    } finally {
      setSaving(false);
    }
  }
  async function toggle(s: Schedule) {
    try {
      await api(`/service-center/schedules/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !s.isAvailable }),
      });
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update availability",
      );
    }
  }
  async function remove(s: Schedule) {
    if (!confirm(`Delete ${s.provider.name}'s schedule?`)) return;
    try {
      await api(`/service-center/schedules/${s.id}`, { method: "DELETE" });
      setNotice("Schedule deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete schedule");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-[#172554] via-[#3730a3] to-[#7c3aed] p-8 text-white shadow-2xl">
        <div className="absolute right-8 top-8 grid grid-cols-7 gap-2 opacity-15">
          {Array.from({ length: 35 }).map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-white" />
          ))}
        </div>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-200">
              Staff → customer care
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Every shift. Every guest. One schedule.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Coordinate staff availability with customers, services,
              memberships, payments and attendance.
            </p>
          </div>
          <button
            onClick={create}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-950 shadow-lg"
          >
            <LuPlus /> Add schedule
          </button>
        </div>
      </header>
      {error && <Message error text={error} />}
      {notice && <Message text={notice} />}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<LuCalendarDays />}
          value={schedules.length}
          label="Schedule blocks"
        />
        <Metric
          icon={<LuUserRoundCheck />}
          value={schedules.filter((s) => s.isAvailable).length}
          label="Available shifts"
        />
        <Metric
          icon={<LuUsers />}
          value={customersToday}
          label="Customers today"
        />
        <Metric
          icon={<LuCheck />}
          value={appointments.filter((a) => a.status === "COMPLETED").length}
          label="Completed visits"
        />
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl border px-3">
            <LuSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none"
              placeholder="Search staff, specialty or notes"
            />
          </label>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="input xl:max-w-56"
          >
            <option value="ALL">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="input xl:max-w-44"
          />
          <div className="flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setView("timeline")}
              className={`rounded-lg p-2 ${view === "timeline" ? "bg-card shadow" : ""}`}
              aria-label="Timeline"
            >
              <LuList />
            </button>
            <button
              onClick={() => setView("cards")}
              className={`rounded-lg p-2 ${view === "cards" ? "bg-card shadow" : ""}`}
              aria-label="Cards"
            >
              <LuLayoutGrid />
            </button>
          </div>
        </div>
      </section>
      {loading ? (
        <div className="p-20 text-center">
          <LuLoaderCircle className="mx-auto animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-5 rounded-2xl border bg-card p-20 text-center text-sm text-muted-foreground">
          No schedules match these filters.
        </div>
      ) : (
        <section
          className={
            view === "cards"
              ? "mt-5 grid gap-5 lg:grid-cols-2"
              : "mt-5 space-y-4"
          }
        >
          {visible.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              bookings={bookingsFor(s)}
              timeline={view === "timeline"}
              onEdit={() => edit(s)}
              onDelete={() => void remove(s)}
              onToggle={() => void toggle(s)}
            />
          ))}
        </section>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="w-full max-w-xl rounded-3xl bg-card p-6 shadow-2xl"
          >
            <p className="text-sm font-bold text-indigo-700">
              {editing ? "Adjust shift" : "Plan staff coverage"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Provider schedule</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Staff provider">
                <select
                  required
                  className="input"
                  value={form.providerId}
                  onChange={(e) =>
                    setForm({ ...form, providerId: e.target.value })
                  }
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.specialty}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center justify-between rounded-xl border p-4">
                <span>
                  <b className="block text-sm">Accept bookings</b>
                  <span className="text-xs text-muted-foreground">
                    Available to customers
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm({ ...form, isAvailable: e.target.checked })
                  }
                  className="h-5 w-5"
                />
              </label>
              <Field label="Shift starts">
                <input
                  required
                  type="datetime-local"
                  className="input"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </Field>
              <Field label="Shift ends">
                <input
                  required
                  type="datetime-local"
                  min={form.startsAt}
                  className="input"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </Field>
              <label className="text-sm font-medium sm:col-span-2">
                Attendance instructions
                <textarea
                  rows={3}
                  maxLength={500}
                  className="input mt-1.5 h-auto py-3"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Breaks, room assignment, customer care notes..."
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-800 px-4 py-2.5 font-bold text-white"
              >
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? "Save schedule" : "Create schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule: s,
  bookings,
  timeline,
  onEdit,
  onDelete,
  onToggle,
}: {
  schedule: Schedule;
  bookings: Appointment[];
  timeline: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${timeline ? "lg:grid lg:grid-cols-[260px_1fr]" : ""}`}
    >
      <div
        className={`p-5 text-white ${s.isAvailable ? "bg-linear-to-br from-indigo-700 to-violet-600" : "bg-slate-600"}`}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">
            {s.provider.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </span>
          <button
            onClick={onToggle}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold"
          >
            {s.isAvailable ? "Available" : "Unavailable"}
          </button>
        </div>
        <h2 className="mt-4 text-lg font-bold">{s.provider.name}</h2>
        <p className="text-xs text-white/70">
          {s.provider.specialty || "Service provider"}
        </p>
        <div className="mt-4 text-sm">
          <b>{new Date(s.startsAt).toLocaleDateString()}</b>
          <p className="text-white/75">
            {new Date(s.startsAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {new Date(s.endsAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="mt-4 flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg bg-white/10 p-2"
            aria-label="Edit"
          >
            <LuPencil />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-white/10 p-2"
            aria-label="Delete"
          >
            <LuTrash2 />
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Customer attendance plan</h3>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            {bookings.filter(activeBooking).length} booked
          </span>
        </div>
        {bookings.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No customers assigned during this shift.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {bookings.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-xl border p-3">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-xs">
                  <b>
                    {new Date(a.startsAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </b>
                  <span>{a.service.durationMinutes}m</span>
                </div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate">
                    {a.customer.firstName} {a.customer.lastName}
                  </b>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service.name} · {a.membership?.plan.name ?? "Standard"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold">{a.status}</span>
                  <p className="text-[10px] text-muted-foreground">
                    {a.paymentStatus}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {s.notes && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <b>Shift note:</b> {s.notes}
          </p>
        )}
      </div>
    </article>
  );
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <span className="inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
        {icon}
      </span>
      <b className="mt-4 block text-2xl">{value}</b>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm font-medium">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Message({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
    >
      {text}
    </div>
  );
}
