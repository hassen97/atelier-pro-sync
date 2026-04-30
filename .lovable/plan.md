# Apply Claude's Ultra Admin redesign + real Reports & Export view

## Summary
Bring in the redesign from `AdminDashboardPreview.jsx`, install the new `AdminReportsView.tsx`, and replace its mock data + CSV/JSON exports with **real Supabase data + Excel (.xlsx) + PDF** exports. Keep all existing functionality working.

---

## 1. Sidebar redesign — `src/components/admin/AdminSidebar.tsx`

Re-group nav into the 4 sections from the new design (same items, new labels):

```text
Plateforme  : Dashboard · Boutiques · Employés · Rapports (badge "Nouveau")
Commercial  : Tarifs & Plans · Commandes · Paiements
Opérations  : Liste d'attente · Demandes · Annonces · Feedback · Communauté
Système     : Tentatives · Feature Flags · Paramètres
```

Visual updates:
- Add small "Nouveau" cyan badge next to Reports
- Add bottom **admin profile card** (avatar with initial, name, "Super Admin", green dot) when expanded — pulls from `useAuth().user`
- Keep collapse/expand, tooltips when collapsed, sign-out button, and the existing `AdminView` type
- Keep all colors / hover states as in the current file (already matches the preview)

No type changes — `feature_flags` and `signup_attempts` stay in `Système`. We just regroup display.

## 2. Topbar polish — `src/pages/AdminDashboard.tsx`

Minor tweaks to match the preview (file already very close):
- Live indicator → show **real** active-shop count from `useAdminData()` instead of hard-coded "40"
- Avatar shows the real user initial (from `useAuth`)
- Keep Cmd+K, notifications bell, mobile sheet, all current view routing

## 3. Reports view — `src/components/admin/AdminReportsView.tsx`

Full rewrite to use real data + Excel/PDF exports.

### Data hook (new): `src/hooks/useAdminReports.ts`
Single React Query (`staleTime: 5 min`, per Ultra Admin perf rules) that fetches platform-wide aggregates as a `platform_admin`:

- **Revenue per month (last 6/3/1m or 1y)**: groupBy month from `sales.total_amount` + `repairs.amount_paid`
- **Repairs per month**: count from `repairs`
- **KPIs**:
  - Total revenue (sales + repairs) over the range
  - Total repairs count
  - Average ticket value = revenue / repairs
  - Active shops count = distinct `user_id` with activity in range
- **Repair types breakdown**: group `repairs` by `category_id` → category name (top 6 + "Autre")
- **Top shops table**: per `user_id` aggregate `repair_count`, `revenue` (sales+repairs paid), join `shop_settings.shop_name + city/address`, compute MoM growth %
- **Device-type pie**: best-effort from repair `device_model` keyword match (Mobile/Laptop/Tablette) — falls back to "Autre"

Returns `{ kpis, revenueSeries, repairTypes, topShops, deviceMix }`.

### View component
- Same layout as the uploaded file (header, filter bar, KPIs, charts, table)
- Replace mock constants with hook data
- Filter bar: `dateRange` (1m/3m/6m/1y) + `shopFilter` populated from real shops + search input
- Loading skeletons while query pending
- Empty states when no data

### Exports — Excel & PDF only
Replace the CSV/JSON helpers with two helpers in **`src/lib/adminReportExport.ts`** (new):

- **Excel (.xlsx)** via `xlsx` lib (already used in project — see Inventory import)
  - Multi-sheet workbook: `KPIs` · `Revenu mensuel` · `Top boutiques` · `Types de réparation` · `Appareils`
  - Header row bold, currency col formatted, frozen header
  - Filename: `rapport-plateforme-{range}-{YYYY-MM-DD}.xlsx`

- **PDF** via dynamic `import("jspdf")` + `import("jspdf-autotable")` (lazy, per "Dynamic Imports Perf" rule)
  - A4 landscape, brand header (Centre de Commande, generated date, range)
  - KPI grid at top, then auto-table for top shops, then small revenue summary table
  - Filename: `rapport-plateforme-{range}-{YYYY-MM-DD}.pdf`

Header buttons:
- `Export Excel` (emerald accent)
- `Export PDF` (gradient cyan→blue, primary)
- Success toast (sonner) on completion

## 4. AdminDashboard wiring
Already imports `AdminReportsView` and routes `reports` view. Just confirm Reports stays in the sidebar map and the page label "Rapports & Export" is added to `viewLabels`.

---

## Files to create
- `src/hooks/useAdminReports.ts`
- `src/lib/adminReportExport.ts`

## Files to edit
- `src/components/admin/AdminSidebar.tsx` (regroup + badge + profile card)
- `src/components/admin/AdminReportsView.tsx` (full rewrite, real data + xlsx/PDF)
- `src/pages/AdminDashboard.tsx` (live count + avatar from auth)

## No DB / migration changes
Existing `platform_admin` RLS policies on `sales`, `repairs`, `shop_settings`, `categories`, `customers` already allow all reads needed.

## Dependencies
Already in `package.json`: `xlsx`, `jspdf`, `jspdf-autotable`, `recharts`, `lucide-react`, `sonner`. No new installs.
