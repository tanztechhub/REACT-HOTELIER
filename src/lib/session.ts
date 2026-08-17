// Leaf module holding the current session snapshot, so that api.ts can read
// the active auth token and resolved tenant without importing the Redux
// store directly (which would create a circular import: store -> authSlice
// / tenantSlice -> api -> store).
type SessionSnapshot = { token: string | null; userId: string | null; tenantId: string | null }

let current: SessionSnapshot = { token: null, userId: null, tenantId: null }

export function setSessionSnapshot(snapshot: SessionSnapshot) {
  current = snapshot
}

export function getSessionSnapshot(): SessionSnapshot {
  return current
}
