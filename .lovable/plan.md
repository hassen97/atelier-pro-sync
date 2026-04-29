## Two deliverables

### 1. Fix Inventory CSV Export

**Bug**: The "Exporter" button in `src/pages/Inventory.tsx` (line 224) has no `onClick` — it's a dead button.

**Fix** (all in `src/pages/Inventory.tsx`):

- Add `isExporting` state + spinner.
- New async `handleExport()`:
  1. Fetch the **complete** inventory directly from Supabase, scoped by `useEffectiveUserId()` (so employees export their owner's stock). Use a paged loop (`.range(from, from+999)` in 1000-row chunks) until fewer than 1000 rows are returned — guarantees full export even on shops with > 1000 SKUs and avoids the default 1000-row cap.
  2. Join `category_id → categories.name` via a single `.in()` lookup.
  3. Map each row into a clean record:
     - `Nom du produit`, `Référence/SKU`, `Catégorie`, `Quantité en stock`, `Prix d'achat`, `Prix de vente`.
  4. **Sanitize**: strip `,`, `\n`, `\r`, `"` from string fields (replace `"` with `""` and wrap any field containing `;` or whitespace in quotes). Use `;` as the delimiter (Excel-FR friendly) and prepend a UTF-8 BOM (`\uFEFF`) so accents render correctly.
  5. Build a `Blob([csv], { type: 'text/csv;charset=utf-8;' })`, create an `<a>` with `URL.createObjectURL`, click, then `URL.revokeObjectURL` + `remove()` to avoid leaks.
  6. Filename: `inventaire-YYYY-MM-DD.csv`.
- Wire the button: `onClick={handleExport}` with `disabled={isExporting}` and a `<Loader2 className="animate-spin" />` icon while running.
- Wrap the button in `<PremiumFeature featureKey="inventory_export" ...>` (it's already a paid feature flag).
- Toast success ("Export terminé — N produits") / error.

No DB changes needed for this part.

---

### 2. Employee Management Dashboard (HR + Finance Ledger)

**Route**: `/team` (added to `App.tsx`, `AppSidebar`, and `ALL_PAGES` in `useTeam.ts` so owners see it and can grant employees access).

#### 2.1 Database (one migration)

**New table `employee_transactions`** (multi-tenant, owner-scoped — uses `user_id` for the shop owner, matching the rest of the schema):

```text
employee_transactions
- id            uuid pk default gen_random_uuid()
- user_id       uuid not null         -- shop owner (the "shop_id")
- employee_id   uuid not null         -- references the employee's auth user id
- type          text not null check (type in ('avance_salaire','prime_bonus','remboursement_frais','salary_payment'))
- amount        numeric not null default 0
- description   text
- transaction_date date not null default current_date
- expense_id    uuid                  -- link to public.expenses row when paid in cash (for caisse sync)
- created_at    timestamptz not null default now()
- created_by    uuid                  -- who logged it (owner or impersonator)
```

RLS:
- `Owner or team can view employee_transactions` — `user_id = auth.uid() OR is_team_member(user_id, auth.uid())`
- `Owner can manage employee_transactions` — `user_id = auth.uid()` (employees can't write financial records about themselves)
- `Platform admin can view all` — `has_role(auth.uid(),'platform_admin')`

**Add 2 columns to `team_members`** (HR profile fields, optional):
- `base_salary numeric default 0`
- `hire_date date`

(monthly settlement = base_salary − sum(avances this month) + sum(remboursements this month) − sum(salary_payment this month).)

**Seed an expense category** automatically on first advance: insert `'Avance Employé'` into `expense_categories` for the owner if missing (handled in mutation, not via migration).

#### 2.2 New hook `src/hooks/useEmployeeTransactions.ts`

- `useEmployees()` — wraps `useTeamMembers()` and enriches each row with `currentBalance` = sum(avance + salary_payment) − sum(prime + remboursement) over the current month (negative = shop owes employee, positive = employee owes shop).
- `useEmployeeTransactions(employeeId)` — list one employee's ledger.
- `useCreateEmployeeTransaction()` — inserts the transaction. **If `type === 'avance_salaire'` AND `paidInCash === true`**, also insert a row in `public.expenses` (`category: 'Avance Employé - <name>'`, `amount`, `expense_date = today`, link the new `expense_id` back on the transaction). This keeps the till balanced. Invalidates `['expenses']`, `['profit']`, `['dashboard-stats']`, `['employee-transactions']`.
- `useEmployeeMonthlyStats(employeeId)` — fetches counts of `repairs.repaired_by = username` and `sales` rows where `created_by` matches, for the current month (best-effort performance KPIs).

#### 2.3 New page `src/pages/Team.tsx`

```text
+-------------------------------------------------------------+
| Gestion des Employés                       [+ Nouvel employé]|
+-------------------------------------------------------------+
| Card | Card | Card    (one per active team_member)           |
| Nom  | Rôle | Solde du mois (color-coded)                    |
+-------------------------------------------------------------+
```

Click a card → opens a `Sheet` with tabs:

- **Profil** — name, role, hire_date, base_salary (editable inline by owner).
- **Historique** — table of `employee_transactions` (date, type badge, montant, description, "payé en caisse" badge if linked to an expense).
- **Performance** — this-month repair count + sale count + total revenue handled.
- **Clôture du mois** — visual calculator card:
  ```text
  Salaire de base        +  X TND
  Avances (-)            -  X TND
  Remboursements (+)     +  X TND
  Primes (+)             +  X TND
  Salaires déjà payés (-) - X TND
  ─────────────────────────
  Net à payer            =  X TND  [Marquer comme payé]
  ```
  "Marquer comme payé" opens a confirm modal that creates a `salary_payment` transaction (and optionally a matching cash expense).

Action buttons in the sheet header:
- **Accorder une avance** → modal: amount, description, checkbox "Payée en espèces (créer une dépense en caisse)" (default ON).
- **Saisir une dépense remboursable** → modal: amount, description (does NOT touch caisse — it's a debt the shop owes).
- **Verser une prime** → modal: amount, description.

Empty state if no team members yet → CTA "Ajouter un membre" linking to existing `TeamManagement` flow in Settings.

#### 2.4 Wiring

- `src/App.tsx`: lazy-import `Team`, add `<Route path="/team" element={<Team />} />` inside the protected `ShopSettingsProvider` block.
- `src/components/layout/AppSidebar.tsx`: add nav entry "Équipe" (Users icon) — owner-only via the existing `useIsOwner()` gate that's already used for sensitive pages, OR include it in the standard `ALL_PAGES` list so owners can grant the page to specific managers.
- `src/hooks/useTeam.ts`: append `{ href: "/team", label: "Équipe" }` to `ALL_PAGES`.

#### 2.5 Reusing existing infrastructure

- Money formatting → `useCurrency()` (multi-country support).
- Toasts → `sonner`.
- Modals → existing `Dialog` / `Sheet` primitives.
- Realtime invalidation → `useRealtimeSubscription({ tables: ['employee_transactions','expenses'] })` on Team page so multi-device owners see updates live.

---

### Files touched

**Inventory export fix**
- `src/pages/Inventory.tsx`

**Employee dashboard (new)**
- `supabase/migrations/<new>.sql` — `employee_transactions` + RLS + `team_members` columns
- `src/hooks/useEmployeeTransactions.ts` (new)
- `src/pages/Team.tsx` (new)
- `src/components/team/EmployeeCard.tsx` (new)
- `src/components/team/EmployeeDetailSheet.tsx` (new)
- `src/components/team/GrantAdvanceDialog.tsx` (new)
- `src/components/team/LogReimbursementDialog.tsx` (new)
- `src/components/team/MonthlySettlementCard.tsx` (new)
- `src/App.tsx` — add `/team` route
- `src/components/layout/AppSidebar.tsx` — add nav entry
- `src/hooks/useTeam.ts` — add `/team` to `ALL_PAGES`

No breaking changes; existing team / expenses / caisse logic stays intact, the new module just plugs into them.
