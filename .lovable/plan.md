## Two issues to fix

### 1. POS stock not refreshing after a sale (cashier sees old quantity until reload)

**Root cause**
- `POS.tsx` reads products from `useAllProducts()` (cache key `["products-all"]`) with a 2-minute `staleTime`.
- `useCreateSale` only invalidates `["sales"]`, `["products"]`, `["dashboard-stats"]`, `["profit"]` — it never invalidates `["products-all"]`, so the POS grid keeps showing the stale `quantity` from cache.
- There's also no realtime subscription on the POS page, so concurrent sales by another cashier (or by a teammate) don't update the quantity badges live.

**Fix**
- In `src/hooks/useSales.ts`, add `queryClient.invalidateQueries({ queryKey: ["products-all"] })` (and `["products-low-stock"]`, `["inventory-stats"]`) inside `useCreateSale.onSuccess`.
- In `src/pages/POS.tsx`, attach a realtime subscription so the product grid live-refreshes when any teammate completes a sale or stock changes:
  ```ts
  useRealtimeSubscription({
    tables: ["products", "sales"],
    queryKeys: [["products-all"], ["products"], ["products-low-stock"]],
  });
  ```
- As a defensive measure, also block `addToCart` from going past `product.quantity` (already done) and reduce `useAllProducts` `staleTime` from 2 min to 30 s so a manual refresh path exists if realtime ever drops.

This guarantees that:
- After the cashier confirms a sale, the grid card immediately reflects the new quantity (no reload).
- If two cashiers / a teammate sell on different devices, both screens update within a second via realtime.

### 2. Logo on receipt looks too small — add size control + live preview

**Current behavior**
`src/lib/receiptPdf.ts` hard-codes the receipt logo to `max-width:50mm; max-height:20mm`, which renders very small on 80mm thermal paper.

**Fix — make logo size configurable per shop**

1. **Database migration**: add a column to `shop_settings`:
   - `logo_size` text NOT NULL DEFAULT `'medium'` (values: `small`, `medium`, `large`, `xlarge`)

2. **Receipt rendering** (`src/lib/receiptPdf.ts`):
   - Read `settings.logo_size` and map to dimensions:
     - small → max-width 30mm, max-height 15mm
     - medium → 50mm × 20mm (current)
     - large → 65mm × 30mm
     - xlarge → 72mm × 40mm (full width on 80mm paper)
   - Apply to both `generateThermalReceipt` and (optionally) `generatePhoneLabel` for consistency.

3. **Settings UI** (`src/pages/Settings.tsx`, Apparence section, just under the logo upload):
   - New "Taille du logo sur le reçu" segmented control with 4 sizes (S / M / L / XL).
   - **Live preview card** showing a mini thermal-receipt mock (white background, monospace, the shop name + the logo at the chosen size) so the owner instantly sees how it'll print.
   - Save the chosen value via the existing `saveSettings({ logo_size })` flow.

4. The `useShopSettings` types (auto-generated) will pick up the new column after the migration; just cast where needed.

### Files touched

- `supabase/migrations/<new>.sql` — add `logo_size` column
- `src/hooks/useSales.ts` — invalidate `products-all` + low-stock + inventory-stats
- `src/pages/POS.tsx` — wire `useRealtimeSubscription` for products/sales
- `src/hooks/useProducts.ts` — drop `useAllProducts` staleTime to 30 s
- `src/lib/receiptPdf.ts` — use `settings.logo_size` to size the logo
- `src/pages/Settings.tsx` — size selector + live receipt preview

No breaking changes; existing shops default to `medium` (current behavior preserved).
