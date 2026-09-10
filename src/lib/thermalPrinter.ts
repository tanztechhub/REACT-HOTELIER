import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { ReceiptOrder, ReceiptProfile } from '@/components/pos/OrderReceipt'

/**
 * Direct ESC/POS thermal printing from the browser.
 *
 * A PWA can't reach a printer that Windows installed with its own driver
 * (that's what an Electron app talks to) — the OS driver holds the device.
 * What it CAN do: talk to a USB or Bluetooth thermal printer directly over
 * WebUSB / Web Bluetooth (Chrome/Edge, one-time permission). When that isn't
 * set up, we fall back to the browser print dialog with an 80mm page.
 */

const KEY = 'hotelier.thermal'

export type ThermalConnection = 'usb' | 'bluetooth' | 'dialog'

export type ThermalSettings = {
  enabled: boolean
  connection: ThermalConnection
  /** encoder printerModel preset, or 'generic' */
  model: string
  /** informational label / the name Windows shows (not used to route USB) */
  address: string
  /** characters per line */
  columns: number
  autoPrint: boolean
}

export const PRINTER_MODELS: { value: string; label: string }[] = [
  { value: 'generic', label: 'Custom / Generic ESC-POS' },
  { value: 'epson-tm-t88iv', label: 'Epson TM-T88 series' },
  { value: 'epson-tm-t20iii', label: 'Epson TM-T20 series' },
  { value: 'epson-tm-m30', label: 'Epson TM-m30' },
  { value: 'star-tsp650', label: 'Star TSP650' },
  { value: 'star-mc-print3', label: 'Star mC-Print3' },
  { value: 'bixolon-srp-350iii', label: 'Bixolon SRP-350' },
]

const DEFAULTS: ThermalSettings = {
  enabled: true,
  connection: 'usb',
  model: 'generic',
  address: '',
  columns: 48,
  autoPrint: true,
}

export function getThermalSettings(): ThermalSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ThermalSettings>) }
  } catch { /* private mode */ }
  return { ...DEFAULTS }
}

export function saveThermalSettings(patch: Partial<ThermalSettings>): ThermalSettings {
  const next = { ...getThermalSettings(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

export const webUsbAvailable = () => typeof navigator !== 'undefined' && 'usb' in navigator
export const webBluetoothAvailable = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator

// ---------------------------------------------------------------- USB

export async function pairUsbPrinter(): Promise<string> {
  if (!webUsbAvailable()) throw new Error('This browser has no USB access — use Chrome or Edge.')
  const device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }, {}] })
  return device.productName || `USB ${device.vendorId.toString(16)}:${device.productId.toString(16)}`
}

async function openUsbEndpoint() {
  const device = (await navigator.usb.getDevices())[0]
  if (!device) throw new Error('No USB printer connected. Open Settings → Receipt printer to connect one.')
  await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)
  for (const cfg of device.configurations) {
    for (const iface of cfg.interfaces) {
      for (const alt of iface.alternates) {
        const out = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')
        if (!out) continue
        try {
          await device.claimInterface(iface.interfaceNumber)
        } catch {
          throw new Error('Windows is holding this printer through its driver, so the browser can’t use it. Set Connection type to "Browser print dialog", or use a driverless/WinUSB setup.')
        }
        return { device, endpoint: out.endpointNumber, iface: iface.interfaceNumber }
      }
    }
  }
  throw new Error('That USB device has no printable interface.')
}

async function sendUsb(bytes: Uint8Array): Promise<void> {
  const { device, endpoint, iface } = await openUsbEndpoint()
  try {
    // some stacks choke on a single large transfer — chunk it
    for (let i = 0; i < bytes.length; i += 4096) {
      await device.transferOut(endpoint, bytes.slice(i, i + 4096))
    }
  } finally {
    try { await device.releaseInterface(iface) } catch { /* ignore */ }
    try { await device.close() } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------- Bluetooth

// The de-facto "serial over BLE" service cheap thermal printers expose.
const BT_SERVICE = 0x18f0
const BT_CHARACTERISTIC = 0x2af1
let btChar: BluetoothRemoteGATTCharacteristic | null = null

export async function pairBluetoothPrinter(): Promise<string> {
  if (!webBluetoothAvailable()) throw new Error('This browser has no Bluetooth access.')
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BT_SERVICE] }],
    optionalServices: [BT_SERVICE],
  })
  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService(BT_SERVICE)
  btChar = await service.getCharacteristic(BT_CHARACTERISTIC)
  return device.name || 'Bluetooth printer'
}

