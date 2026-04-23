# Add Repair Financial Inputs + Advance Payment Cash Entry

## Goal

Update the “Create Repair” form so employees can enter the estimated total price and advance payment at device drop-off, see the remaining balance instantly, and record the advance in the shop’s cash flow.

## Key Clarification

The database currently uses `repairs.total_cost`, not `total_price`. I will map:


| UI Label            | Database Column                             |
| ------------------- | ------------------------------------------- |
| `Prix Total Estimé` | `repairs.total_cost`                        |
| `Avance payée`      | `repairs.amount_paid`                       |
| `Reste à payer`     | calculated only: `total_cost - amount_paid` |


## Implementation Plan

### 1. Update `RepairDialog` form fields

File: `src/components/repairs/RepairDialog.tsx`

- Add a dedicated financial section near the bottom of the form, directly before the “Créer la réparation” / “Enregistrer” button.
- Add:
  - `Prix Total Estimé`
  - `Avance payée`
  - read-only `Reste à payer`
- Keep `Avance payée` defaulted to `0`.
- Use numeric inputs with:
  - `type="number"`
  - `min="0"`
  - `step="1"`
- Add validation:
  - total price must be `>= 0`
  - advance must be `>= 0`
  - if advance is greater than total, show a validation error or prevent submit to avoid negative balances.
- The balance will update live using form watch values:

```ts
resteAPayer = Math.max(0, totalCost - amountPaid)
```

### 2. Make financial inputs available to employees

The current repair form hides the existing cost fields for employees because labor/parts costs are confidential.

I will keep confidential fields hidden:

- `Main d'œuvre`
- `Pièces`

But I will make the new customer/payment fields visible to employees:

- `Prix Total Estimé`
- `Avance payée`
- `Reste à payer`

This preserves employee financial privacy while allowing accurate customer-facing accounting.

### 3. Save values correctly when creating or editing repairs

Files:

- `src/pages/Repairs.tsx`
- `src/pages/Dashboard.tsx`

Update repair creation/edit submit logic so:

```ts
total_cost: data.total_cost
amount_paid: data.amount_paid
```

Instead of always calculating:

```ts
total_cost: labor_cost + parts_cost
```

For admins, labor/parts can still exist for internal profitability tracking, but the customer-facing total will come from `Prix Total Estimé`.

### 4. Add automatic cash-flow entry for advance payments

File: `src/hooks/useRepairs.ts`

When a new repair is created with:

```ts
amount_paid > 0
```

automatically insert a cash-flow entry tagged:

```text
Avance Réparation
```

Because the current schema does not show a dedicated `cash_flow` / `caisse` table, I will use the existing accounting pattern already used in the app: entries that affect cash reporting are inserted into the `expenses` table.

To represent a cash credit/inflow without counting it as an expense, the entry will use a negative amount, following the existing return/refund pattern:

```ts
category: "Avance Réparation"
description: `Avance réparation: ${device_model}`
amount: -amount_paid
expense_date: today
```

This will make the daily cash flow reflect the received advance immediately.

### 5. Cache invalidation after repair creation

After creating the repair and cash entry, invalidate:

```ts
["repairs"]
["recent-repairs"]
["dashboard-stats"]
["profit"]
["expenses"]
```

So the repair list, dashboard, profit/cash reporting, and accounting screens refresh immediately.

## Files to Modify


| File                                      | Change                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/components/repairs/RepairDialog.tsx` | Add visible total/advance/balance fields near submit button; live calculation and validation |
| `src/pages/Repairs.tsx`                   | Save `total_cost` from the new “Prix Total Estimé” field instead of forcing labor + parts    |
| `src/pages/Dashboard.tsx`                 | Same mapping for quick repair creation from dashboard                                        |
| `src/hooks/useRepairs.ts`                 | Insert “Avance Réparation” cash entry when `amount_paid > 0`; invalidate accounting caches   |


## No Database Schema Migration Required

The needed repair columns already exist:

```text
repairs.total_cost
repairs.amount_paid
```

No structural database change is required unless you want a dedicated `caisse` table later.