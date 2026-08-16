import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  LuBedDouble,
  LuCalendarCheck,
  LuCircleAlert,
  LuCheck,
  LuHotel,
  LuLoaderCircle,
  LuPlus,
  LuUsers,
} from "react-icons/lu";
import { api } from "@/lib/api";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};
type Room = {
  id: string;
  number: string;
  name: string | null;
  type: string;
  capacity: number;
  nightlyRate: string | number;
  status: string;
  cleanliness: string;
};
type Reservation = {
  id: string;
  checkIn: string;
  checkOut: string;
  status: "BOOKED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
  customer: Customer;
  room: Room;
};
const date = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export default function Reception() {
  const [customers, setCustomers] = useState<Customer[]>([]),
    [rooms, setRooms] = useState<Room[]>([]),
    [bookings, setBookings] = useState<Reservation[]>([]);
  const [guest, setGuest] = useState({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    }),
    [booking, setBooking] = useState({
      customerId: "",
      roomId: "",
      checkIn: date(),
      checkOut: date(1),
      adults: "1",
      children: "0",
    });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState("");
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [c, r, b] = await Promise.all([
        api<{ customers: Customer[] }>("/reception/customers"),
        api<{ rooms: Room[] }>("/rooms/rooms"),
        api<{ reservations: Reservation[] }>("/reception/reservations"),
      ]);
      setCustomers(c.customers);
      setRooms(r.rooms);
      setBookings(b.reservations);
      setBooking((x) => ({
        ...x,
        customerId: x.customerId || c.customers[0]?.id || "",
        roomId: r.rooms.some(
          (y) =>
            y.id === x.roomId &&
            y.status === "VACANT" &&
            y.cleanliness === "CLEAN",
        )
          ? x.roomId
          : r.rooms.find(
              (y) => y.status === "VACANT" && y.cleanliness === "CLEAN",
            )?.id || "",
      }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Reception");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10000);
    return () => window.clearInterval(timer);
  }, [load]);
  const available = rooms.filter(
    (r) => r.status === "VACANT" && r.cleanliness === "CLEAN",
  );
  const selectedRoom = rooms.find((room) => room.id === booking.roomId);
  async function addGuest(e: FormEvent) {
    e.preventDefault();
    try {
      const x = await api<{ customer: Customer }>("/reception/customers", {
        method: "POST",
        body: JSON.stringify({
          ...guest,
          email: guest.email || undefined,
          phone: guest.phone || undefined,
        }),
      });
      setGuest({ firstName: "", lastName: "", phone: "", email: "" });
      setBooking((b) => ({ ...b, customerId: x.customer.id }));
      setNotice("Guest profile created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create guest");
    }
  }
  async function addBooking(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/reception/reservations", {
        method: "POST",
        body: JSON.stringify({
          ...booking,
          adults: Number(booking.adults),
          children: Number(booking.children),
        }),
      });
      setNotice("Reservation created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create reservation");
    }
  }
  async function status(x: Reservation, next: Reservation["status"]) {
    setWorking(x.id);
    try {
      await api(`/reception/reservations/${x.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setNotice(
        next === "CHECKED_IN"
          ? `Room ${x.room.number}: guest checked in.`
          : `Room ${x.room.number}: checked out and sent to Housekeeping.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reservation");
    } finally {
      setWorking("");
    }
  }
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="relative overflow-hidden rounded-sm bg-linear-to-r from-primary to-secondary p-7 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">
          Front desk
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          A warmer welcome starts here.
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Guests, reservations, room availability, and housekeeping readiness in
          real time.
        </p>
      </header>
      {error && <Msg error text={error} />} {notice && <Msg text={notice} />}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<LuBedDouble />}
          label="Ready rooms"
          value={available.length}
        />
        <Stat
          icon={<LuUsers />}
          label="Guests in house"
          value={bookings.filter((b) => b.status === "CHECKED_IN").length}
        />
        <Stat
          icon={<LuCalendarCheck />}
          label="Upcoming"
          value={bookings.filter((b) => b.status === "BOOKED").length}
        />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-sm border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-display text-xl font-semibold">Reservations</h2>
            <p className="text-sm text-muted-foreground">
              Check guests in and release rooms after departure.
            </p>
          </div>
          {loading ? (
            <div className="p-16 text-center">
              <LuLoaderCircle className="mx-auto animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Guest</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3">Stay</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-5 py-4 font-semibold">
                        {b.customer.firstName} {b.customer.lastName}
                      </td>
                      <td className="px-5 py-4">
                        {b.room.number} · {b.room.type}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {new Date(b.checkIn).toLocaleDateString()} –{" "}
                        {new Date(b.checkOut).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-bold text-secondary">
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {b.status === "BOOKED" ? (
                          <button
                            onClick={() => void status(b, "CHECKED_IN")}
                            className="rounded-sm bg-primary px-3 py-2 text-xs font-bold text-white"
                          >
                            Check in
                          </button>
                        ) : b.status === "CHECKED_IN" ? (
                          <button
                            onClick={() => void status(b, "CHECKED_OUT")}
                            className="rounded-sm bg-success px-3 py-2 text-xs font-bold text-white"
                          >
                            {working === b.id ? "Updating…" : "Check out"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <form
            onSubmit={addGuest}
            className="rounded-sm border bg-card p-5 shadow-sm"
          >
            <h2 className="font-semibold">New guest</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <input
                required
                className="input"
                placeholder="First name"
                value={guest.firstName}
                onChange={(e) =>
                  setGuest({ ...guest, firstName: e.target.value })
                }
              />
              <input
                required
                className="input"
                placeholder="Last name"
                value={guest.lastName}
                onChange={(e) =>
                  setGuest({ ...guest, lastName: e.target.value })
                }
              />
              <input
                className="input col-span-2"
                placeholder="Phone"
                value={guest.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
              />
              <input
                type="email"
                className="input col-span-2"
                placeholder="Email"
                value={guest.email}
                onChange={(e) => setGuest({ ...guest, email: e.target.value })}
              />
            </div>
            <button className="mt-3 flex w-full justify-center gap-2 rounded-sm border py-2.5 text-sm font-bold">
              <LuPlus /> Save guest
            </button>
          </form>
          <form
            onSubmit={addBooking}
            className="rounded-sm border bg-card p-5 shadow-sm"
          >
            <h2 className="font-semibold">New reservation</h2>
            <div className="mt-4 space-y-2">
              <select
                required
                className="input"
                value={booking.customerId}
                onChange={(e) =>
                  setBooking({ ...booking, customerId: e.target.value })
                }
              >
                <option value="">Select guest</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
              <select
                required
                className="input"
                value={booking.roomId}
                onChange={(e) =>
                  setBooking({ ...booking, roomId: e.target.value })
                }
              >
                <option value="">
                  Select a room created in Room Operations
                </option>
                <optgroup label="Ready to occupy">
                  {available.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.number}
                      {room.name ? ` — ${room.name}` : ""} · {room.type} ·{" "}
                      {room.capacity} guests · KSh{" "}
                      {Number(room.nightlyRate).toLocaleString("en-KE")}
                    </option>
                  ))}
                </optgroup>
                {rooms.length > available.length && (
                  <optgroup label="Currently unavailable">
                    {rooms
                      .filter(
                        (room) =>
                          !available.some((ready) => ready.id === room.id),
                      )
                      .map((room) => (
                        <option key={room.id} value={room.id} disabled>
                          Room {room.number}
                          {room.name ? ` — ${room.name}` : ""} ·{" "}
                          {room.status.replaceAll("_", " ").toLowerCase()} ·{" "}
                          {room.cleanliness.toLowerCase()}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {selectedRoom && (
                <div className="rounded-sm border border-secondary/20 bg-secondary/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Room {selectedRoom.number} · {selectedRoom.type}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedRoom.capacity} guests
                        {selectedRoom.name ? ` · ${selectedRoom.name}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-secondary">
                      KSh{" "}
                      {Number(selectedRoom.nightlyRate).toLocaleString("en-KE")}
                    </p>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
                    <LuCheck /> Clean, vacant, and ready to occupy
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  className="input"
                  value={booking.checkIn}
                  onChange={(e) =>
                    setBooking({ ...booking, checkIn: e.target.value })
                  }
                />
                <input
                  type="date"
                  required
                  className="input"
                  value={booking.checkOut}
                  onChange={(e) =>
                    setBooking({ ...booking, checkOut: e.target.value })
                  }
                />
              </div>
            </div>
            <button
              disabled={!available.length}
              className="mt-3 flex w-full justify-center gap-2 rounded-sm bg-secondary py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <LuHotel /> Create booking
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-sm border bg-card p-5 shadow-sm">
      <div className="flex justify-between text-secondary">
        <span className="text-xs font-bold uppercase text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
function Msg({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={`mt-5 flex items-center gap-2 rounded-sm p-3 text-sm ${error ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
    >
      {error ? <LuCircleAlert /> : <LuCheck />}
      {text}
    </div>
  );
}
