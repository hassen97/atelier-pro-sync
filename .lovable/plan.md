

# System Improvements: Sales Discounts, Returns Fixes, Receipt Modes

## 5 Changes to Implement

### 1. Discount System in POS
**Current state**: POS already allows editing `item.price` inline (line 474), but there's no explicit discount field — users just overwrite the price.

**Changes**:
- Add `discount` and `discountType` (`fixed` | `percent`) fields to `CartItem`
- Add a small discount input row per cart item (amount or % toggle)
- Compute effective price as `originalPrice - discount` (or `originalPrice * (1 - discount/100)`)
- Show discount badge + original price struck through in cart
- Receipt shows discount per item (e.g., "Remise: -5 TND")
- **No DB change needed** — discount is reflected in the `unit_price` stored in `sale_items` (actual sale price), `products.sell_price` stays untouched

**Files**: `src/pages/POS.tsx`, `src/lib/receiptPdf.ts` (add discount line per item)

### 2. Fix Product Returns — Stock & Statistics
**Current state**: `useCreateProductReturn` already restocks (line 114-127) and creates expense entries. But sale amount stays in statistics.

**Changes**:
- In `useCreateProductReturn`: after creating return, update the original sale's `total_amount` by subtracting the refund amount (or if full return, effectively zeroing the sale)
- Alternative (cleaner): In statistics hooks (`useStatistics`, `useDashboard`, `useProfit`), subtract `product_returns` refund amounts from sales totals when calculating stats
- **Chosen approach**: Deduct returned amounts in statistics queries by joining/subtracting `product_returns` data. This preserves the original sale record for audit while correcting stats.

**Files**: `src/hooks/useStatistics.ts`, `src/hooks/useDashboard.ts`, `src/hooks/useProfit.ts`

### 3. Fix Return Search
**Current state**: `useSearchSaleForReturn` fetches 20 sales and filters client-side. The filter checks `sale.id.startsWith(trimmed)` — UUIDs rarely match short queries. Product name is not checked at all.

**Changes**:
- Add product name matching: `item.product?.name?.toLowerCase().includes(trimmed.toLowerCase())`
- Add SKU matching: `item.product?.sku?.toLowerCase().includes(trimmed.toLowerCase())` (need to add `sku` to the select)
- Show recent sales by default when search is empty (remove the `if (!trimmed) return []` guard, show last 10 sales)
- Add dynamic search (debounced `useEffect` in `ProductReturnDrawer` that triggers search on typing, instead of requiring button click)
- Increase limit to 50 for broader results

**Files**: `src/hooks/useProductReturns.ts`, `src/components/returns/ProductReturnDrawer.tsx`

### 4. Simple Receipt Mode (Hide Parts Pricing)
**Current state**: `RepairReceiptDialog` has a `showLabor` checkbox. Receipt always shows item-by-item pricing.

**Changes**:
- Add a `receipt_mode` column to `shop_settings` table: `text, default 'detailed'` (values: `detailed`, `simple`)
- Update `ShopSettings` interface and `useShopSettings` to include `receipt_mode`
- In `RepairReceiptDialog`: read `settings.receipt_mode` as default. If `simple`:
  - Hide individual parts prices
  - Hide labor cost
  - Show only: repair description + total amount
- In `receiptPdf.ts`: when items array is empty (simple mode), skip the items table and just show description + total
- Add toggle in `RepairReceiptDialog` to switch between modes before printing

**Files**: `src/components/repairs/RepairReceiptDialog.tsx`, `src/lib/receiptPdf.ts`, `src/hooks/useShopSettings.ts`

### 5. Receipt Mode Setting in Settings Page
**Changes**:
- Add a "Mode reçu" card in the Settings page (under the shop/receipt tab)
- Radio or Select: "Reçu détaillé" / "Reçu simple (total seulement)"
- Saves to `shop_settings.receipt_mode`

**Files**: `src/pages/Settings.tsx`

## Database Migration
```sql
ALTER TABLE shop_settings ADD COLUMN receipt_mode text NOT NULL DEFAULT 'detailed';
```

## Files Summary
| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Add `receipt_mode` to `shop_settings` |
| `src/pages/POS.tsx` | Add discount fields per cart item, discount UI |
| `src/lib/receiptPdf.ts` | Show discount lines, support simple mode |
| `src/hooks/useProductReturns.ts` | Fix search (product name, SKU, show recent, broader filter) |
| `src/components/returns/ProductReturnDrawer.tsx` | Debounced search, show recent sales |
| `src/hooks/useStatistics.ts` | Subtract returned amounts from sales stats |
| `src/hooks/useDashboard.ts` | Subtract returned amounts from sales total |
| `src/hooks/useProfit.ts` | Account for returns in profit calc |
| `src/components/repairs/RepairReceiptDialog.tsx` | Simple/detailed mode toggle |
| `src/hooks/useShopSettings.ts` | Add `receipt_mode` field |
| `src/pages/Settings.tsx` | Add receipt mode setting card |

