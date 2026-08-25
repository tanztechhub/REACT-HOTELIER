export type ReceiptOrderItem = {
  id: string
  quantity: number
  unitPrice: string
  menuItem: { name: string }
  addons: { id: string; quantity: number; unitPrice: string; addon: { name: string } }[]
}
export type ReceiptPayment = { id: string; paymentMethod: { name: string }; amount: string; reference: string | null; createdAt: string }
export type ReceiptFinancials = { subtotal: number; discount: number; taxRate: number; taxMode: string; taxAmount: number; total: number }
export type ReceiptOrder = {
  id: string
  orderNumber: number
  status: string
  createdAt: string
  servedAt: string | null
  updatedAt: string
  table: { label: string } | null
  items: ReceiptOrderItem[]
  payments: ReceiptPayment[]
  financials: ReceiptFinancials
}
export type ReceiptProfile = { businessName: string; address: string | null; city: string | null; primaryPhone: string | null; kraPin: string | null } | null

const formatKes = (value: number | string) => `KES ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function OrderReceipt({ order, profile }: { order: ReceiptOrder; profile: ReceiptProfile }) {
  return (
    <div className="receipt-print-area mx-auto max-w-xs bg-white p-6 text-[13px] text-black">
      <div className="text-center">
        <p className="font-display text-base font-bold">{profile?.businessName ?? 'Receipt'}</p>
        {(profile?.address || profile?.city) && <p className="text-xs text-gray-600">{[profile?.address, profile?.city].filter(Boolean).join(', ')}</p>}
        {profile?.primaryPhone && <p className="text-xs text-gray-600">{profile.primaryPhone}</p>}
        {profile?.kraPin && <p className="text-xs text-gray-600">PIN: {profile.kraPin}</p>}
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="flex justify-between text-xs">
        <span>Order #{order.orderNumber}</span>
        <span>{new Date(order.updatedAt).toLocaleString()}</span>
      </div>
      <p className="text-xs text-gray-600">{order.table ? `Table: ${order.table.label}` : 'Takeaway'} · {order.status}</p>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between">
              <span>{item.quantity} × {item.menuItem.name}</span>
              <span>{formatKes(Number(item.unitPrice) * item.quantity)}</span>
            </div>
            {item.addons.map((a) => (
              <div key={a.id} className="flex justify-between pl-3 text-[11px] text-gray-600">
                <span>+ {a.addon.name}</span>
                <span>{formatKes(Number(a.unitPrice) * a.quantity)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatKes(order.financials.subtotal)}</span></div>
        {order.financials.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatKes(order.financials.discount)}</span></div>}
        {order.financials.taxRate > 0 && <div className="flex justify-between"><span>Tax ({order.financials.taxRate}% {order.financials.taxMode === 'EXCLUSIVE' ? 'excl.' : 'incl.'})</span><span>{formatKes(order.financials.taxAmount)}</span></div>}
        <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-bold"><span>Total</span><span>{formatKes(order.financials.total)}</span></div>
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Payments</p>
        {order.payments.length === 0 ? (
          <p className="text-xs text-gray-500">No payment recorded yet.</p>
        ) : order.payments.map((p) => (
          <div key={p.id} className="flex justify-between text-xs">
            <span>{p.paymentMethod.name}{p.reference ? ` (${p.reference})` : ''}</span>
            <span>{formatKes(p.amount)}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-gray-500">Thank you for your visit!</p>
    </div>
  )
}
