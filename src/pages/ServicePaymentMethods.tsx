import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LuBanknote,
  LuBuilding2,
  LuCheck,
  LuCircleDollarSign,
  LuCreditCard,
  LuLoaderCircle,
  LuPencil,
  LuPhone,
  LuPlus,
  LuSearch,
  LuShieldCheck,
  LuTrash2,
  LuWifi,
} from "react-icons/lu";
import { api } from "@/lib/api";

type Method = {
  id: string;
  name: string;
  isActive: boolean;
  _count: { membershipPayments: number; appointments: number };
};
type MethodStyle = {
  icon: ReactNode;
  gradient: string;
  soft: string;
  label: string;
};
const kenyaPresets = [
  "M-Pesa",
  "Airtel Money",
  "PesaLink",
  "Visa / Mastercard",
  "Cash",
  "Bank Transfer",
];
const styleFor = (name: string): MethodStyle => {
  const value = name.toLowerCase();
  if (value.includes("m-pesa"))
    return {
      icon: <LuPhone />,
      gradient: "from-emerald-600 to-green-400",
      soft: "bg-emerald-50 text-emerald-700",
      label: "Mobile money",
    };
  if (value.includes("airtel"))
    return {
      icon: <LuWifi />,
      gradient: "from-red-600 to-rose-400",
      soft: "bg-red-50 text-red-700",
      label: "Mobile money",
    };
  if (value.includes("pesa"))
    return {
      icon: <LuBuilding2 />,
      gradient: "from-sky-700 to-cyan-400",
      soft: "bg-sky-50 text-sky-700",
      label: "Bank network",
    };
  if (value.includes("card") || value.includes("visa"))
    return {
      icon: <LuCreditCard />,
      gradient: "from-indigo-700 to-violet-400",
      soft: "bg-indigo-50 text-indigo-700",
      label: "Card payment",
    };
  if (value.includes("cash"))
    return {
      icon: <LuBanknote />,
      gradient: "from-amber-600 to-yellow-400",
      soft: "bg-amber-50 text-amber-700",
      label: "Cash payment",
    };
  return {
    icon: <LuCircleDollarSign />,
    gradient: "from-slate-700 to-slate-400",
    soft: "bg-slate-100 text-slate-700",
    label: "Payment method",
  };
};

export default function ServicePaymentMethods() {
  const [methods, setMethods] = useState<Method[]>([]),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Method | null>(null),
    [name, setName] = useState(""),
    [active, setActive] = useState(true),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ paymentMethods: Method[] }>(
        "/service-center/payment-methods",
      );
      setMethods(data.paymentMethods);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load payment methods",
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
      methods.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())),
    [methods, query],
  );
  const uses = (m: Method) =>
    m._count.membershipPayments + m._count.appointments;
  function create(preset = "") {
    setEditing(null);
    setName(preset);
    setActive(true);
    setOpen(true);
    setError("");
  }
  function edit(method: Method) {
    setEditing(method);
    setName(method.name);
    setActive(method.isActive);
    setOpen(true);
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(
        editing
          ? `/service-center/payment-methods/${editing.id}`
          : "/service-center/payment-methods",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({ name, isActive: active }),
        },
      );
      setOpen(false);
      setNotice(
        editing ? "Payment method updated." : "Payment method created.",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save payment method",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(method: Method) {
    try {
      await api(`/service-center/payment-methods/${method.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update payment method",
      );
    }
  }
  async function remove(method: Method) {
    if (!confirm(`Delete ${method.name}?`)) return;
    try {
      await api(`/service-center/payment-methods/${method.id}`, {
        method: "DELETE",
      });
      setNotice("Payment method deleted.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete payment method",
      );
    }
  }
  const unusedPresets = kenyaPresets.filter(
    (preset) =>
      !methods.some((m) => m.name.toLowerCase() === preset.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-[#071a12] via-[#075e39] to-[#e11d48] p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
              <LuShieldCheck /> Kenyan payments
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Accept the way Kenya pays.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Configure trusted payment choices for memberships and service
              appointments.
            </p>
          </div>
          <button
            onClick={() => create()}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-lg"
          >
            <LuPlus /> Add method
          </button>
        </div>
      </header>
      {error && <Message error text={error} />}{" "}
      {notice && <Message text={notice} />}
      {unusedPresets.length > 0 && (
        <section className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick add for Kenya
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unusedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => create(preset)}
                className="rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <LuPlus className="mr-1 inline" />
                {preset}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Payment channels</h2>
            <p className="text-sm text-muted-foreground">
              {methods.filter((m) => m.isActive).length} active ·{" "}
              {methods.reduce((sum, m) => sum + uses(m), 0)} recorded uses
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border bg-card px-3 shadow-sm">
            <LuSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search methods"
              className="h-10 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        {loading ? (
          <div className="p-20 text-center">
            <LuLoaderCircle className="mx-auto animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((method) => {
              const style = styleFor(method.name);
              return (
                <article
                  key={method.id}
                  className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`h-2 bg-linear-to-r ${style.gradient}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style.soft}`}
                      >
                        {style.icon}
                      </span>
                      <button
                        onClick={() => void toggle(method)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${method.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {method.isActive ? (
                          <>
                            <LuCheck className="mr-1 inline" />
                            Active
                          </>
                        ) : (
                          "Inactive"
                        )}
                      </button>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{method.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {style.label}
                    </p>
                    <div className="mt-5 grid grid-cols-2 rounded-xl bg-muted/50 p-3 text-center text-xs">
                      <div>
                        <b className="block text-lg">
                          {method._count.membershipPayments}
                        </b>
                        Payments
                      </div>
                      <div className="border-l">
                        <b className="block text-lg">
                          {method._count.appointments}
                        </b>
                        Appointments
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-1">
                      <button
                        onClick={() => edit(method)}
                        className="rounded-lg p-2 text-secondary hover:bg-muted"
                        aria-label="Edit"
                      >
                        <LuPencil />
                      </button>
                      <button
                        onClick={() => void remove(method)}
                        className="rounded-lg p-2 text-destructive hover:bg-muted disabled:opacity-30"
                        aria-label="Delete"
                        title={
                          uses(method)
                            ? "Deactivate methods with history"
                            : "Delete method"
                        }
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl"
          >
            <p className="text-sm font-bold text-emerald-700">
              {editing ? "Update channel" : "New payment channel"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Payment method</h2>
            <label className="mt-5 block text-sm font-medium">
              Display name
              <input
                autoFocus
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. M-Pesa"
                className="input mt-1.5"
              />
            </label>
            <label className="mt-4 flex items-center justify-between rounded-xl border p-4">
              <span>
                <b className="block text-sm">Available for transactions</b>
                <span className="text-xs text-muted-foreground">
                  Show this method during payments
                </span>
              </span>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-5 w-5"
              />
            </label>
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
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 font-bold text-white"
              >
                {saving && <LuLoaderCircle className="animate-spin" />}
                {editing ? "Save changes" : "Create method"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
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
