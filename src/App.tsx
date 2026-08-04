import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ModulePlaceholder from '@/pages/ModulePlaceholder'
import { navigation } from '@/config/navigation'

const moduleRoutes = navigation
  .flatMap((g) => g.items)
  .filter((item) => item.href !== '/')

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        {moduleRoutes.map((item) => (
          <Route key={item.href} path={item.href} element={<ModulePlaceholder />} />
        ))}
      </Route>
    </Routes>
  )
}

export default App
