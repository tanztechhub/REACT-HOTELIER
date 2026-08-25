import { resolveLogoUrl } from '@/lib/api'

export type TenantBranding = {
  logoUrl: string | null
  shortName: string | null
  businessType: string
}

// Applies branding to DOM surfaces React doesn't render directly — the tab
// title and favicon <link> tags already sitting in index.html. Kept separate
// from theme.ts (CSS custom properties + font <link>) since this is a
// different DOM surface and is also consumed directly by components as data
// (logo <img src>, name text), not only applied imperatively.
export function applyBranding(branding: TenantBranding): void {
  document.title = branding.shortName ?? 'HOTELIER'

  const absoluteLogoUrl = resolveLogoUrl(branding.logoUrl)
  if (!absoluteLogoUrl) return // no custom logo — leave index.html's static defaults alone

  const iconSelectors = ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']
  for (const selector of iconSelectors) {
    document.querySelectorAll<HTMLLinkElement>(selector).forEach((link) => {
      link.href = absoluteLogoUrl
    })
  }
}
