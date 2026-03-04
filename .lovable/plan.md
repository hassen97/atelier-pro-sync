

# Fix Debt Payments for Sales + Show Total Stock Count in Inventory

## Issue 1: Sale Debt Payment Fails

**Root cause**: The `useUpdateSale` hook in `src/hooks/useSales.ts` (line 126) adds `updated_at` to the update payload, but the `sales` table has **no `updated_at` column**. This causes the Supabase update to fail silently or throw an error, so sale debt payments never go through.

**Fix**: Remove `updated_at` from the update call in `useUpdateSale`.

Additionally, in `CustomerDebts.tsx`, debts with reference prefix `CLI-` (balance-only debts from the customers table, not linked to a specific sale or repair) also fail because the `submitPayment` function tries to find a matching sale by `selectedDebt.id` — but that ID is the customer ID, not a sale ID. The code falls into the `"Vente"` branch, finds no matching sale, and does nothing beyond updating the customer balance. This path actually works correctly for the balance update, but should skip the sale update entirely.

**Fix**: Add a check for the `CLI-` reference prefix to only update customer balance without trying to find a sale record.

### File: `src/hooks/useSales.ts`
- Line 126: Remove `updated_at: new Date().toISOString()` from the update object

### File: `src/pages/CustomerDebts.tsx`
- In `submitPayment`, when `type === "Vente"` and no matching sale is found, skip the sale update gracefully (already works, but the sale lookup returns undefined and `mutateAsync` is never called — this is fine)

## Issue 2: Show Total Stock Quantity in Inventory

The inventory page shows "Total produits" (number of unique products) but not the total number of individual items in stock.

**Fix**: Add a new stat card showing the sum of all product quantities.

### File: `src/pages/Inventory.tsx`
- Add a `totalStockUnits` calculation: `products.reduce((sum, item) => sum + item.stock, 0)`
- Add a fifth stat card "Total unités en stock" showing this value, or replace the existing layout to include it in the grid

