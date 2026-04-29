## Customer Loyalty Points System

A points-based loyalty program: customers earn points on Sales/Repairs and redeem them as discounts in POS. Owner-configurable rates, full audit ledger, and receipt footer summary.

---

### 1. Database (one migration)

**1.1 Extend `customers`**
- `loyalty_points integer not null default 0` (running balance, denormalized for fast reads)

**1.2 Extend `shop_settings`**
- `loyalty_enabled boolean not null default false`
- `loyalty_earn_rate numeric not null default 1` — points earned per 1 unit of currency spent (e.g. `1` = 1 pt per 1 DT)
- `loyalty_redeem_points integer not null default 100` — how many points equal one discount unit
- `loyalty_redeem_value numeric not null default 5` — discount amount unlocked per `loyalty_redeem_points` block (e.g. 100 pts → 5 DT)
- `loyalty_min_redeem integer not null default 100` — minimum points required to redeem

**1.3 New table `loyalty_transactions`**

```text
loyalty_transactions
- id            uuid pk default gen_random_uuid()
- user_id       uuid not null            -- shop owner (multi-tenant)
- customer_id   uuid not null
- type          text not null check (type in ('earned','redeemed','adjustment'))
- amount_points integer not null         -- positive for earned, negative for redeemed
- amount_money  numeric                  -- the spend (earned) or discount (redeemed) that triggered it
- source        text                     -- 'sale' | 'repair' | 'manual'
- sale_id       uuid                     -- nullable FK reference (no hard FK to keep delete-safe)
- repair_id     uuid
- note          text
- created_by    uuid                     -- who logged it
- created_at    timestamptz default now()
```

RLS (matches existing project patterns):
- `Owner or team can view loyalty_transactions` — `user_id = auth.uid() OR is_team_member(user_id, auth.uid())`
- `Owner or team can insert loyalty_transactions` — same
- `Platform admin can view all` — `has_role(auth.uid(),'platform_admin')`
- No update / delete (immutable ledger).

Indexes: `(user_id, customer_id, created_at desc)`, `(sale_id)`, `(repair_id)`.

---

### 2. Earning logic (frontend, inside existing mutations)

No DB triggers — keep logic in the React Query mutations so we can read shop settings cleanly and skip when `loyalty_enabled = false` or `customer_id` is null.

**2.1 `useCreateSale` (`src/hooks/useSales.ts`)**

After the sale + sale_items insert, when a customer is attached and loyalty is enabled:
```text
points_earned = floor(amount_paid * loyalty_earn_rate)
```
Then in one batch:
- Insert into `loyalty_transactions` (type `earned`, source `sale`, sale_id, amount_money = amount_paid).
- `UPDATE customers SET loyalty_points = loyalty_points + points_earned`.
- Return `{ sale, points_earned, new_balance }` so the UI / receipt can show it.

Already invalidates `sales` / `products`; add `["customers"]` and `["loyalty-transactions"]`.

**2.2 Repairs (`src/hooks/useRepairs.ts`)**

Earning fires only on the transition to **completed/delivered AND fully paid**. Inside the existing repair update mutation:
- Detect: `old.status !== 'delivered'` AND `new.status === 'delivered'` AND `amount_paid >= total_cost` AND `customer_id` set.
- Compute points on `total_cost` (the actual spend, not the partial last payment).
- Same insert + customer balance update.
- Idempotency guard: skip if a `loyalty_transactions` row already exists for this `repair_id` with `type='earned'` (defensive against double-click).

**2.3 Redemption recording**

