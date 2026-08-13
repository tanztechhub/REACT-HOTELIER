import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import UserMenu from '@/components/layout/UserMenu'

export default function AppShell() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar />
      <main className="scrollbar-none relative min-w-0 flex-1 overflow-y-auto">
        <div className="absolute right-6 top-6 z-30 sm:right-8 lg:right-10">
          <UserMenu />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
