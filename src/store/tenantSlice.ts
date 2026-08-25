import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { resolveTenant as resolveTenantRequest } from '@/lib/tenant'
import { applyTheme } from '@/lib/theme'
import { applyBranding } from '@/lib/branding'
import { writeCachedTheme } from '@/lib/themeCache'

export type BusinessProfile = {
  businessName: string
  businessType: string
  currency: string
  logoUrl: string | null
  shortName: string | null
  themeBaseColor: string
  themeAccentColor: string
  themeFont: string
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
  themeBaseColor: string
  themeAccentColor: string
  themeFont: string
  logoUrl: string | null
  shortName: string | null
  businessType: string
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
  themeBaseColor: '#1c74d1',
  themeAccentColor: '#43a047',
  themeFont: 'jost',
  logoUrl: null,
  shortName: null,
  businessType: 'HOTEL',
}

export const resolveTenant = createAsyncThunk('tenant/resolve', async () => {
  const resolved = await resolveTenantRequest()
  const theme = { baseColor: resolved.themeBaseColor, accentColor: resolved.themeAccentColor, font: resolved.themeFont }
  const branding = { logoUrl: resolved.logoUrl, shortName: resolved.shortName, businessType: resolved.businessType }
  applyTheme(theme)
  applyBranding(branding)
  writeCachedTheme(resolved.slug, { ...theme, ...branding })
  return resolved
})

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
    setTenantTheme: (state, action: { payload: { baseColor: string; accentColor: string; font: string } }) => {
      state.themeBaseColor = action.payload.baseColor
      state.themeAccentColor = action.payload.accentColor
      state.themeFont = action.payload.font
    },
    setTenantLogo: (state, action: { payload: string }) => {
      state.logoUrl = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resolveTenant.fulfilled, (state, action) => {
        state.tenantId = action.payload.tenantId
        state.tenantName = action.payload.name
        state.tenantSlug = action.payload.slug
        state.themeBaseColor = action.payload.themeBaseColor
        state.themeAccentColor = action.payload.themeAccentColor
        state.themeFont = action.payload.themeFont
        state.logoUrl = action.payload.logoUrl
        state.shortName = action.payload.shortName
        state.businessType = action.payload.businessType
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

export const { clearTenantContext, setTenantTheme, setTenantLogo } = tenantSlice.actions
export default tenantSlice.reducer
