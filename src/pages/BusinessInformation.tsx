import { useEffect, useState, type ReactNode } from 'react'
import type { FormEvent } from 'react'
import { LuCircleAlert, LuImagePlus, LuLoaderCircle, LuUpload } from 'react-icons/lu'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

const businessTypes = ['RESTAURANT', 'CAFE', 'HOTEL', 'MOTEL'] as const
const currencies = ['KES', 'UGX', 'TZS', 'USD'] as const
const taxModes = ['INCLUSIVE', 'EXCLUSIVE'] as const

type BusinessType = (typeof businessTypes)[number]
type Currency = (typeof currencies)[number]
type TaxMode = (typeof taxModes)[number]

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()
const currencyLabels: Record<Currency, string> = {
  KES: 'KES — Kenyan Shilling',
  UGX: 'UGX — Ugandan Shilling',
  TZS: 'TZS — Tanzanian Shilling',
  USD: 'USD — US Dollar',
}
const taxModeLabels: Record<TaxMode, string> = {
  EXCLUSIVE: 'Exclusive — tax added at checkout',
  INCLUSIVE: 'Inclusive — prices already include tax',
}

type BusinessProfile = {
  logoUrl: string | null
  businessName: string
  businessType: BusinessType
  currency: Currency
  registrationNumber: string | null
  kraPin: string | null
  taxRate: string | null
  taxMode: TaxMode
  primaryPhone: string | null
  alternativePhone: string | null
  email: string | null
  website: string | null
  country: string | null
  county: string | null
  city: string | null
  address: string | null
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
}

type ProfileForm = {
  businessName: string
  businessType: BusinessType | ''
  currency: Currency | ''
  registrationNumber: string
  kraPin: string
  taxRate: string
  taxMode: TaxMode
  primaryPhone: string
  alternativePhone: string
  email: string
  website: string
  country: string
  county: string
  city: string
  address: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
}

const emptyForm: ProfileForm = {
  businessName: '', businessType: '', currency: '', registrationNumber: '', kraPin: '',
  taxRate: '16', taxMode: 'INCLUSIVE',
  primaryPhone: '', alternativePhone: '', email: '', website: '',
  country: '', county: '', city: '', address: '',
  ownerName: '', ownerPhone: '', ownerEmail: '',
}

function formFromProfile(profile: BusinessProfile): ProfileForm {
  return {
    businessName: profile.businessName,
    businessType: profile.businessType,
    currency: profile.currency,
    registrationNumber: profile.registrationNumber ?? '',
    kraPin: profile.kraPin ?? '',
    taxRate: profile.taxRate ?? '16',
    taxMode: profile.taxMode,
    primaryPhone: profile.primaryPhone ?? '',
    alternativePhone: profile.alternativePhone ?? '',
    email: profile.email ?? '',
    website: profile.website ?? '',
    country: profile.country ?? '',
    county: profile.county ?? '',
    city: profile.city ?? '',
    address: profile.address ?? '',
    ownerName: profile.ownerName ?? '',
    ownerPhone: profile.ownerPhone ?? '',
    ownerEmail: profile.ownerEmail ?? '',
  }
}

