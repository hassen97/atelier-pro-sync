

# Returns & RMA Module — Comprehensive Plan

This is a large feature spanning database changes, new UI components, hooks, and business logic. I'll break it into manageable phases.

## Database Changes (Migration)

### New table: `product_returns`
Tracks customer product returns (from sales).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | owner |
| sale_id | uuid | original sale |
| sale_item_id | uuid | nullable, specific item |
| customer_id | uuid | nullable |
| product_id | uuid | nullable |
| product_name | text | |
| quantity | int | |
| unit_price | numeric | |
| refund_amount | numeric | |
| refund_method | text | `cash`, `store_credit` |
| stock_destination | text | `available`, `defective` |
| reason | text | |
| notes | text | nullable |
| approved_by | uuid | nullable, for manager approval |
| status | text | `pending`, `approved`, `completed` |
| created_at | timestamptz | |

RLS: Owner or team can manage/view (same pattern as other tables).

### Alter `defective_parts` table
Add new statuses for supplier RMA flow:

- Add column: `sent_date` (timestamptz, nullable) — when sent to supplier
- Add column: `resolution` (text, nullable) — `replaced`, `refunded`, `rejected`
- Add column: `refund_amount` (numeric, default 0) — supplier credit amount
- Update status values to support: `pending`, `sent`, `replaced`, `refunded`, `rejected`

### Alter `warranty_tickets` table
- Add column: `original_repair_link_note` (text, nullable) — for traceability display

No changes to `repairs` table needed — it already has `is_warranty` and `warranty_ticket_id`.

## Phase 1: Customer Product Returns

### New hook: `src/hooks/useProductReturns.ts`
- `useProductReturns()` — fetch all returns
- `useSearchSaleForReturn()` — search sales by barcode, invoice number, or customer phone
- `useCreateProductReturn()` — creates return entry, handles:
  - If `stock_destination === "available"`: adds quantity back to `products.quantity`
  - If `stock_destination === "defective"`: creates entry in `defective_parts`
  - If `refund_method === "cash"`: creates negative expense entry for daily cash report
  - If `refund_method === "store_credit"`: decreases `customers.balance` (negative = credit)

### New component: `src/components/returns/ProductReturnDrawer.tsx`
- Sheet/Drawer (right side) instead of Dialog
- Search bar to find original sale (by barcode scan or invoice ref)
- Shows sale items, user picks which to return with quantity
- Toggle: "Stock disponible" vs "Défectueux/Perte"
- Toggle: "Remboursement espèces" vs "Avoir client"
- Auto-calculates refund amount
- Manager approval required if refund > configurable threshold

## Phase 2: Warranty Repairs Enhancement

### Changes to existing `WarrantyDialog` → convert to `WarrantyDrawer`
- Move from `Dialog` to `Sheet` (right-side drawer)
- Default price to 0 DT when opened as warranty return
- Parts picked from inventory are logged as expense (loss), not sale
- Add link/badge on original repair card showing "Ticket garantie lié"

### Changes to `RepairCard.tsx`
- If repair has `warranty_ticket_id` or a warranty ticket references it, show a "Garantie" badge with link

### Changes to `useCreateWarrantyTicket`
- When parts are used, create an expense entry (category: "Perte garantie") instead of billing customer
- The cost is tracked for the Loss Report

## Phase 3: Supplier Returns (RMA) Enhancement

### Enhanced `DefectivePartsList` → `SupplierRMAList`
- Expanded status tracking: Pending → Sent → Replaced / Refunded / Rejected
- Date tracking for when part was sent
- When status changes to "Refunded": auto-decrease supplier debt via `useUpdateSupplierBalance` and log a transaction in `supplier_transactions`
- When status changes to "Replaced": prompt to add replacement part to stock

### New hook additions to `useWarranty.ts`
- `useUpdateDefectivePartRMA()` — handles status transitions with financial side-effects
- `useRMADashboardStats()` — counts by status for the dashboard cards

## Phase 4: Unified Returns Page Redesign

### Redesign `src/pages/Warranty.tsx` → becomes the unified Returns & RMA hub

Layout with Tabs:
1. **Retours Produits** — customer product returns list + "Nouveau retour" button → opens `ProductReturnDrawer`
2. **Garantie SAV** — warranty tickets list + "Nouveau ticket" button → opens `WarrantyDrawer`
3. **RMA Fournisseur** — defective parts RMA dashboard with status pipeline

### Header stats:
- Total returns this month
- Total loss (warranty + defective parts cost)
- Pending RMA count

### Quick Scan bar at the top
- Scanning a barcode searches across sales and repairs to find last transaction involving that item/serial

## Phase 5: Loss Report

### New component: `src/components/returns/LossReport.tsx`
- Embedded as a sub-tab or section in the Returns page
- Monthly breakdown:
  - Warranty repair costs (parts used on warranty tickets)
  - Customer refunds (from `product_returns`)
  - Written-off defective parts
- Uses existing data from `warranty_tickets`, `product_returns`, `defective_parts`, and `expenses` (category: "Perte garantie")
- Simple bar chart (recharts) showing monthly loss trend

## Phase 6: Safety & Validation

- **Negative stock prevention**: All stock deduction operations use `Math.max(0, ...)` (already in place, will verify everywhere)
- **Manager approval**: For refunds over a threshold (stored in `shop_settings` or hardcoded initially), the return stays in `pending` status until a super_admin approves it
- **All UI in French** as specified

## Files Created/Modified Summary

**New files:**
- `src/hooks/useProductReturns.ts`
- `src/components/returns/ProductReturnDrawer.tsx`
- `src/components/returns/WarrantyDrawer.tsx` (refactored from WarrantyDialog)
- `src/components/returns/SupplierRMAList.tsx` (enhanced DefectivePartsList)
- `src/components/returns/LossReport.tsx`
- `src/components/returns/QuickScanReturn.tsx`

**Modified files:**
- `src/pages/Warranty.tsx` — complete redesign with tabs
- `src/hooks/useWarranty.ts` — add RMA mutations with financial side-effects
- `src/components/repairs/RepairCard.tsx` — warranty link badge
- `src/components/repairs/DefectivePartsList.tsx` — deprecated, replaced by SupplierRMAList

**Migration:** 1 migration for `product_returns` table + `defective_parts` alterations

This is a large module. I recommend implementing it in the phases above, starting with the database migration and Phase 1 (Customer Returns), then iterating.

