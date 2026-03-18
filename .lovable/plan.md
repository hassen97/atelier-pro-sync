

# Forensic Analysis & Fix Plan: Product Data Visibility

## Investigation Results

**tymostore (user `ec0dc009...`)**: Database contains **270 products**, all with valid `category_id` references. No orphaned joins found.

The query structure (`category:categories(id, name)`) is already a **left join** in PostgREST, so no products are silently filtered by missing categories. The pagination math (`range(from, to)`) is also correct.

However, I found **three real bugs** causing data visibility issues platform-wide:

---

## Bug 1: Stats Show Current Page Only (Misleading Dashboard)

**File**: `src/pages/Inventory.tsx` lines 129-132

The stat cards ("Total units", "Stock value", "Low stock") are computed from `products` — which is only the **current page of 50 items**. A shop with 270 products sees stats for only 50 items at a time. This is the most likely reason tymostore thinks products are missing — the counter and value numbers don't reflect reality.

**Fix**: For "Total produits", it already uses `totalCount` (correct). For stock units, value, low stock, and out-of-stock counts, we need a **separate lightweight aggregation query** that runs against all products:
```sql
SELECT COUNT(*) as total, 
       SUM(quantity) as total_units, 
       SUM(cost_price * quantity) as total_value,
       COUNT(*) FILTER (WHERE quantity <= min_quantity AND quantity > 0) as low_stock,
       COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock
FROM products WHERE user_id = ?
```
Since Supabase JS client can't do aggregation like this directly, we'll create a small `useInventoryStats` hook that fetches `id, quantity, min_quantity, cost_price` for all products (lightweight columns only) to compute accurate totals.

## Bug 2: `useAllProducts` Has No Safeguard Against 1000-Row Limit

**File**: `src/hooks/useProducts.ts` lines 65-85

The `useAllProducts` hook (used in POS, dropdowns, SmartScanBar) has no `.range()` or pagination — Supabase defaults to returning max 1000 rows. Shops exceeding 1000 products will silently lose items in POS and scan lookups.

**Fix**: Add a loop that fetches in batches of 1000, or use `.limit(10000)` as a practical ceiling for the use case.

## Bug 3: Barcode Search Doesn't Work Server-Side

**File**: `src/hooks/useProducts.ts` line 44

The search `.or()` filter searches `name` and `sku` but **not `barcodes`**. Since `barcodes` is a `text[]` array column, we need to use `barcodes.cs.{searchTerm}` or a raw filter. Users scanning/searching by barcode on pages beyond page 1 won't find their product.

**Fix**: Add barcode array search using `.or()` with `barcodes.cs.{"searchTerm"}` (array contains).

---

## Implementation Plan

### 1. Fix inventory stats — new `useInventoryStats` hook
- Create a lightweight query fetching `quantity, min_quantity, cost_price` for ALL products (no category join, no limit beyond the default)
- Compute total units, total value, low stock count, out-of-stock count
- Use these in the stat cards instead of current-page-only calculations

### 2. Fix `useAllProducts` for 1000+ product shops
- Implement batch fetching: loop with `.range(0, 999)`, `.range(1000, 1999)`, etc. until all rows returned
- This ensures POS, SmartScanBar, and dropdowns see the full catalog

### 3. Fix barcode search in paginated query
- Extend the `.or()` filter to include `barcodes.cs.{"{search}"}` for array containment search

### 4. UI transparency
- Keep existing pagination controls (already working)
- Ensure the "Total produits" stat card always shows the server-provided `count`

**Files to modify**: `src/hooks/useProducts.ts`, `src/pages/Inventory.tsx`

