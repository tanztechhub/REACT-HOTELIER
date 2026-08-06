import { useMemo, useState } from 'react'
import { LuCoffee, LuMinus, LuPlus, LuReceiptText, LuTrash2 } from 'react-icons/lu'

type MenuItem = { id: string; name: string; price: number; category: 'Hot drinks' | 'Cold drinks'; description: string }
type CartItem = MenuItem & { quantity: number }

const menuItems: MenuItem[] = [
  { id: 'espresso', name: 'Espresso', price: 2.5, category: 'Hot drinks', description: 'Single espresso shot' },
  { id: 'americano', name: 'Americano', price: 3, category: 'Hot drinks', description: 'Espresso with hot water' },
  { id: 'cappuccino', name: 'Cappuccino', price: 4, category: 'Hot drinks', description: 'Espresso, steamed milk & foam' },
  { id: 'latte', name: 'Caffè Latte', price: 4.5, category: 'Hot drinks', description: 'Espresso with silky steamed milk' },
  { id: 'vanilla-latte', name: 'Vanilla Latte', price: 5, category: 'Hot drinks', description: 'Latte with smooth vanilla syrup' },
  { id: 'mocha', name: 'Mocha', price: 5, category: 'Hot drinks', description: 'Espresso, chocolate and steamed milk' },
  { id: 'matcha-latte', name: 'Matcha Latte', price: 5.5, category: 'Hot drinks', description: 'Ceremonial matcha with steamed milk' },
  { id: 'caramel-macchiato', name: 'Caramel Macchiato', price: 5.5, category: 'Hot drinks', description: 'Vanilla latte with caramel drizzle' },
  { id: 'coconut-latte', name: 'Coconut Latte', price: 5.5, category: 'Hot drinks', description: 'Espresso with creamy coconut milk' },
  { id: 'tea', name: 'Masala Tea', price: 2.5, category: 'Hot drinks', description: 'Spiced black tea with milk' },
  { id: 'english-breakfast', name: 'English Breakfast Tea', price: 2.5, category: 'Hot drinks', description: 'Classic full-bodied black tea' },
  { id: 'earl-grey', name: 'Earl Grey Tea', price: 2.75, category: 'Hot drinks', description: 'Black tea with bright bergamot' },
  { id: 'green-tea', name: 'Green Tea', price: 2.5, category: 'Hot drinks', description: 'Light and refreshing green tea' },
  { id: 'peppermint-tea', name: 'Peppermint Tea', price: 2.5, category: 'Hot drinks', description: 'Naturally caffeine-free herbal infusion' },
  { id: 'chamomile-tea', name: 'Chamomile Tea', price: 2.5, category: 'Hot drinks', description: 'Calming floral herbal infusion' },
  { id: 'ginger-lemon-tea', name: 'Ginger Lemon Tea', price: 3, category: 'Hot drinks', description: 'Warming ginger with fresh lemon' },
  { id: 'iced-latte', name: 'Iced Latte', price: 5, category: 'Cold drinks', description: 'Espresso, milk and ice' },
  { id: 'cold-brew', name: 'Cold Brew', price: 4.5, category: 'Cold drinks', description: 'Slow-steeped chilled coffee' },
  { id: 'lemonade', name: 'Fresh Lemonade', price: 3.5, category: 'Cold drinks', description: 'Fresh lemon, water and ice' },
  { id: 'strawberry-lemonade', name: 'Strawberry Lemonade', price: 4.25, category: 'Cold drinks', description: 'Fresh lemonade with strawberry purée' },
  { id: 'passion-lemonade', name: 'Passionfruit Lemonade', price: 4.25, category: 'Cold drinks', description: 'Tart lemonade with tropical passionfruit' },
  { id: 'mint-lemonade', name: 'Mint Lemonade', price: 4, category: 'Cold drinks', description: 'Fresh lemon, mint and crushed ice' },
  { id: 'iced-tea', name: 'Iced Tea', price: 3.5, category: 'Cold drinks', description: 'Chilled black tea with lemon' },
  { id: 'smoothie', name: 'Mango Smoothie', price: 5.5, category: 'Cold drinks', description: 'Mango, yoghurt and ice' },
  { id: 'orange-juice', name: 'Fresh Orange Juice', price: 4.5, category: 'Cold drinks', description: 'Freshly pressed oranges' },
  { id: 'mango-juice', name: 'Mango Juice', price: 4, category: 'Cold drinks', description: 'Sweet, ripe mango juice' },
  { id: 'passion-juice', name: 'Passionfruit Juice', price: 4, category: 'Cold drinks', description: 'Bright tropical passionfruit juice' },
  { id: 'watermelon-juice', name: 'Watermelon Juice', price: 4, category: 'Cold drinks', description: 'Fresh watermelon served chilled' },
  { id: 'apple-juice', name: 'Apple Juice', price: 3.75, category: 'Cold drinks', description: 'Crisp pressed apple juice' },
  { id: 'virgin-mojito', name: 'Virgin Mojito', price: 5, category: 'Cold drinks', description: 'Lime, mint, soda and crushed ice' },
  { id: 'sunrise-mocktail', name: 'Tropical Sunrise', price: 5.5, category: 'Cold drinks', description: 'Orange, pineapple and grenadine' },
  { id: 'berry-fizz', name: 'Berry Fizz', price: 5.5, category: 'Cold drinks', description: 'Mixed berries, lemon and sparkling water' },
  { id: 'cucumber-cooler', name: 'Cucumber Cooler', price: 5, category: 'Cold drinks', description: 'Cucumber, lime, mint and soda' },
]