export default function BusinessInformation() {
  const toast = useToast()
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await api<{ profile: BusinessProfile | null }>('/business-profile')
        if (!cancelled && response.profile) setForm(formFromProfile(response.profile))
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not load business information'
        if (!cancelled) { setError(message); toast.error(message) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [toast])

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api('/business-profile', { method: 'PUT', body: JSON.stringify(form) })
      setNotice('Business information saved.')
      toast.success('Business information saved.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save business information'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LuLoaderCircle className="animate-spin" /> Loading business information…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <header>
        <p className="text-sm font-semibold text-secondary">System</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Business Information</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your business profile, tax settings, and contact details.</p>
      </header>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-sm border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <LuCircleAlert />
          {error}
        </div>
      )}
      <div className="relative mt-6">
        <StampBadge />
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-sm border bg-card shadow-sm">
          <Section title="Logo" description="Shown across invoices, receipts, and the sidebar." first>
            <div className="flex items-center gap-5">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-dashed border-border bg-muted/40">
                {logoPreview ? (
                  <img src={logoPreview} alt="Business logo preview" className="size-full object-cover" />
                ) : (
                  <LuImagePlus className="size-7 text-muted-foreground" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 rounded-sm border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  <LuUpload className="size-4" />
                  Upload logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, square image recommended.</p>
              </div>
            </div>
          </Section>

          <Section title="General">
            <Field label="Business Name" required className="sm:col-span-2">
              <input required className="input" placeholder="e.g. Grand Palace Hotel" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
            </Field>
            <Field label="Business Type" required>
              <select required className="input" value={form.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)}>
                <option value="" disabled>Select business type</option>
                {businessTypes.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
            </Field>
            <Field label="Currency" required>
              <select required className="input" value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
                <option value="" disabled>Select currency</option>
                {currencies.map((c) => <option key={c} value={c}>{currencyLabels[c]}</option>)}
              </select>
            </Field>
            <Field label="Business Registration Number">
              <input className="input" placeholder="e.g. BN-2024-104567" value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
            </Field>
            <Field label="KRA PIN">
              <input className="input" placeholder="e.g. P051234567X" value={form.kraPin} onChange={(e) => set('kraPin', e.target.value)} />
            </Field>
          </Section>

          <Section title="Tax Settings">
            <Field label="Tax Rate %">
              <input type="number" min="0" max="100" step="0.1" className="input" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
            </Field>
            <Field label="Tax Mode">
              <select className="input" value={form.taxMode} onChange={(e) => set('taxMode', e.target.value as TaxMode)}>
                {taxModes.map((m) => <option key={m} value={m}>{taxModeLabels[m]}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Primary Phone">
              <input type="tel" className="input" placeholder="e.g. 0712 345 678" value={form.primaryPhone} onChange={(e) => set('primaryPhone', e.target.value)} />
            </Field>
            <Field label="Alternative Phone">
              <input type="tel" className="input" placeholder="e.g. 0733 987 654" value={form.alternativePhone} onChange={(e) => set('alternativePhone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="input" placeholder="e.g. info@grandpalace.co.ke" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Website">
              <input className="input" placeholder="e.g. www.grandpalace.co.ke" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </Field>
          </Section>

          <Section title="Location">
            <Field label="Country">
              <input className="input" placeholder="e.g. Kenya" value={form.country} onChange={(e) => set('country', e.target.value)} />
            </Field>
            <Field label="County / State">
              <input className="input" placeholder="e.g. Nairobi" value={form.county} onChange={(e) => set('county', e.target.value)} />
            </Field>
            <Field label="City / Town">
              <input className="input" placeholder="e.g. Nairobi CBD" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Physical Address">
              <input className="input" placeholder="e.g. Moi Avenue, Reliable House, 2nd Floor" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </Section>

          <Section title="Owner">
            <Field label="Owner Name" className="sm:col-span-2">
              <input className="input" placeholder="e.g. John Doe" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
            </Field>
            <Field label="Owner Phone">
              <input type="tel" className="input" placeholder="e.g. 0712 345 678" value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} />
            </Field>
            <Field label="Owner Email">
              <input type="email" className="input" placeholder="e.g. johndoe@grandpalace.co.ke" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} />
            </Field>
          </Section>

          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4 sm:px-8">
            {notice && <span className="text-sm font-medium text-success">{notice}</span>}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-sm bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <LuLoaderCircle className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StampBadge() {
  return (
    <div className="pointer-events-none absolute -top-6 right-8 z-10 flex size-24 -rotate-6 items-center justify-center rounded-full border-2 border-dashed border-accent bg-background text-center shadow-sm">
      <span className="px-2 text-[9px] font-bold uppercase leading-tight tracking-wider text-accent">
        Business
        <br />
        Information
      </span>
    </div>
  )
}

function Section({ title, description, first, children }: { title: string; description?: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={cn('p-6 sm:p-8', !first && 'border-t')}>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cn('block text-sm font-medium', className)}>
      {label}
      {required && <span className="text-destructive"> *</span>}
      <span className="mt-1.5 block font-normal">{children}</span>
    </label>
  )
}
