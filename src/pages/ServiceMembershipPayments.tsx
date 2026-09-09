import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuBadgeCheck,
  LuCalendarCheck,
  LuCircleDollarSign,
  LuLayoutGrid,
  LuList,
  LuLoaderCircle,
  LuPencil,
  LuPlus,
  LuReceiptText,
  LuSearch,
  LuTrash2,
  LuWalletCards,
} from "react-icons/lu";
import { api } from "@/lib/api";

type Status = "PENDING" | "PAID" | "REFUNDED" | "FAILED";
type Customer = { firstName: string; lastName: string; phone: string | null };
type Plan = { name: string; price: string | number };
type Appointment = {
  id: string;
  startsAt: string;
  service: { name: string };
  provider?: { name: string };
};
type Membership = {
  id: string;
  status: string;
  customer: Customer;
  plan: Plan;
  appointments: Appointment[];
};
type Method = { id: string; name: string };
type Payment = {
  id: string;
  membershipId: string;
  paymentMethodId: string;
  amount: string | number;
  status: Status;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentMethod: Method;
  membership: Membership;
};
type Form = {
  membershipId: string;
  paymentMethodId: string;
  amount: string;
  status: Status;
  reference: string;
  paidAt: string;
};
const blank: Form = {
  membershipId: "",
  paymentMethodId: "",
  amount: "",
  status: "PAID",
  reference: "",
  paidAt: "",
};
const money = (value: number) =>
  `KSh ${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
const statusStyle: Record<Status, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-800",
  REFUNDED: "bg-sky-100 text-sky-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function ServiceMembershipPayments() {
  const [payments, setPayments] = useState<Payment[]>([]),
    [memberships, setMemberships] = useState<Membership[]>([]),
    [methods, setMethods] = useState<Method[]>([]),
    [form, setForm] = useState<Form>(blank),
    [editing, setEditing] = useState<Payment | null>(null),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"ALL" | Status>("ALL"),
    [view, setView] = useState<"cards" | "list">(
      () =>
        (localStorage.getItem("membership-payment-view") as "cards" | "list") ||
        "cards",
    ),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledger, options] = await Promise.all([
        api<{ membershipPayments: Payment[] }>(
          "/service-center/membership-payments",
        ),
        api<{ memberships: Membership[]; paymentMethods: Method[] }>(
          "/service-center/membership-payment-options",
        ),
      ]);
      setPayments(ledger.membershipPayments);
      setMemberships(options.memberships);
      setMethods(options.paymentMethods);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    localStorage.setItem("membership-payment-view", view);
  }, [view]);
  const visible = useMemo(
    () =>
      payments.filter(
        (p) =>
          (filter === "ALL" || p.status === filter) &&
          `${p.membership.customer.firstName} ${p.membership.customer.lastName} ${p.membership.plan.name} ${p.reference ?? ""} ${p.paymentMethod.name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [payments, filter, query],
  );
  const paid = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const linkedAppointments = new Set(
    payments.flatMap((p) => p.membership.appointments.map((a) => a.id)),
  ).size;
  function create() {
    const membership = memberships[0];
    setEditing(null);
    setForm({
      ...blank,
      membershipId: membership?.id ?? "",
      paymentMethodId: methods[0]?.id ?? "",
      amount: membership ? String(membership.plan.price) : "",
      paidAt: new Date().toISOString().slice(0, 16),
    });
    setOpen(true);
    setError("");
  }
  function edit(payment: Payment) {
    setEditing(payment);
    setForm({
      membershipId: payment.membershipId,
      paymentMethodId: payment.paymentMethodId,
      amount: String(payment.amount),
      status: payment.status,
      reference: payment.reference ?? "",
      paidAt: payment.paidAt
        ? new Date(payment.paidAt).toISOString().slice(0, 16)
        : "",
    });
    setOpen(true);
    setError("");
  }
  function chooseMembership(id: string) {
    const membership = memberships.find((m) => m.id === id);
    setForm({
      ...form,
      membershipId: id,
      amount: membership ? String(membership.plan.price) : form.amount,
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(
        editing
          ? `/service-center/membership-payments/${editing.id}`
          : "/service-center/membership-payments",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount),
            reference: form.reference || null,
            paidAt: form.paidAt ? new Date(form.paidAt) : null,
          }),
        },
      );
      setOpen(false);
      setNotice(
        editing
          ? "Payment updated across connected records."
          : "Membership payment recorded.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save payment");
    } finally {
      setSaving(false);
    }
  }
  async function remove(payment: Payment) {
    if (!confirm(`Delete payment ${payment.reference || payment.id}?`)) return;
    try {
      await api(`/service-center/membership-payments/${payment.id}`, {
        method: "DELETE",
      });
      setNotice("Payment deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete payment");
    }
  }
  async function updateStatus(payment: Payment, status: Status) {
    try {
      await api(`/service-center/membership-payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update payment");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-[#071e3d] via-[#0c4a6e] to-[#0f766e] p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-200">
              Connected financial ledger
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Membership payments, clearly accounted for.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Every receipt stays linked to its customer, membership plan,
              membership and associated appointments.
            </p>
          </div>
          <button
            onClick={create}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-sky-950 shadow-lg"
          >
            <LuPlus /> Record payment
          </button>
        </div>
      </header>
      {error && <Message error text={error} />}{" "}
      {notice && <Message text={notice} />}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<LuCircleDollarSign />}
          value={money(paid)}
          label="Successfully paid"
        />
        <Metric
          icon={<LuWalletCards />}
          value={money(pending)}
          label="Awaiting payment"
        />
        <Metric
          icon={<LuReceiptText />}
          value={payments.length}
          label="Payment records"
        />
        <Metric
          icon={<LuCalendarCheck />}
          value={linkedAppointments}
          label="Linked appointments"
        />
      </section>
      <section className="mt-6">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PAID", "PENDING", "REFUNDED", "FAILED"] as const).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === item ? "bg-sky-800 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <div className="flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border px-3">
              <LuSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 min-w-0 bg-transparent text-sm outline-none"
                placeholder="Customer, plan or reference"
              />
            </label>
            <div className="flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setView("cards")}
                className={`rounded-lg p-2 ${view === "cards" ? "bg-card shadow" : ""}`}
                aria-label="Card view"
              >
                <LuLayoutGrid />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-lg p-2 ${view === "list" ? "bg-card shadow" : ""}`}
                aria-label="List view"
              >
                <LuList />
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="p-20 text-center">
            <LuLoaderCircle className="mx-auto animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-2xl border bg-card p-20 text-center text-sm text-muted-foreground">
            No matching payments.
          </div>
        ) : (
          <div
            className={
              view === "cards"
                ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                : "mt-5 space-y-3"
            }
          >
            {visible.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                compact={view === "list"}
                onEdit={() => edit(payment)}
                onDelete={() => void remove(payment)}
                onStatus={(status) => void updateStatus(payment, status)}
              />
            ))}
          </div>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
          >
            <p className="text-sm font-bold text-sky-700">
              {editing ? "Edit transaction" : "New transaction"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Membership payment</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Customer membership">
                <select
                  required
                  className="input"
                  value={form.membershipId}
                  onChange={(e) => chooseMembership(e.target.value)}
                >
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.customer.firstName} {m.customer.lastName} ·{" "}
                      {m.plan.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment method">
                <select
                  required
                  className="input"
                  value={form.paymentMethodId}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethodId: e.target.value })
                  }
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (KSh)">
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  className="input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Status">
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as Status })
                  }
                >
                  {["PENDING", "PAID", "REFUNDED", "FAILED"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Transaction reference">
                <input
                  maxLength={120}
                  className="input"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="e.g. M-Pesa code"
                />
              </Field>
              <Field label="Payment date and time">
                <input
                  type="datetime-local"
                  className="input"
                  value={form.paidAt}
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                />
              </Field>
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
                className="flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 font-bold text-white"
              >
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? "Save changes" : "Record payment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PaymentCard({
  payment,
  compact,
  onEdit,
  onDelete,
  onStatus,
}: {
  payment: Payment;
  compact: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: Status) => void;
}) {
  return (
    <article
      className={`rounded-2xl border bg-card shadow-sm transition hover:shadow-lg ${compact ? "flex flex-col gap-3 p-4 md:flex-row md:items-center" : "overflow-hidden"}`}
    >
      <div
        className={
          compact ? "hidden" : "h-1.5 bg-linear-to-r from-sky-600 to-teal-400"
        }
      />
      <div className={compact ? "min-w-56 flex-1" : "p-5"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {payment.membership.plan.name}
            </p>
            <h3 className="mt-1 text-lg font-bold">
              {payment.membership.customer.firstName}{" "}
              {payment.membership.customer.lastName}
            </h3>
          </div>
          <select
            value={payment.status}
            onChange={(e) => onStatus(e.target.value as Status)}
            className={`rounded-full border-0 px-2 py-1 text-xs font-bold ${statusStyle[payment.status]}`}
          >
            {["PENDING", "PAID", "REFUNDED", "FAILED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div
          className={`mt-4 ${compact ? "flex flex-wrap items-center gap-5" : ""}`}
        >
          <b className="text-2xl">{money(Number(payment.amount))}</b>
          <p className="text-xs text-muted-foreground">
            {payment.paymentMethod.name} · {payment.reference || "No reference"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {payment.paidAt
              ? new Date(payment.paidAt).toLocaleString()
              : "Payment date pending"}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-sky-700">
            <LuBadgeCheck /> {payment.membership.appointments.length} linked
            appointments
          </span>
          <div className="flex">
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-secondary hover:bg-muted"
              aria-label="Edit payment"
            >
              <LuPencil />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-destructive hover:bg-muted"
              aria-label="Delete payment"
            >
              <LuTrash2 />
            </button>
          </div>
        </div>
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
      <span className="inline-flex rounded-xl bg-sky-100 p-2.5 text-sky-700">
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
