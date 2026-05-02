## Goal
Implement a per-shop sequential lifetime ticket numbering for repairs, displayed as `[ShopInitials]-[Number]` (e.g. `CS-451`), with the number prominent on the thermal receipt and searchable from the repairs page.

## Important pre-decision (please confirm or override)

The `repairs` table already has an `integer ticket_number` column with a `BEFORE INSERT` trigger (`assign_repair_ticket_number`) that does exactly `MAX(ticket_number) + 1` per `user_id`. So instead of adding a new `receipt_number` column, **I will reuse the existing `ticket_number` column** (it is the same concept). This avoids duplicate columns and keeps the existing trigger working.

If you'd rather have a dedicated new `receipt_number` column anyway, say so and I'll add it side-by-side.

The DB query on Live shows historical gaps that need backfilling:

```text
shop A: 200 repairs, only 10 have a number (max=10)   ← needs backfill
shop B: 148 repairs, 123 numbered (max=125)            ← needs backfill
shop C: 108 repairs, 8 numbered (max=8)                ← needs backfill
shop D: 88/88 numbered                                  ← already clean
... etc.
```

## Plan

### 1. Database migration (backfill + concurrency safety)

- **Backfill**: For every shop, sort all existing repairs by `created_at ASC, id ASC` and assign `ticket_number = row_number()` — overwriting existing values so the sequence is contiguous from 1..N with no gaps. Done in a single SQL `UPDATE ... FROM (SELECT … row_number() OVER …)`.
- **NOT NULL + UNIQUE**: After backfill, set `ticket_number NOT NULL` and add a unique constraint `(user_id, ticket_number)` to guarantee no duplicates even under concurrent inserts.
- **Concurrency-safe trigger**: Replace `assign_repair_ticket_number` with a version that takes a transaction-level advisory lock keyed by `user_id` (`pg_advisory_xact_lock(hashtext('repairs:'||user_id::text))`) before computing `MAX+1`. Combined with the unique index, two simultaneous inserts cannot collide.
- **Safety**: Wrap backfill + constraint creation in one migration. The unique index is only created **after** the backfill completes.

### 2. Display: `[ShopInitials]-[Number]`

- Add a tiny helper `getShopInitials(shopName)` in `src/lib/utils.ts`:
  - take first letter of each word, uppercase, max 3 letters, fallback to `"REP"` if empty.
  - examples: `"Cybertek Shop"` → `CS`, `"Mon Atelier"` → `MA`.
- Add `formatTicketNumber(initials, n)` → `"CS-00451"` (5-digit zero-padded for thermal/scan consistency, but unpadded `CS-451` in UI badges).
- Surface `ticket_number` everywhere it's needed:
  - `useRepairs` SELECT list — add `ticket_number` to the selected columns (currently missing).
  - `Repair` UI type in `RepairCard.tsx` and `transformRepair` in `Repairs.tsx` — pass it through.
  - `RepairCard` header — replace the muted `repair.id` mono chip with a bold primary `CS-451` badge.
  - `RepairReceiptDialog` preview — same.
  - `CustomerDebts.tsx` — `reference: \`${initials}-${n}\`` instead of `REP-${id.slice(0,8)}`.

### 3. Thermal receipt (Epson)

In `src/lib/receiptPdf.ts`:

- Replace the `Référence : <uuid8>` field with a new prominent block at the very top, right under the shop info:
  - line: `TICKET N°` (small label, centered)
  - line: `CS-00451` (big, bold, e.g. 26px, centered, with extra top/bottom margin)
- Add a CSS class `.ticket-big { font-size: 26px; font-weight: 900; text-align: center; letter-spacing: 1px; margin: 4px 0 6px; }` (28px on 80mm, 22px on 58mm).
- Keep the existing barcode at the bottom but use the new value `CS-00451` instead of `REP-00451`.
- Same change applied to `generatePhoneLabel` (label sticker).

The pipeline will receive `ticketLabel: string` (already formatted), computed in `RepairReceiptDialog.tsx` from `settings.shop_name` + `repair.ticket_number`.

### 4. Search by raw number

Currently `Repairs.tsx` filters only the 100 loaded rows of the current page, so typing `451` would not find a ticket on another page.

- Add a `useRepairSearchByTicket(ticketNumber)` hook that, when the search query is purely numeric, runs a server-side query:

  ```ts
  supabase.from("repairs")
    .select("…same columns as useRepairs…, customer:customers(...)")
    .eq("user_id", effectiveUserId)
    .eq("ticket_number", parsedNumber)
    .limit(1)
  ```

- In `Repairs.tsx`:
  - Detect if `searchQuery.trim()` matches `/^\d+$/`. If yes, run the server hook and merge its result into `filteredRepairs` (dedup by id).
  - Also extend the existing client-side filter to match against `ticket_number` and the formatted `CS-451` string for partial typing.

- (Optional) If you have a separate global command palette beyond `AdminCommandPalette` (which is admin-only), wire it the same way — but I did not find a shop-side global search bar to wire it into; if I missed one, point me to it.

### 5. Verification

After each change I'll:

1. Confirm the migration applied cleanly and no duplicate `(user_id, ticket_number)` exist.
2. Check the Repairs page renders `CS-XXX` badges on every card.
3. Print one thermal receipt in preview and verify the big number is at the top.
4. Search `"451"` in the repairs page and verify the corresponding card surfaces.

## Files touched

- `supabase/migrations/<new>.sql` — backfill + unique index + advisory-lock trigger
- `src/lib/utils.ts` — `getShopInitials`, `formatTicketNumber`
- `src/lib/receiptPdf.ts` — big ticket header, barcode value, label
- `src/hooks/useRepairs.ts` — include `ticket_number` in select; add `useRepairSearchByTicket`
- `src/pages/Repairs.tsx` — pass ticket number through, server lookup on numeric search, filter update
- `src/components/repairs/RepairCard.tsx` — header badge
- `src/components/repairs/RepairReceiptDialog.tsx` — pass formatted label, preview update
- `src/pages/CustomerDebts.tsx` — reference label uses `CS-XXX`

## Out of scope (unless you say otherwise)

- Renaming the column to `receipt_number` (kept as `ticket_number`).
- Sales receipts numbering (only repairs were requested).
- Migrating existing barcodes already printed on customer copies (old `REP-XXXXX` will keep working in the customer's pocket but new prints use `CS-XXXXX`).
