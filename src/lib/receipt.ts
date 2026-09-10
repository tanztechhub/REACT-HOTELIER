import type { ReceiptOrder, ReceiptProfile } from '@/components/pos/OrderReceipt'

const money = (v: number | string) => `KES ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const RULE = '--------------------------------'

/** The receipt as a plain-text block for a WhatsApp / SMS / share message. */
export function receiptToText(order: ReceiptOrder, profile: ReceiptProfile, shareUrl?: string): string {
  const lines: string[] = []
  lines.push('🧾 RECEIPT', '')
  if (profile?.businessName) lines.push(profile.businessName)
  const place = [profile?.address, profile?.city].filter(Boolean).join(', ')
  if (place) lines.push(place)
  if (profile?.primaryPhone) lines.push(profile.primaryPhone)
  if (profile?.kraPin) lines.push(`PIN: ${profile.kraPin}`)
  lines.push(RULE)

  lines.push(`Order #${order.orderNumber}`)
  lines.push(`Date: ${new Date(order.updatedAt).toLocaleString()}`)
  lines.push(order.table ? `Table: ${order.table.label}` : 'Takeaway')
  lines.push(RULE)

  for (const item of order.items) {
    lines.push(`${item.menuItem.name}${item.variant ? ` (${item.variant.name})` : ''}`)
    lines.push(`  ${item.quantity} x ${money(item.unitPrice)} = ${money(Number(item.unitPrice) * item.quantity)}`)
    for (const a of item.addons) {
      lines.push(`  + ${a.addon.name}  ${money(Number(a.unitPrice) * a.quantity)}`)
    }
  }
  lines.push(RULE)

  const f = order.financials
  lines.push(`Subtotal: ${money(f.subtotal)}`)
  if (f.discount > 0) lines.push(`Discount: -${money(f.discount)}`)
  if (f.taxAmount > 0) lines.push(`Tax: ${money(f.taxAmount)}`)
  lines.push(`TOTAL: ${money(f.total)}`)

  if (order.payments.length > 0) {
    lines.push(RULE)
    for (const p of order.payments) {
      lines.push(`${p.paymentMethod.name}: ${money(p.amount)}${p.reference ? ` (${p.reference})` : ''}`)
    }
  }

  if (shareUrl) {
    lines.push(RULE)
    lines.push('View & download:')
    lines.push(shareUrl)
  }

  return lines.join('\n')
}

/** Open WhatsApp (native share sheet where available) with the receipt text. */
export async function shareReceipt(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
