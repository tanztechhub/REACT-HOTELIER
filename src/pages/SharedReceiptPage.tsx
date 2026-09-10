import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LuLoaderCircle, LuPrinter } from 'react-icons/lu'
import { apiOrigin } from '@/lib/api'
import { printReceipt } from '@/lib/thermalPrinter'
import OrderReceipt, { type ReceiptOrder, type ReceiptProfile } from '@/components/pos/OrderReceipt'

/** Public, no-auth receipt page reached from a Share link (`/r/:token`). */
export default function SharedReceiptPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<{ order: ReceiptOrder; profile: ReceiptProfile } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch(`${apiOrigin}/public/receipts/${token}`)
      .then(async (r) => {
        const body = (await r.json()) as { order: ReceiptOrder; profile: ReceiptProfile; error?: string }
        if (!r.ok) throw new Error(body.error ?? 'Receipt not found')
        if (alive) setData({ order: body.order, profile: body.profile })
      })
      .catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : 'Receipt not found') })
    return () => { alive = false }
  }, [token])

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-8">
      {error ? (
        <p className="mt-16 text-sm text-muted-foreground">{error}</p>
      ) : !data ? (
        <p className="mt-16 flex items-center gap-2 text-sm text-muted-foreground"><LuLoaderCircle className="animate-spin" /> Loading receipt…</p>
      ) : (
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-sm border bg-card shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <OrderReceipt order={data.order} profile={data.profile} />
          </div>
          <div className="border-t p-3 print:hidden">
            <button onClick={() => { void printReceipt() }} className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground">
              <LuPrinter className="size-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
