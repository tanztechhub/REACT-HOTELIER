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
  setSessionSnapshot({ token, userId: user?.id ?? null })
}

syncSessionSnapshot()
store.subscribe(syncSessionSnapshot)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
