

## Two bugs to fix

### Bug 1: Repair created from Dashboard shows 0 price

**Root cause**: In `src/pages/Dashboard.tsx` (line 303-314), the `onSubmit` handler for `RepairDialog` passes `labor_cost` and `parts_cost` but **never computes `total_cost`**. So `total_cost` gets inserted as `0` (the DB default).

In contrast, `src/pages/Repairs.tsx` (line 291) correctly computes:
```ts
total_cost: data.labor_cost + data.parts_cost,
```

The Dashboard's handler also ignores the `selectedParts` argument (second parameter), so parts are never saved when adding a repair from Dashboard. Additionally, `estimated_ready_date`, `technician_note`, and `category_id` fields are missing from the handler.

**Fix**: Update the `onSubmit` in `Dashboard.tsx` to mirror the full handler from `Repairs.tsx` — compute `total_cost`, pass `category_id`, `estimated_ready_date`, `technician_note`, and also save `selectedParts` to `repair_parts` table.

---

### Bug 2: No "Today" filter in Profit page

**Current state**: `useProfit.ts` already has the `"today"` case implemented in the switch statement (from the last diff), but `Profit.tsx` doesn't expose it in the `<Select>` dropdown — the options only include `week`, `month`, `quarter`, `year`.

**Fix**: Add `<SelectItem value="today">Aujourd'hui</SelectItem>` to the Select dropdown in `Profit.tsx`. Also fix the export label to handle `"today"` case.

---

### Build errors

There are 3 TypeScript errors in edge functions (not client-side). These are pre-existing Deno API issues in:
- `supabase/functions/admin-manage-users/index.ts` — `Deno.serve` signature mismatch  
- `supabase/functions/check-username/index.ts` — `boolean | null` type mismatch (x2)

These need to be fixed too.

---

## Files to change

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Fix `onSubmit` to compute `total_cost`, save parts, pass all fields |
| `src/pages/Profit.tsx` | Add "Aujourd'hui" SelectItem + fix export label |
| `supabase/functions/admin-manage-users/index.ts` | Fix `Deno.serve` call signature |
| `supabase/functions/check-username/index.ts` | Fix `boolean \| null` type |

