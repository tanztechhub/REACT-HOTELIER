import { getSessionSnapshot } from '@/lib/session'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export function hasApiTenant() {
  return Boolean(getSessionSnapshot().tenantId)
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token, userId, tenantId } = getSessionSnapshot()
  if (!tenantId) throw new Error('Workspace not resolved yet.')
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (response.status === 204) return undefined as T
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'The request failed')
  return data
}
