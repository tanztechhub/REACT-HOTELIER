import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import LicenseBanner from '@/components/layout/LicenseBanner'

export default function AppShell() {
  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <LicenseBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="scrollbar-none relative min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
