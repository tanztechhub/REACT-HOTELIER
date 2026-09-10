import { useEffect, useState } from 'react'
import { LuLoaderCircle, LuPrinter, LuShare2, LuX } from 'react-icons/lu'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { printReceipt, receiptToText, shareReceipt } from '@/lib/receipt'
import OrderReceipt, { type ReceiptOrder, type ReceiptProfile } from './OrderReceipt'

/**
 * Read-only receipt preview for an order, with Print + Share actions.
 * Fetches the full order so it works from anywhere that only has an id.
 */
export default function ReceiptPreviewModal({
  orderId,
  profile,
  onClose,
}: {
  orderId: string
  profile: ReceiptProfile
  onClose: () => void
}) {
  const toast = useToast()
  const [order, setOrder] = useState<ReceiptOrder | null>(null)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let alive = true
    setOrder(null)
    setError('')
    api<{ order: ReceiptOrder }>(`/pos/orders/${orderId}`)
      .then((r) => { if (alive) setOrder(r.order) })
      .catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : 'Could not load the receipt') })
    return () => { alive = false }
  }, [orderId])

  async function onShare() {
    if (!order || sharing) return
    setSharing(true)
    try {
      // If the backend can mint a public link, include it; otherwise share the
      // text on its own.
      let shareUrl: string | undefined
      try {
        const r = await api<{ url: string }>(`/pos/orders/${order.id}/share`, { method: 'POST', body: '{}' })
        shareUrl = r.url
      } catch { /* endpoint not available — share text only */ }
      await shareReceipt(receiptToText(order, profile, shareUrl))
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not share the receipt')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-sm bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b p-3 print:hidden">
          <button
            onClick={printReceipt}
            disabled={!order}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <LuPrinter className="size-3.5" /> Print
          </button>
          <button
            onClick={onShare}
            disabled={!order || sharing}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50"
          >
            {sharing ? <LuLoaderCircle className="size-3.5 animate-spin" /> : <LuShare2 className="size-3.5" />} Share
          </button>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded-sm p-2 text-muted-foreground hover:bg-muted"><LuX className="size-4" /></button>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-destructive">{error}</div>
        ) : !order ? (
          <div className="flex min-h-40 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading receipt…</div>
        ) : (
          <OrderReceipt order={order} profile={profile} />
        )}
      </div>
    </div>
  )
}
