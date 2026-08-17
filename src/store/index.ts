import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/authSlice'
import tenantReducer from '@/store/tenantSlice'
import { setSessionSnapshot } from '@/lib/session'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenant: tenantReducer,
  },
})

const syncSessionSnapshot = () => {
  const { token, user } = store.getState().auth
  const { tenantId } = store.getState().tenant
  setSessionSnapshot({ token, userId: user?.id ?? null, tenantId: tenantId || null })
}

syncSessionSnapshot()
store.subscribe(syncSessionSnapshot)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
