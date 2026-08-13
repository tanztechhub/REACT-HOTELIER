const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const tenantId = import.meta.env.VITE_TENANT_ID ?? ''

export function hasApiTenant() {
  return Boolean(tenantId)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!tenantId) throw new Error('VITE_TENANT_ID is not configured. Run the Node seed command, then add its value to REACT/.env.')
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      ...init.headers,
    },
  })
  if (response.status === 204) return undefined as T
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'The request failed')
  return data
}