const categories = ['All drinks', 'Hot drinks', 'Cold drinks'] as const
const formatKes = (price: number) => `KSh ${(price * 100).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function PointOfSale() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('All drinks')
  const [cart, setCart] = useState<CartItem[]>([])
  const visibleItems = activeCategory === 'All drinks' ? menuItems : menuItems.filter((item) => item.category === activeCategory)
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])

  function addItem(item: MenuItem) {
    setCart((current) => {
      const match = current.find((cartItem) => cartItem.id === item.id)
      return match ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1 }]
    })
  }

  function changeQuantity(id: string, change: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const quantity = item.quantity + change
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  return (
    <div className="mx-auto grid min-h-full max-w-7xl gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-10">
      <section>
        <header className="mb-6"><p className="text-sm font-medium text-secondary">Café point of sale</p><h1 className="mt-1 font-display text-2xl font-semibold">What would the customer like?</h1><p className="mt-1 text-sm text-muted-foreground">Tap an item to add it to this order.</p></header>
        <div className="mb-5 flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`rounded-full px-4 py-2 text-sm font-medium ${activeCategory === category ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-muted'}`}>{category}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <button key={item.id} onClick={() => addItem(item)} className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-secondary hover:shadow-md"><span className={`flex size-9 items-center justify-center rounded-lg ${item.category === 'Hot drinks' ? 'bg-warning/15 text-warning' : 'bg-secondary/10 text-secondary'}`}><LuCoffee className="size-4" /></span><h2 className="mt-4 font-semibold text-foreground">{item.name}</h2><p className="mt-1 min-h-10 text-xs text-muted-foreground">{item.description}</p><div className="mt-4 flex items-center justify-between"><span className="font-semibold text-foreground">{formatKes(item.price)}</span><span className="text-xs font-medium text-secondary opacity-0 transition group-hover:opacity-100">Add to order</span></div></button>)}</div>
      </section>
      <aside className="flex h-fit min-h-105 flex-col rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center gap-2 border-b p-5"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LuReceiptText className="size-4" /></span><div><h2 className="font-semibold">Current order</h2><p className="text-xs text-muted-foreground">Dine in · Table 1</p></div></div><div className="flex-1 p-4">{cart.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-center"><LuCoffee className="size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Your order is empty</p><p className="mt-1 text-xs text-muted-foreground">Choose a hot or cold drink to begin.</p></div> : <div className="space-y-3">{cart.map((item) => <div key={item.id} className="rounded-lg bg-muted/50 p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatKes(item.price)} each</p></div><button onClick={() => changeQuantity(item.id, -item.quantity)} className="text-muted-foreground hover:text-destructive"><LuTrash2 /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.id, -1)} className="rounded border bg-card p-1"><LuMinus className="size-3" /></button><span className="w-5 text-center text-sm font-medium">{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} className="rounded border bg-card p-1"><LuPlus className="size-3" /></button></div><span className="text-sm font-semibold">{formatKes(item.price * item.quantity)}</span></div></div>)}</div>}</div><footer className="border-t p-5"><div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatKes(total)}</span></div><button disabled={cart.length === 0} onClick={() => setCart([])} className="mt-4 w-full rounded-lg bg-secondary py-2.5 text-sm font-medium text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50">Charge {formatKes(total)}</button></footer></aside>
    </div>
  )
}
