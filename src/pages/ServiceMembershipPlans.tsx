import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuBadgePercent,
  LuCalendarDays,
  LuCheck,
  LuCircleDollarSign,
  LuCrown,
  LuLoaderCircle,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSparkles,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import { api } from "@/lib/api";

type Member = {
  id: string;
  status: string;
  payments: { amount: string | number; status: string }[];
  _count: { appointments: number };
};
type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  durationDays: number;
  discountPercent: string | number;
  isActive: boolean;
  memberships: Member[];
};
type Form = {
  name: string;
  description: string;
  price: string;
  durationDays: string;
  discountPercent: string;
  isActive: boolean;
};
const blank: Form = {
  name: "",
  description: "",
  price: "",
  durationDays: "30",
  discountPercent: "0",
  isActive: true,
};
const money = (value: number) =>
  `KSh ${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
const palette = [
  {
    gradient: "from-violet-700 via-purple-600 to-fuchsia-500",
    soft: "bg-purple-100 text-purple-700",
  },
  {
    gradient: "from-amber-600 via-orange-500 to-rose-500",
    soft: "bg-amber-100 text-amber-800",
  },
  {
    gradient: "from-sky-700 via-cyan-600 to-teal-500",
    soft: "bg-cyan-100 text-cyan-800",
  },
  {
    gradient: "from-emerald-700 via-green-600 to-lime-500",
    soft: "bg-emerald-100 text-emerald-800",
  },
];

export default function ServiceMembershipPlans() {
  const [plans, setPlans] = useState<Plan[]>([]),
    [query, setQuery] = useState(""),
    [form, setForm] = useState<Form>(blank),
    [editing, setEditing] = useState<Plan | null>(null),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ membershipPlans: Plan[] }>(
        "/service-center/membership-plans",
      );
      setPlans(result.membershipPlans);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load membership plans",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      plans.filter((p) =>
        `${p.name} ${p.description ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [plans, query],
  );
  const totalMembers = plans.flatMap((p) => p.memberships).length;
  const activeMembers = plans
    .flatMap((p) => p.memberships)
    .filter((m) => m.status === "ACTIVE").length;
  const revenue = plans
    .flatMap((p) => p.memberships)
    .flatMap((m) => m.payments)
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  function create() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
    setError("");
  }
  function edit(plan: Plan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      discountPercent: String(plan.discountPercent),
      isActive: plan.isActive,
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
          ? `/service-center/membership-plans/${editing.id}`
          : "/service-center/membership-plans",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            discountPercent: Number(form.discountPercent),
            description: form.description || null,
          }),
        },
      );
      setOpen(false);
      setNotice(
        editing
          ? "Plan updated across the Service Centre."
          : "Membership plan created.",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save membership plan",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(plan: Plan) {
    try {
      await api(`/service-center/membership-plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update plan");
    }
  }
  async function remove(plan: Plan) {
    if (!confirm(`Delete ${plan.name}?`)) return;
    try {
      await api(`/service-center/membership-plans/${plan.id}`, {
        method: "DELETE",
      });
      setNotice("Membership plan deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete plan");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#10072b] p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(217,70,239,.45),transparent_35%),radial-gradient(circle_at_15%_100%,rgba(59,130,246,.35),transparent_30%)]" />
        <LuSparkles className="absolute right-12 top-10 text-5xl text-fuchsia-300/50" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-fuchsia-300">
              Service Centre · Benefits
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Design memberships guests love.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Control pricing, duration and appointment discounts from one
              connected catalogue.
            </p>
          </div>
          <button
            onClick={create}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-purple-950 shadow-lg"
          >
            <LuPlus /> Create plan
          </button>
        </div>
      </header>
      {error && <Message error text={error} />}{" "}
      {notice && <Message text={notice} />}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<LuCrown />} value={plans.length} label="Plans" />
        <Metric
          icon={<LuUsers />}
          value={totalMembers}
          label="Total enrollments"
        />
        <Metric
          icon={<LuCheck />}
          value={activeMembers}
          label="Active members"
        />
        <Metric
          icon={<LuCircleDollarSign />}
          value={money(revenue)}
          label="Membership revenue"
        />
      </section>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Plan catalogue</h2>
          <p className="text-sm text-muted-foreground">
            Active plans automatically appear when creating memberships.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border bg-card px-3 shadow-sm">
          <LuSearch />
          <input
            className="h-10 bg-transparent text-sm outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans"
          />
        </label>
      </div>
      {loading ? (
        <div className="p-20 text-center">
          <LuLoaderCircle className="mx-auto animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-5 rounded-2xl border bg-card p-20 text-center text-sm text-muted-foreground">
          No membership plans found.
        </div>
      ) : (
        <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((plan, index) => {
            const colors = palette[index % palette.length];
            const paid = plan.memberships
              .flatMap((m) => m.payments)
              .filter((p) => p.status === "PAID")
              .reduce((sum, p) => sum + Number(p.amount), 0);
            return (
              <article
                key={plan.id}
                className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div
                  className={`bg-linear-to-br ${colors.gradient} p-6 text-white`}
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                      {plan.isActive ? "AVAILABLE" : "HIDDEN"}
                    </span>
                    <LuCrown className="text-3xl text-white/70" />
                  </div>
                  <h3 className="mt-8 text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-1 min-h-10 text-sm text-white/75">
                    {plan.description || "Flexible service centre membership"}
                  </p>
                  <div className="mt-5">
                    <b className="text-3xl">{money(Number(plan.price))}</b>
                    <span className="text-sm text-white/70">
                      {" "}
                      / {plan.durationDays} days
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-2xl p-3 ${colors.soft}`}>
                      <LuBadgePercent />
                      <b className="mt-2 block text-xl">
                        {plan.discountPercent}%
                      </b>
                      <span className="text-xs">Service discount</span>
                    </div>
                    <div className="rounded-2xl bg-muted p-3">
                      <LuCalendarDays />
                      <b className="mt-2 block text-xl">
                        {plan.memberships.length}
                      </b>
                      <span className="text-xs">Enrollments</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div>
                      <b>{money(paid)}</b>
                      <p className="text-xs text-muted-foreground">Collected</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void toggle(plan)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => edit(plan)}
                        aria-label="Edit plan"
                        className="rounded-lg p-2 text-secondary hover:bg-muted"
                      >
                        <LuPencil />
                      </button>
                      <button
                        onClick={() => void remove(plan)}
                        aria-label="Delete plan"
                        className="rounded-lg p-2 text-destructive hover:bg-muted"
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10072b]/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
          >
            <p className="text-sm font-bold text-purple-700">
              {editing ? "Customize plan" : "New benefit package"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Membership plan</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Plan name">
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wellness Platinum"
                />
              </Field>
              <Field label="Price (KSh)">
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  className="input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Duration (days)">
                <input
                  required
                  min={1}
                  max={3650}
                  type="number"
                  className="input"
                  value={form.durationDays}
                  onChange={(e) =>
                    setForm({ ...form, durationDays: e.target.value })
                  }
                />
              </Field>
              <Field label="Service discount (%)">
                <input
                  required
                  min={0}
                  max={100}
                  step="0.01"
                  type="number"
                  className="input"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm({ ...form, discountPercent: e.target.value })
                  }
                />
              </Field>
              <label className="text-sm font-medium sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  maxLength={500}
                  className="input mt-1.5 h-auto py-3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe benefits and ideal members..."
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border p-4 sm:col-span-2">
                <span>
                  <b className="block text-sm">Available for enrollment</b>
                  <span className="text-xs text-muted-foreground">
                    Show this plan in the Memberships module
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-5 w-5"
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
                className="flex items-center gap-2 rounded-xl bg-purple-800 px-4 py-2.5 font-bold text-white"
              >
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? "Save changes" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
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
      <span className="inline-flex rounded-xl bg-purple-100 p-2.5 text-purple-700">
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
