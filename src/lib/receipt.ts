import type { ReceiptOrder, ReceiptProfile } from '@/components/pos/OrderReceipt'

const WIDTH_KEY = 'hotelier.receiptWidth'
export type ReceiptWidth = '58mm' | '80mm'

export function getReceiptWidth(): ReceiptWidth {
  try {
    const v = localStorage.getItem(WIDTH_KEY)
    if (v === '58mm' || v === '80mm') return v
  } catch { /* private mode / blocked storage */ }
  return '80mm'
}

export function setReceiptWidth(width: ReceiptWidth): void {
  try { localStorage.setItem(WIDTH_KEY, width) } catch { /* ignore */ }
}

/**
 * Print whatever is inside `.receipt-print-area` on a thermal roll. The
 * `@media print` rules in index.css isolate that element; this just injects a
 * matching `@page` size for the configured paper width, prints, and cleans up.
 * (A silent Bluetooth/USB ESC-POS path can be added later behind the same call.)
 */
export function printReceipt(): void {
  const width = getReceiptWidth()
  const style = document.createElement('style')
  style.id = '__receipt_page_size'
  style.textContent = `@media print{@page{size:${width} auto;margin:3mm}}`
  document.head.appendChild(style)

  const cleanup = () => {
    style.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(cleanup, 2000) // Safari fires no afterprint

  window.print()
}

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
    const name = `${item.menuItem.name}${item.variant ? ` (${item.variant.name})` : ''}`
    lines.push(name)
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
      // AbortError = user dismissed the sheet; anything else falls through to wa.me
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
