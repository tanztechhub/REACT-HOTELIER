import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ModulePlaceholder from '@/pages/ModulePlaceholder'
import CafeSettings from '@/pages/CafeSettings'
import PointOfSale from '@/pages/PointOfSale'
import Kitchen from '@/pages/Kitchen'
import Reception from '@/pages/Reception'
import Rooms from '@/pages/Rooms'
import Housekeeping from '@/pages/Housekeeping'
import { navigation } from '@/config/navigation'

const moduleRoutes = navigation
  .flatMap((g) => g.items)
  .filter((item) => item.href !== '/')

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<CafeSettings />} />
        <Route path="/pos" element={<PointOfSale />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/reservations" element={<Reception />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/housekeeping" element={<Housekeeping />} />
        {moduleRoutes.map((item) => (
          <Route key={item.href} path={item.href} element={<ModulePlaceholder />} />
        ))}
      </Route>
    </Routes>
  )
}

export default App
