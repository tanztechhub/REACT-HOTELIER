import { FONT_OPTIONS } from '@/lib/fonts'

export type TenantTheme = {
  baseColor: string
  accentColor: string
  font: string
}

type Hsl = { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4; break
    }
    h *= 60
  }

  return { h, s: s * 100, l: l * 100 }
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = Math.min(100, Math.max(0, s)) / 100
  const ll = Math.min(100, Math.max(0, l)) / 100

  let r: number
  let g: number
  let b: number

  if (ss === 0) {
    r = g = b = ll
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
    const p = 2 * ll - q
    r = hueToRgb(p, q, hh + 1 / 3)
    g = hueToRgb(p, q, hh)
    b = hueToRgb(p, q, hh - 1 / 3)
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// WCAG relative luminance — used to decide whether a background needs a
// light or dark foreground, rather than hardcoding it per token.
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function foregroundFor(hex: string): string {
  return relativeLuminance(hex) < 0.4 ? '#f7f9fc' : '#0b1220'
}

function shade(base: Hsl, satDelta: number, lightness: number): string {
  return hslToHex({ h: base.h, s: clamp(base.s + satDelta, 0, 100), l: lightness })
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark')
}

function deriveBrandVars(baseColor: string, dark: boolean): Record<string, string> {
  const base = hexToHsl(baseColor)

  const secondary = dark ? shade(base, -9, 51) : baseColor
  const primary = dark ? shade(base, -6, 59) : shade(base, -8, 14)
  const sidebar = dark ? shade(base, -20, 5) : shade(base, -8, 14)
  const sidebarAccent = dark ? shade(base, -26, 13) : shade(base, -12, 30)
  const sidebarBorder = dark ? shade(base, -32, 14) : shade(base, -24, 28)
  const sidebarMuted = dark ? shade(base, -59, 56) : shade(base, -28, 76)
  const ring = dark ? primary : secondary

  return {
    '--secondary': secondary,
    '--secondary-foreground': foregroundFor(secondary),
    '--primary': primary,
    '--primary-foreground': foregroundFor(primary),
    '--sidebar': sidebar,
    '--sidebar-foreground': foregroundFor(sidebar),
    '--sidebar-accent': sidebarAccent,
    '--sidebar-border': sidebarBorder,
    '--sidebar-muted': sidebarMuted,
    '--ring': ring,
  }
}

function deriveAccentVars(accentColor: string): Record<string, string> {
  return {
    '--accent': accentColor,
    '--accent-foreground': foregroundFor(accentColor),
  }
}

const FONT_LINK_ID = 'theme-font-link'

function applyFont(fontKey: string) {
  const option = FONT_OPTIONS.find((f) => f.key === fontKey) ?? FONT_OPTIONS[0]

  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== option.googleFontsUrl) link.href = option.googleFontsUrl

  // Set the plain indirection variable, not --font-sans/--font-display
  // directly — those are @theme inline tokens and Tailwind bakes a literal
  // value straight into consuming utility classes (e.g. .font-display) at
  // build time unless they're declared as a var() reference to something
  // else, which is exactly what --brand-font is for. See index.css.
  document.documentElement.style.setProperty('--brand-font', option.family)
}

// Applies a tenant's theme to the live document via inline styles on <html>.
// Inline style always wins over any stylesheet regardless of cascade order
// or Vite's dev-mode HMR style injection timing, so this is the only
// reliable way to override index.css's static custom properties at runtime.
export function applyTheme(theme: TenantTheme): void {
  const dark = isDarkMode()
  const vars = { ...deriveBrandVars(theme.baseColor, dark), ...deriveAccentVars(theme.accentColor) }
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value)
  }
  applyFont(theme.font)
  applyThemeColor()
}

// Keeps the browser/OS chrome (installed-PWA title bar on desktop, mobile
// browser address bar) a neutral white with dark text, rather than tinting
// it per tenant. The in-app mobile top bar carries the brand colour instead.
function applyThemeColor(): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = '#ffffff'
}
