// Resolves which tenant this browser is talking to. In production every
// tenant is served from its own subdomain (<slug>.tanzhotelier.app), so the
// slug comes straight from the URL — no login step, no caching needed, it's
// just re-derived on every load. Local dev has no real subdomains, so it
// falls back to VITE_TENANT_ID from .env (or a ?tenant=<slug> override, also
// handy for testing multiple tenants locally without DNS).
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const devTenantId = import.meta.env.VITE_TENANT_ID ?? ''

export type ResolvedTenant = { tenantId: string; name: string; slug: string }

function slugFromHost(): string | null {
  const params = new URLSearchParams(window.location.search)
  const override = params.get('tenant')
  if (override) return override

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return null
  const labels = host.split('.')
  if (labels.length < 3) return null // no subdomain present
  return labels[0]
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
