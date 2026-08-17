import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LuLoaderCircle, LuTriangleAlert } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ModulePlaceholder from '@/pages/ModulePlaceholder'
import CafeSettings from '@/pages/CafeSettings'
import PointOfSale from '@/pages/PointOfSale'
import Kitchen from '@/pages/Kitchen'
import Reception from '@/pages/Reception'
import Rooms from '@/pages/Rooms'
import Housekeeping from '@/pages/Housekeeping'
import InventoryWorkspace from '@/pages/InventoryWorkspace'
import Products from '@/pages/Products'
import Users from '@/pages/Users'
import BusinessInformation from '@/pages/BusinessInformation'
import Employees from '@/pages/Employees'
import RolesAndPermissions from '@/pages/RolesAndPermissions'
import { navigation } from '@/config/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { restoreSession } from '@/store/authSlice'
import { fetchTenantContext, resolveTenant } from '@/store/tenantSlice'

const moduleRoutes = navigation
  .flatMap((g) => g.items)
  .filter((item) => item.href !== '/')

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, expiresAt } = useAppSelector((s) => s.auth)
  const location = useLocation()
  const isValid = Boolean(user && expiresAt && expiresAt > Date.now())
  if (!isValid) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function App() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const userId = useAppSelector((s) => s.auth.user?.id)
  const { resolved, resolveError } = useAppSelector((s) => s.tenant)

  useEffect(() => {
    void dispatch(resolveTenant())
    // Resolve the workspace (subdomain -> tenant) exactly once, on boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resolved && !resolveError && token) void dispatch(restoreSession())
    // Only validate the persisted session once, right after the workspace resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, resolveError])

  useEffect(() => {
    if (userId) void dispatch(fetchTenantContext())
  }, [dispatch, userId])

  if (!resolved) {
    return (
      <div className="flex h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
        <LuLoaderCircle className="animate-spin" /> Loading workspace…
      </div>
    )
  }

  if (resolveError) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-sm bg-destructive/10 text-destructive">
          <LuTriangleAlert className="size-5" />
        </span>
        <h1 className="font-display text-xl font-semibold text-foreground">Workspace not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{resolveError}</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<CafeSettings />} />
        <Route path="/pos" element={<PointOfSale />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/reservations" element={<Reception />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/housekeeping" element={<Housekeeping />} />
        <Route path="/store" element={<InventoryWorkspace view="stores" />} />
        <Route path="/products" element={<Products />} />
        <Route path="/users" element={<Users />} />
        <Route path="/business-information" element={<BusinessInformation />} />
        <Route path="/team/employees" element={<Employees />} />
        <Route path="/team/roles-permissions" element={<RolesAndPermissions />} />
        {moduleRoutes.map((item) => (
          <Route key={item.href} path={item.href} element={<ModulePlaceholder />} />
        ))}
      </Route>
    </Routes>
  )
}

export default App
