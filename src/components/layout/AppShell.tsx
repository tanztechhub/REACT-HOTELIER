import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'

export default function AppShell() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar />
      <main className="scrollbar-thin flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
