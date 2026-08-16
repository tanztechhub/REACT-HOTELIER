import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

export type BusinessProfile = {
  businessName: string
  businessType: string
  currency: string
  logoUrl: string | null
} | null

export type License = {
  id: string
  licenseKey: string
  licenseStatus: string
  subscriptionPlan: string
  maxBranches: number
  maxUsers: number
  maxDevices: number
  isActive: boolean
} | null

export type TenantState = {
  tenantId: string
  businessProfile: BusinessProfile
  license: License
  loaded: boolean
}

const initialState: TenantState = {
  tenantId: import.meta.env.VITE_TENANT_ID ?? '',
  businessProfile: null,
  license: null,
  loaded: false,
}

export const fetchTenantContext = createAsyncThunk('tenant/fetchContext', async () => {
  const [profileRes, licenseRes] = await Promise.all([
    api<{ profile: BusinessProfile }>('/business-profile'),
    api<{ license: License }>('/tenant/license'),
  ])
  return { businessProfile: profileRes.profile, license: licenseRes.license }
})

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenantContext: (state) => {
      state.businessProfile = null
      state.license = null
      state.loaded = false
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTenantContext.fulfilled, (state, action) => {
      state.businessProfile = action.payload.businessProfile
      state.license = action.payload.license
      state.loaded = true
    })
  },
})

export const { clearTenantContext } = tenantSlice.actions
export default tenantSlice.reducer