When a sale is created with redeemed points (see §3), the same `useCreateSale` mutation also inserts a `redeemed` row with `amount_points = -used_points`, `amount_money = discount_amount`, `source='sale'`, `sale_id=...`, and decrements `customers.loyalty_points` by `used_points`. Earning still applies on the *post-discount* paid amount (so customers don't earn points on points).

---

### 3. Redemption UI (POS / `src/pages/POS.tsx`)

When a customer is selected in the cart AND `loyalty_enabled` AND `customer.loyalty_points >= loyalty_min_redeem`:

Add a card under the cart total:

```text
+--------------------------------------------+
| Fidélité — Sara B.                         |
| Solde : 320 pts                            |
| [Switch] Utiliser mes points              |
|                                            |
| (when ON):                                 |
| Points utilisés : 300 / 320                |
| [- 100]  [+ 100]                           |
| Réduction appliquée : -15.00 DT            |
+--------------------------------------------+
```

Logic:
- Max usable = `floor(customer.loyalty_points / loyalty_redeem_points) * loyalty_redeem_points`, capped so the discount cannot exceed `cart_subtotal` (no negative totals).
- Step buttons add/remove `loyalty_redeem_points` at a time.
- `discount = (used_points / loyalty_redeem_points) * loyalty_redeem_value`.
- Display final total = subtotal − discount.
- Pass `loyalty_points_used` and `loyalty_discount` into `useCreateSale`. The mutation stores them in `sales.notes` (appended) and writes the redemption ledger row. (We do *not* alter the `sales` schema — `total_amount` is the post-discount value, matching how the existing receipt prints.)

Repairs do not get a redemption UI in this MVP (kept simple — only POS redeems). Earning still works on repairs.

---

### 4. Customer dossier / dedicated views

- `src/components/customers/CustomerDossierDialog.tsx` — add a **"Fidélité"** section: current balance, "Ajuster" button (manual `adjustment` entry, owner-only), and a paginated history table from `loyalty_transactions` with type badge, date, points, money, link to sale/repair.
- `src/pages/Customers.tsx` — add a `Solde points` column (sortable).

---

### 5. Settings (`src/pages/Settings.tsx`)

New "Fidélité" subsection inside the **Boutique** tab:
- Switch: "Activer le programme de fidélité"
- Input: "Taux de gain — 1 [currency] = X points"
- Inputs: "Conversion — X points = Y [currency] de réduction"
- Input: "Seuil minimum pour utiliser les points"
- Live preview line: "Exemple : un client qui dépense 100 DT gagne 100 points et peut obtenir 5 DT de réduction tous les 100 points."

Persist via the existing `useShopSettings` save flow.

---

### 6. Thermal receipt (`src/lib/receiptPdf.ts`)

When loyalty is enabled AND a customer is attached, append a footer block (matching the existing high-contrast bold thermal style — same font weight, all-caps label, divider line):

```text
─────────────────────────────
FIDÉLITÉ
Points gagnés : +25
Points utilisés : -100  (-5.00 DT)   ← only if redeemed
Nouveau solde : 245 pts
─────────────────────────────
```

The receipt generator receives `points_earned`, `points_used`, `loyalty_balance_after` as new optional fields; the POS finalize flow passes them after `useCreateSale` resolves. If the customer is anonymous or loyalty is off, the section is omitted entirely.

Apply the same change to the repair receipt (`RepairReceiptDialog.tsx`) for the "delivered & paid" print.

---

### 7. Files touched

**New**
- `supabase/migrations/<ts>_loyalty_program.sql` — column adds + table + RLS + indexes
- `src/hooks/useLoyalty.ts` — `useLoyaltyTransactions(customerId)`, `useAdjustLoyaltyPoints()` (owner-only manual)
- `src/components/pos/LoyaltyRedeemCard.tsx` — POS redemption widget
- `src/components/customers/LoyaltyHistoryTab.tsx` — dossier history view
- `src/components/settings/LoyaltySettings.tsx` — settings panel

**Edited**
- `src/hooks/useSales.ts` — earn + redeem logic in `useCreateSale`
- `src/hooks/useRepairs.ts` — earn on delivered+paid transition (with idempotency guard)
- `src/pages/POS.tsx` — render `LoyaltyRedeemCard`, pass redemption to mutation, pass receipt loyalty fields
- `src/pages/Customers.tsx` — points column
- `src/components/customers/CustomerDossierDialog.tsx` — Fidélité tab
- `src/pages/Settings.tsx` — mount `LoyaltySettings` in Boutique tab
- `src/hooks/useShopSettings.ts` — expose new loyalty fields
- `src/lib/receiptPdf.ts` — footer block
- `src/components/repairs/RepairReceiptDialog.tsx` — footer block
- `src/contexts/I18nContext.tsx` — translation keys

---

### 8. Edge cases / decisions

- **Refunds / returns**: out of scope for MVP — manual `adjustment` ledger entry by the owner is the workflow. (Adding auto-clawback on returns can be a phase 2; the Returns/RMA module is frozen per project memory.)
- **Anonymous sales** (no `customer_id`): no points awarded, no receipt loyalty block.
- **Concurrency**: balance update uses an optimistic read-modify-write. Duplicate inserts are caught by the per-sale/per-repair idempotency check on the ledger.
- **Employee privacy**: loyalty values are not financial margins, so they're visible to all team members (consistent with `customers` RLS).
- **Migration safety**: pure additive — adds columns with defaults and a new table. No data loss risk.

Approve to proceed with the migration + implementation.
