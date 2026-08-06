import { useState } from 'react'
import { LuCheck, LuClock3, LuCoffee, LuGlassWater, LuUtensilsCrossed } from 'react-icons/lu'

type Order = { id: string; table: string; elapsed: string; drinks: string[]; station: 'Hot' | 'Cold'; status: 'New' | 'Preparing' }

const initialOrders: Order[] = [
  { id: '#1042', table: 'Table 4', elapsed: '2 min ago', station: 'Hot', status: 'New', drinks: ['Cappuccino × 2', 'Masala Tea × 1'] },
  { id: '#1043', table: 'Takeaway', elapsed: '4 min ago', station: 'Cold', status: 'Preparing', drinks: ['Iced Latte × 1', 'Mango Smoothie × 1'] },
  { id: '#1044', table: 'Table 2', elapsed: '6 min ago', station: 'Hot', status: 'New', drinks: ['Vanilla Latte × 1', 'Green Tea × 1'] },
  { id: '#1045', table: 'Table 7', elapsed: '8 min ago', station: 'Cold', status: 'New', drinks: ['Virgin Mojito × 2', 'Fresh Orange Juice × 1'] },
]

const hotDrinks = ['Espresso', 'Americano', 'Cappuccino', 'Caffè Latte', 'Vanilla Latte', 'Mocha', 'Matcha Latte', 'Caramel Macchiato', 'Coconut Latte', 'Masala Tea', 'English Breakfast Tea', 'Earl Grey Tea', 'Green Tea', 'Peppermint Tea', 'Chamomile Tea', 'Ginger Lemon Tea']
const coldDrinks = ['Iced Latte', 'Cold Brew', 'Fresh Lemonade', 'Strawberry Lemonade', 'Passionfruit Lemonade', 'Mint Lemonade', 'Iced Tea', 'Mango Smoothie', 'Fresh Orange Juice', 'Mango Juice', 'Passionfruit Juice', 'Watermelon Juice', 'Apple Juice', 'Virgin Mojito', 'Tropical Sunrise', 'Berry Fizz', 'Cucumber Cooler']

export default function Kitchen() {
  const [orders, setOrders] = useState(initialOrders)
  const [activeStation, setActiveStation] = useState<'All' | 'Hot' | 'Cold'>('All')
  const visibleOrders = activeStation === 'All' ? orders : orders.filter((order) => order.station === activeStation)

  function advanceOrder(id: string) {
    setOrders((current) => current.flatMap((order) => {
      if (order.id !== id) return [order]
      return order.status === 'New' ? [{ ...order, status: 'Preparing' }] : []
    }))
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-secondary">Kitchen & barista</p><h1 className="mt-1 font-display text-2xl font-semibold">Drink preparation board</h1><p className="mt-1 text-sm text-muted-foreground">Orders from Point of Sale arrive here for the team to prepare.</p></div><div className="flex rounded-lg border bg-card p-1">{(['All', 'Hot', 'Cold'] as const).map((station) => <button key={station} onClick={() => setActiveStation(station)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeStation === station ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{station} station</button>)}</div></header>

      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground"><LuClock3 className="size-4" /><span className="text-xs font-medium uppercase tracking-wide">New orders</span></div><p className="mt-2 font-display text-2xl font-semibold">{orders.filter((order) => order.status === 'New').length}</p></div><div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground"><LuCoffee className="size-4" /><span className="text-xs font-medium uppercase tracking-wide">Hot drinks queued</span></div><p className="mt-2 font-display text-2xl font-semibold">{orders.filter((order) => order.station === 'Hot').length}</p></div><div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground"><LuGlassWater className="size-4" /><span className="text-xs font-medium uppercase tracking-wide">Cold drinks queued</span></div><p className="mt-2 font-display text-2xl font-semibold">{orders.filter((order) => order.station === 'Cold').length}</p></div></section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><section><div className="mb-3 flex items-center gap-2"><LuUtensilsCrossed className="text-secondary" /><h2 className="font-semibold">Active orders</h2></div><div className="grid gap-3 sm:grid-cols-2">{visibleOrders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-semibold">{order.id}</p><p className="mt-0.5 text-xs text-muted-foreground">{order.table} · {order.elapsed}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.station === 'Hot' ? 'bg-warning/15 text-warning' : 'bg-secondary/10 text-secondary'}`}>{order.station} drink</span></div><ul className="mt-4 space-y-2 border-y py-3">{order.drinks.map((drink) => <li key={drink} className="text-sm text-foreground">{drink}</li>)}</ul><button onClick={() => advanceOrder(order.id)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${order.status === 'New' ? 'bg-primary text-primary-foreground' : 'bg-success text-success-foreground'}`}>{order.status === 'New' ? 'Start preparing' : <><LuCheck className="size-4" /> Mark ready</>}</button></article>)}{visibleOrders.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No orders at this station.</div>}</div></section>
      <aside className="space-y-4"><DrinkList title="Hot drinks offered" icon={<LuCoffee className="size-4" />} drinks={hotDrinks} tone="warning" /><DrinkList title="Cold drinks offered" icon={<LuGlassWater className="size-4" />} drinks={coldDrinks} tone="secondary" /></aside></div>
    </div>
  )
}

function DrinkList({ title, icon, drinks, tone }: { title: string; icon: React.ReactNode; drinks: string[]; tone: 'warning' | 'secondary' }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className={`flex items-center gap-2 font-semibold ${tone === 'warning' ? 'text-warning' : 'text-secondary'}`}>{icon}{title}</h2><div className="mt-3 flex flex-wrap gap-1.5">{drinks.map((drink) => <span key={drink} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{drink}</span>)}</div></section>
}
