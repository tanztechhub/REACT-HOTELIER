// Resolves which tenant this browser is talking to. In production every
// tenant is served from its own subdomain (<slug>.{VITE_APP_DOMAIN}), so the
// slug comes straight from the URL — no login step, no caching needed, it's
// just re-derived on every load. Anywhere else (localhost, a shared hosting
// domain like *.netlify.app before a custom domain is wired up, preview
// deploys, etc.) falls back to VITE_TENANT_ID from .env — or a ?tenant=<slug>
// override, also handy for testing multiple tenants locally without DNS.
//
// VITE_APP_DOMAIN is deliberately required for slug extraction: a generic
// "3+ labels = subdomain" heuristic would misfire on *.netlify.app (also
// 3 labels) and try to resolve the Netlify site name as a tenant slug.
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const devTenantId = import.meta.env.VITE_TENANT_ID ?? ''
const appDomain = import.meta.env.VITE_APP_DOMAIN ?? ''

export type ResolvedTenant = { tenantId: string; name: string; slug: string }

function slugFromHost(): string | null {
  const params = new URLSearchParams(window.location.search)
  const override = params.get('tenant')
  if (override) return override

  if (!appDomain) return null // no production domain configured yet — always use the fallback
  const host = window.location.hostname
  if (host !== appDomain && !host.endsWith(`.${appDomain}`)) return null
  if (host === appDomain) return null // bare root domain, no tenant subdomain present
  return host.slice(0, -(appDomain.length + 1))
}

export async function resolveTenant(): Promise<ResolvedTenant> {
  const slug = slugFromHost()

  if (!slug) {
    if (!devTenantId) {
      throw new Error('No workspace could be resolved. Set VITE_TENANT_ID in REACT/.env for local development.')
    }
    return { tenantId: devTenantId, name: 'Local Dev Workspace', slug: 'dev' }
  }

  const response = await fetch(`${apiUrl}/tenant/resolve?slug=${encodeURIComponent(slug)}`)
  const data = await response.json() as { tenant?: { id: string; name: string; slug: string }; error?: string }
  if (!response.ok || !data.tenant) {
    throw new Error(data.error ?? 'This workspace could not be found.')
  }
  return { tenantId: data.tenant.id, name: data.tenant.name, slug: data.tenant.slug }
}
