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
import BusinessInformation from '@/pages/BusinessInformation'
import Employees from '@/pages/Employees'
import Departments from '@/pages/Departments'
import RolesAndPermissions from '@/pages/RolesAndPermissions'
import Categories from '@/pages/Categories'
import Recipes from '@/pages/Recipes'
import MenuAndAddons from '@/pages/MenuAndAddons'
import Tables from '@/pages/Tables'
import Reports from '@/pages/Reports'
import Receipts from '@/pages/Receipts'
import Locations from '@/pages/Locations'
import ThemeCustomizer from '@/pages/ThemeCustomizer'
import Customers from '@/pages/Customers'
import Services from '@/pages/Services'
import UnitsOfMeasure from '@/pages/UnitsOfMeasure'
import Stays from '@/pages/Stays'
import PaymentMethods from '@/pages/PaymentMethods'
import Transactions from '@/pages/Transactions'
import Expenses from '@/pages/Expenses'
import LostAndFound from '@/pages/LostAndFound'
import ProductsPointOfSale from '@/pages/ProductsPointOfSale'
import ServicesPointOfSale from '@/pages/ServicesPointOfSale'
import Assets from '@/pages/Assets'
import StockLedger from '@/pages/StockLedger'
import Suppliers from '@/pages/Suppliers'
import Purchases from '@/pages/Purchases'
import PurchaseRequisitions from '@/pages/PurchaseRequisitions'
import { navigation, sectionForPath, type PermissionSection } from '@/config/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { restoreSession } from '@/store/authSlice'
import { fetchTenantContext, resolveTenant } from '@/store/tenantSlice'

const moduleRoutes = navigation
  .flatMap((g) => g.items)
  .filter((item) => item.href !== '/')

const DEFAULT_SECTIONS: PermissionSection[] = ['OVERVIEW']

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, expiresAt } = useAppSelector((s) => s.auth)
  const location = useLocation()
  const isValid = Boolean(user && expiresAt && expiresAt > Date.now())
  if (!isValid) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

/** Blocks direct navigation to a route whose section isn't in the current
 * user's role — the sidebar already hides these, this stops typing the URL
 * from bypassing that. The Dashboard ("/") is always reachable so there's
 * no possible redirect loop for a role missing OVERVIEW. */
function SectionGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const allowedSections = useAppSelector((s) => s.auth.user?.role?.allowedSections) ?? DEFAULT_SECTIONS
  if (location.pathname === '/') return <>{children}</>
  const section = sectionForPath(location.pathname)
  if (section && !allowedSections.includes(section)) return <Navigate to="/" replace />
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
      <Route element={<ProtectedRoute><SectionGuard><AppShell /></SectionGuard></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<CafeSettings />} />
        <Route path="/pos" element={<PointOfSale />} />
        <Route path="/sales/products-pos" element={<ProductsPointOfSale />} />
        <Route path="/service-center/pos" element={<ServicesPointOfSale />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/reservations" element={<Reception />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/housekeeping/room-management" element={<Rooms />} />
        <Route path="/housekeeping" element={<Housekeeping />} />
        <Route path="/store" element={<InventoryWorkspace />} />
        <Route path="/products" element={<Products />} />
        <Route path="/service-center/products" element={<Products />} />
        <Route path="/inventory/assets" element={<Assets />} />
        <Route path="/inventory/stock-ledger" element={<StockLedger />} />
        <Route path="/inventory/suppliers" element={<Suppliers />} />
        <Route path="/inventory/purchases" element={<Purchases />} />
        <Route path="/inventory/purchase-requisitions" element={<PurchaseRequisitions />} />
        <Route path="/inventory/categories" element={<Categories />} />
        <Route path="/kitchen/recipes" element={<Recipes />} />
        <Route path="/kitchen/menu-addons" element={<MenuAndAddons />} />
        <Route path="/sales/tables" element={<Tables />} />
        <Route path="/sales/receipts" element={<Receipts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/business-information" element={<BusinessInformation />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/appearance" element={<ThemeCustomizer />} />
        <Route path="/reception/customers" element={<Customers />} />
        <Route path="/housekeeping/customers" element={<Customers />} />
        <Route path="/sales/customers" element={<Customers />} />
        <Route path="/service-center/customers" element={<Customers />} />
        <Route path="/reception/services" element={<Services />} />
        <Route path="/service-center/services" element={<Services />} />
        <Route path="/units-of-measure" element={<UnitsOfMeasure />} />
        <Route path="/reception/stays" element={<Stays />} />
        <Route path="/reception/payment-methods" element={<PaymentMethods />} />
        <Route path="/sales/payment-methods" element={<PaymentMethods />} />
        <Route path="/service-center/payment-methods" element={<PaymentMethods />} />
        <Route path="/finance/transactions" element={<Transactions />} />
        <Route path="/finance/expenses" element={<Expenses />} />
        <Route path="/reception/daily-expenses" element={<Expenses />} />
        <Route path="/kitchen/daily-expenses" element={<Expenses />} />
        <Route path="/inventory/daily-expenses" element={<Expenses />} />
        <Route path="/housekeeping/lost-and-found" element={<LostAndFound />} />
        <Route path="/team/employees" element={<Employees />} />
        <Route path="/team/departments" element={<Departments />} />
        <Route path="/team/roles-permissions" element={<RolesAndPermissions />} />
        {moduleRoutes.map((item) => (
          <Route key={item.href} path={item.href} element={<ModulePlaceholder />} />
        ))}
      </Route>
    </Routes>
  )
}

export default App
