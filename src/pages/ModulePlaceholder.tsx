import { useLocation } from 'react-router-dom'
import { LuHammer } from 'react-icons/lu'
import { navigation } from '@/config/navigation'

export default function ModulePlaceholder() {
  const { pathname } = useLocation()
  const current = navigation.flatMap((g) => g.items).find((i) => i.href === pathname)

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-sm bg-secondary/10 text-secondary">
        <LuHammer className="size-5" />
      </span>
      <h1 className="font-display text-xl font-semibold text-foreground">
        {current?.label ?? 'Module'}
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This module is scaffolded and ready to be built out.
      </p>
    </div>
  )
}
