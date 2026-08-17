import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { resolveTenant as resolveTenantRequest } from '@/lib/tenant'

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
  tenantName: string
  tenantSlug: string
  resolved: boolean
  resolveError: string | null
  businessProfile: BusinessProfile
  license: License
  loaded: boolean
}

const initialState: TenantState = {
  tenantId: '',
  tenantName: '',
  tenantSlug: '',
  resolved: false,
  resolveError: null,
  businessProfile: null,
  license: null,
  loaded: false,
}

export const resolveTenant = createAsyncThunk('tenant/resolve', async () => resolveTenantRequest())

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
    builder
      .addCase(resolveTenant.fulfilled, (state, action) => {
        state.tenantId = action.payload.tenantId
        state.tenantName = action.payload.name
        state.tenantSlug = action.payload.slug
        state.resolved = true
        state.resolveError = null
      })
      .addCase(resolveTenant.rejected, (state, action) => {
        state.resolved = true
        state.resolveError = action.error.message ?? 'This workspace could not be found.'
      })
      .addCase(fetchTenantContext.fulfilled, (state, action) => {
        state.businessProfile = action.payload.businessProfile
        state.license = action.payload.license
        state.loaded = true
      })
  },
})

export const { clearTenantContext } = tenantSlice.actions
export default tenantSlice.reducer
