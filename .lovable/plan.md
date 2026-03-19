
# Subscription Configuration System + Inventory Visibility Fix

## Investigation: `aousjagsm` (AOUSJA GSM)

Database confirms this user has **0 products** — not a visibility bug but a genuinely empty inventory. Their account exists correctly, they simply haven't imported products yet. The pagination/visibility code from the previous fix is working correctly (verified: walid78 with 2635 products, tymostore with 270).

---

## Part A — Inventory Bug: Root Cause Clarified

The existing `useProducts` hook uses `.range(from, to)` correctly, and `useInventoryStats` batch-fetches all products. No additional code fix is needed. The "aousjagsm" case is a fresh account with no data.

**No file change needed for the inventory bug.**

---

## Part B — Subscription Configuration System

### 1. Database Migration: Extend `subscription_plans.features` schema

The current `features` column stores plain display strings: `["Réparations illimitées", ...]`. We need to evolve this JSONB to include machine-readable keys and limits alongside display labels, without breaking the existing pricing UI.

New `features` structure per plan (stored in the existing `features` JSONB column):

```json
{
  "display": ["Réparations illimitées", "Inventaire de base"],
  "modules": {
    "pos": true,
    "repairs": true,
    "inventory_export": false,
    "advanced_analytics": false,
    "bulk_sms": false,
    "supplier_management": false
  },
  "limits": {
    "max_employees": 1,
    "max_products": 100,
    "max_monthly_repairs": 50
  }
}
```

This is backward compatible — the pricing grid already parses `features` as an array; we update it to read `features.display` if it's an object.

**Migration**: `ALTER` nothing — only UPDATE existing rows' `features` JSONB values and update the TypeScript interfaces. No schema change needed.

### 2. New Files

**`src/hooks/usePlanPermissions.ts`**
- `usePlanPermissions()` hook that fetches the active subscription and extracts `modules` + `limits` from the JSONB
- `isFeatureEnabled(key: string): boolean` — checks `plan.features.modules[key]`, defaults to `true` for free tier features
- `hasReachedLimit(key: string, currentCount: number): boolean` — checks against `plan.features.limits[key]`
- Returns `isLoading`, `planName`, `isPaidPlan`

**`src/components/billing/PremiumFeature.tsx`**
- Guard component: `<PremiumFeature featureKey="inventory_export" limitKey="max_employees" currentCount={teamMembers.length}>`
- Modes: `hidden` (renders nothing), `locked` (renders children with lock overlay + click → UpgradeModal)
- Accepts optional `children` and `fallback` prop

### 3. Modify `AdminPlansView.tsx` — Plan Builder UI

Replace the simple textarea `PlanForm` with a structured **3-tab editor**:

- **Tab 1: Identity** — Name, price, currency, period, description, sort order, highlight toggle, active toggle (existing fields)
- **Tab 2: Modules** — 6 toggle switches for each feature key with friendly labels:
  - Point de Vente (POS), Gestion Réparations, Export Inventaire (CSV/Excel), Statistiques Avancées, Bulk SMS, Gestion Fournisseurs
- **Tab 3: Limites** — 3 numeric inputs: Max Employés, Max Produits, Max Réparations/mois (0 = illimité)

Saving serializes to the unified JSONB format above and updates `display` labels from the module/limit config automatically.

### 4. Update `SubscriptionPlan` TypeScript interface

In `src/hooks/useSubscriptionPlans.ts`: extend `SubscriptionPlan.features` type to accept `string[]` (legacy) OR the new `PlanFeatures` object. Add a `parsePlanFeatures(raw)` utility.

### 5. Update `useSubscription.ts`

Pass the full features JSONB through to the subscription response so `usePlanPermissions` has it available.

### 6. Enforcement: 3 concrete gating examples

**a. Employee Limit** — In `src/components/settings/TeamManagement.tsx`:
- Wrap "Ajouter Employé" button with `hasReachedLimit('max_employees', teamMembers.length)` check
- Show a disabled button with a tooltip if at limit

**b. Inventory Export** — In `src/pages/Inventory.tsx`:
- Wrap the "Export CSV" / `FileSpreadsheet` button with `<PremiumFeature featureKey="inventory_export">`

**c. Advanced Analytics** — In `src/pages/Statistics.tsx`:
- Wrap the statistics page cards with `<PremiumFeature featureKey="advanced_analytics">`

### 7. Update `BillingDashboard.tsx`

- Read `features.display` if the new format is detected, else fall back to the raw array
- Show the **limits** section: "Employés: 1/5" progress bars using `useTeamMembers` count vs plan limit
- Ensure the pricing grid reads `features.display` for feature bullets

### 8. `UpgradeModal.tsx` — Contextual Nudge

Already exists. Update it to:
- Accept a `featureKey` prop so the modal headline references the specific feature: *"Débloquez l'Export Inventaire avec le plan Pro"*
- Show a 2-column comparison of current plan vs next tier
- CTA navigates to `/checkout?plan=<next_tier_id>`

---

## Files to Modify/Create

```text
NEW   src/hooks/usePlanPermissions.ts
NEW   src/components/billing/PremiumFeature.tsx
MOD   src/hooks/useSubscriptionPlans.ts        (interface + parsePlanFeatures)
MOD   src/hooks/useSubscription.ts             (pass full features JSONB)
MOD   src/components/admin/AdminPlansView.tsx  (3-tab structured Plan Builder)
MOD   src/components/billing/BillingDashboard.tsx (limits progress bars, display compat)
MOD   src/components/billing/UpgradeModal.tsx  (contextual featureKey prop)
MOD   src/components/settings/TeamManagement.tsx (employee limit gate)
MOD   src/pages/Inventory.tsx                  (export lock gate)
MOD   src/pages/Statistics.tsx                 (analytics gate)
```

No database migration required — the `features` JSONB column already accepts any structure. Existing plan rows will be updated via the new admin UI.
