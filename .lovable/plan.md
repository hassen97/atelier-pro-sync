## Problem

Looking at ticket **CSS-89** in Cool Store SBZ, the DB row has both `problem_description = ""` and `category_id = NULL`. Two distinct bugs + a styling tweak.

## Root Causes

1. **`category_id` dropped on save** — `src/pages/Repairs.tsx` `handleRepairSubmit` builds `repairData` without including `category_id`. The form collects it but it's never forwarded to the DB.
2. **`problem_description` saves empty** — schema in `RepairDialog.tsx` has `.optional().default("")`, no `min(1)` validation.
3. **Category never displayed** — not selected in `useRepairs`, not transformed in `Repairs.tsx`, not rendered in `RepairCard`, not in `ReceiptData`.
4. **Ticket number font too large vs "TICKET N°" caption** — should match.

## Plan

### A. Fix the save path
- `src/pages/Repairs.tsx` `handleRepairSubmit`: add `category_id?: string` to data type and include `category_id: data.category_id || null` in `repairData`.
- `src/components/repairs/RepairDialog.tsx`: change schema to `problem_description: z.string().min(1, "Le problème est requis")`, drop `.default("")`.

### B. Fetch & propagate category
- `src/hooks/useRepairs.ts`: add `category_id` and join `category:categories(id, name)` to both SELECTs (`useRepairs` and `useRepairByTicketNumber`).
- `src/pages/Repairs.tsx`: extend `RepairWithCustomer` with `category_id` + `category {id,name}`. In `transformRepair`, pass through `category: dbRepair.category?.name || null` and `category_id`.

### C. Display on card
- `src/components/repairs/RepairCard.tsx`: add `category?: string | null` to `Repair` interface; render a small muted line with a Tag icon under the issue when present.

### D. Display on receipts
- `src/lib/receiptPdf.ts`: add `category?: string | null` to `ReceiptData` and `PhoneLabelData`. Render `Catégorie : X` in the customer/device block of `generateThermalReceipt` and a `Catégorie:` line in `generatePhoneLabel` (between Appareil and Problème).
- `src/components/repairs/RepairReceiptDialog.tsx`: include `category: (repair as any).category || null` in both `generateThermalReceipt` and `generatePhoneLabel` payloads.

### E. Equalize ticket label font on receipts
- `src/lib/receiptPdf.ts` CSS: `.ticket-big` from `28px` → `11px` (match `.ticket-label-small`); in `generatePhoneLabel` inline CSS, `.ticket-huge` from `22px` → `10px` (match `.ticket-label-tiny`). Keep bold + center.

## Files Edited
- `src/pages/Repairs.tsx`
- `src/components/repairs/RepairDialog.tsx`
- `src/hooks/useRepairs.ts`
- `src/components/repairs/RepairCard.tsx`
- `src/components/repairs/RepairReceiptDialog.tsx`
- `src/lib/receiptPdf.ts`

## Not changed
- No DB migration (`category_id` and `problem_description` already exist).
- Existing CSS-89 row stays empty — can be re-edited now that the form correctly saves both fields.
