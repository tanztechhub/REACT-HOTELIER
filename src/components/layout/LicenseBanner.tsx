import { LuTriangleAlert } from 'react-icons/lu'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

// Soft license enforcement: nag, never block. The data is already fetched
// into Redux post-login (tenantSlice.ts's fetchTenantContext -> GET
// /tenant/license), so this needs no backend change of its own — it just
// reads state that already exists. Deliberately has no dismiss button: a
// suspended/expired workspace should keep seeing this on every page until
// the underlying license is actually fixed, not hidden after one click.
export default function LicenseBanner() {
  const license = useAppSelector((s) => s.tenant.license)
  if (!license || license.licenseStatus === 'ACTIVE' || license.licenseStatus === 'TRIAL') return null

  const isSuspended = license.licenseStatus === 'SUSPENDED'
  const message = isSuspended
    ? "This workspace has been suspended. Contact TANZ immediately to restore full service."
    : "This workspace's subscription has expired. Contact TANZ to renew and avoid service interruption."

  return (
    <div className={cn('flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold', isSuspended ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground')}>
      <LuTriangleAlert className="size-4 shrink-0" />
      {message}
    </div>
  )
}
