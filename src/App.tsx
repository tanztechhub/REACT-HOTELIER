import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { fetchTenantContext } from '@/store/tenantSlice'

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

  useEffect(() => {
    if (token) void dispatch(restoreSession())
    // Only validate the persisted session once, on initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) void dispatch(fetchTenantContext())
  }, [dispatch, userId])

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