async function sendBluetooth(bytes: Uint8Array): Promise<void> {
  if (!btChar || !btChar.service.device.gatt?.connected) await pairBluetoothPrinter()
  if (!btChar) throw new Error('No Bluetooth printer connected.')
  for (let i = 0; i < bytes.length; i += 180) {
    await btChar.writeValueWithoutResponse(bytes.slice(i, i + 180) as unknown as BufferSource)
    await new Promise((r) => setTimeout(r, 20))
  }
}

// ---------------------------------------------------------------- receipt bytes

const money = (v: number | string) => `KES ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function buildReceiptBytes(order: ReceiptOrder, profile: ReceiptProfile, s: ThermalSettings): Uint8Array {
  const cols = Math.max(24, Math.min(64, Math.round(s.columns) || 48))
  const e = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    columns: cols,
    feedBeforeCut: 4,
    ...(s.model && s.model !== 'generic' ? { printerModel: s.model } : {}),
  })
  e.initialize().codepage('cp437')

  const priceW = 12
  const nameW = cols - priceW - 1
  const row = (l: string, r: string) => e.table([{ width: nameW, align: 'left' }, { width: priceW, align: 'right' }], [[l, r]])

  e.align('center')
  if (profile?.businessName) e.bold(true).line(profile.businessName).bold(false)
  const place = [profile?.address, profile?.city].filter(Boolean).join(', ')
  if (place) e.line(place)
  if (profile?.primaryPhone) e.line(profile.primaryPhone)
  if (profile?.kraPin) e.line(`PIN: ${profile.kraPin}`)
  e.align('left').rule()

  e.line(`Order #${order.orderNumber}`)
  e.line(new Date(order.updatedAt).toLocaleString())
  e.line(order.table ? `Table: ${order.table.label}` : 'Takeaway')
  e.rule()

  for (const item of order.items) {
    row(`${item.quantity} x ${item.menuItem.name}${item.variant ? ` (${item.variant.name})` : ''}`, money(Number(item.unitPrice) * item.quantity))
    for (const a of item.addons) row(`  + ${a.addon.name}`, money(Number(a.unitPrice) * a.quantity))
  }
  e.rule()

  const f = order.financials
  row('Subtotal', money(f.subtotal))
  if (f.discount > 0) row('Discount', `-${money(f.discount)}`)
  if (f.taxAmount > 0) row('Tax', money(f.taxAmount))
  e.bold(true)
  row('TOTAL', money(f.total))
  e.bold(false)

  if (order.payments.length > 0) {
    e.rule()
    for (const p of order.payments) row(p.paymentMethod.name, money(p.amount))
  }

  e.newline(2).align('center').line('Thank you').newline(4).cut()
  return e.encode()
}

// ---------------------------------------------------------------- dialog fallback

export function printViaDialog(): void {
  const width = getThermalSettings().columns <= 35 ? '58mm' : '80mm'
  const style = document.createElement('style')
  style.textContent = `@media print{@page{size:${width} auto;margin:3mm}}`
  document.head.appendChild(style)
  const cleanup = () => { style.remove(); window.removeEventListener('afterprint', cleanup) }
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(cleanup, 2000)
  window.print()
}

// ---------------------------------------------------------------- orchestrator

export type PrintResult = { method: 'thermal' | 'dialog' }

/**
 * Print a receipt. With a thermal printer configured, sends ESC/POS straight
 * to it and resolves `{ method: 'thermal' }` (no dialog). Otherwise opens the
 * browser print sheet. A thermal-send failure rejects so the caller can show
 * it rather than silently falling back.
 *
 * `order` may be omitted (e.g. the existing DOM-only Print buttons): then it
 * always uses the dialog, which prints whatever `.receipt-print-area` holds.
 */
export async function printReceipt(order?: ReceiptOrder | null, profile?: ReceiptProfile): Promise<PrintResult> {
  const s = getThermalSettings()

  if (!s.enabled || s.connection === 'dialog' || !order) {
    printViaDialog()
    return { method: 'dialog' }
  }

  const bytes = buildReceiptBytes(order, profile ?? null, s)
  if (s.connection === 'bluetooth') await sendBluetooth(bytes)
  else await sendUsb(bytes)
  return { method: 'thermal' }
}
