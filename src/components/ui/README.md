# UI primitives — design notes

These are the shared building blocks for the app's UI. **Use them instead of
hand-rolling the same markup on each page.** If you're about to write a
Tailwind class string that looks like one of these, reach for the component.

---

## `StatCard` — `@/components/ui/StatCard`

The single design for **every dashboard-style summary tile** (the little
"Total / Active / Low stock" cards at the top of a list page, the Dashboard
KPIs, etc.).

- Flat coloured fill, matching icon chip, uppercase label, big value, optional
  `hint` line, a neutral layered "paper" shadow, and the signature fingerprint
  contour lines in the corner.
- Colour comes from a fixed **non-primary** palette (amber, emerald, violet,
  rose, sky, orange, teal, fuchsia, indigo, lime). Pass `index` — usually the
  map index — so a row of cards comes out multi-coloured. Pass `tone`
  (`warn | danger | success | info`) for a value whose colour must be
  semantic regardless of position (low stock, money out, outstanding balance).
- Never re-create the old `rounded-sm border bg-card p-5 shadow-sm` tile.

```tsx
<section className="grid gap-3 sm:grid-cols-4">
  {rows.map(([label, value, icon], i) => (
    <StatCard key={label} index={i} label={label} value={value} icon={icon} />
  ))}
</section>

<StatCard tone="danger" icon={<LuArrowUpRight />} label="Money out" value={fmt(x)} />
```

Pages that still have a local `Metric` / `SummaryCard` helper keep the wrapper
name but delegate to `StatCard` (imported as `SharedStatCard` where the local
name collides), mapping their old `tone` prop to a palette `index`.

---

## `Button` — `@/components/ui/Button`

The one button primitive. **Use it for every page- or section-level action**,
especially the **"New X" / "Add X" create button** in a header.

- `variant="primary"` (default) — **solid black** (`bg-black text-white`), the
  signature create-action look. This is what "Add product", "New category",
  "New requisition", etc. use.
- `variant="secondary"` — outline (`border bg-transparent hover:bg-muted`), for
  the button that sits next to a primary one ("Manage UOM", "Manage
  categories").
- `variant="danger"` — destructive actions.
- `type` defaults to `"button"` so a header button never submits a stray form.
  Pass `type="submit"` for form actions.
- Pass layout-only classes through `className` (`shrink-0`, `w-full`, …). Don't
  pass colour/padding classes — that's the component's job.

```tsx
<Button onClick={openCreate}><LuPlus /> New category</Button>
<Button variant="secondary" onClick={() => setShowUnits(true)}><LuRuler /> Manage UOM</Button>
```

Modal submit buttons and small inline "add row" controls were left as-is for
now — the rule above is about the primary action button on a tab.

---

## `SearchableSelect` — `@/components/ui/SearchableSelect`

Single-select dropdown with a type-to-filter box and keyboard nav. Looks like a
plain `.input` when closed. Use it anywhere a `<select>` list is long enough
that scanning it is annoying (category pickers, location pickers, …).

```tsx
<SearchableSelect
  options={categories.map((c) => ({ value: c.id, label: c.name, hint: c.isActive ? undefined : 'inactive' }))}
  value={form.categoryId}
  onChange={(v) => setForm({ ...form, categoryId: v })}
  placeholder="Select category"
/>
```
