import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import UserMenu from '@/components/layout/UserMenu'

export default function AppShell() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center justify-end px-6 pb-2 pt-6 sm:px-8 lg:px-10">
          <UserMenu />
        </header>
        <main className="scrollbar-none flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
