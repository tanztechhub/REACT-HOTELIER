import type { TenantTheme } from '@/lib/theme'
import type { TenantBranding } from '@/lib/branding'

// Keyed by tenant slug rather than a single flat value: lib/tenant.ts
// supports a ?tenant= override for testing multiple tenants in one browser
// during local dev, so one tenant's cached theme must never leak onto
// another tenant's login page.
const STORAGE_KEY = 'hotelier_theme'

// Despite the "theme" name, this also carries branding (logo/name/business
// type) — both are read/written at the exact same two call sites (main.tsx's
// pre-paint pass, and the resolveTenant thunk) for the same tenant slug, so
// they share one cache entry rather than duplicating the read/write/try-catch
// boilerplate across two parallel localStorage keys.
type CachedEntry = TenantTheme & TenantBranding & { cachedAt: number }
type CachedBySlug = Record<string, CachedEntry>

export function readCachedTheme(slug: string): (TenantTheme & TenantBranding) | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedBySlug
    const entry = parsed[slug]
    if (!entry) return null
    return {
      baseColor: entry.baseColor,
      accentColor: entry.accentColor,
      font: entry.font,
      logoUrl: entry.logoUrl,
      shortName: entry.shortName,
      businessType: entry.businessType,
    }
  } catch {
    return null
  }
}

export function writeCachedTheme(slug: string, data: TenantTheme & TenantBranding): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: CachedBySlug = raw ? (JSON.parse(raw) as CachedBySlug) : {}
    parsed[slug] = { ...data, cachedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // best-effort cache — theme/branding still applies for this session even if persistence fails
  }
}
