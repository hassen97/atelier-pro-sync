
## What was done vs what needs implementing

From reading the code:
- `App.tsx` — `/r/:token` route already added ✅
- `src/hooks/useShopSettings.ts` — `receipt_mode` exists but NO new fields (google_maps_url, warranty_days, show_payment_on_tracking, store_hours) ❌
- `src/pages/RepairTracking.tsx` — still the OLD version, no new sections ❌
- `src/components/repairs/RepairDialog.tsx` — no `estimated_ready_date` or `technician_note` fields ❌
- `src/pages/Settings.tsx` — no new config fields ❌
- Database — `repairs` table has NO `estimated_ready_date`, `technician_note`, `intake_photo_url` columns (not in the schema shown). `shop_settings` has NO `google_maps_url`, `warranty_days`, `show_payment_on_tracking`, `store_hours`. No `repair_status_history` table. No trigger.

## Implementation Plan

### 1. DB Migration
```sql
-- New table
CREATE TABLE public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- New columns on repairs
ALTER TABLE repairs 
  ADD COLUMN IF NOT EXISTS estimated_ready_date date,
  ADD COLUMN IF NOT EXISTS technician_note text,
  ADD COLUMN IF NOT EXISTS intake_photo_url text;

-- New columns on shop_settings
ALTER TABLE shop_settings 
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS warranty_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS show_payment_on_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_hours text;

-- Trigger function
CREATE OR REPLACE FUNCTION log_repair_status_change()...
CREATE TRIGGER trg_repair_status_log AFTER UPDATE ON repairs...

-- Updated get_repair_by_token RPC (replace existing)
```

### 2. Update `useShopSettings.ts`
Add: `google_maps_url`, `warranty_days` (default 30), `show_payment_on_tracking` (default false), `store_hours`

### 3. Full rewrite of `RepairTracking.tsx`
New sections in order:
- Header (shop + personalized greeting using customer_name from RPC)
- "Ready" green banner (when status = completed)
- Progress % + 6-stage visual timeline (Déposé → Diagnostic → En réparation → Test final → Prêt → Livré)
- Status card with message
- Estimated ready date card (if set)
- Technician note card (if set)
- Status history timeline (chronological from repair_status_history)
- Repair details
- Payment block (if show_payment_on_tracking)
- Intake photo (if set)
- Warranty (if completed/delivered)
- Contact (WhatsApp + Phone + Google Maps button)
- Pickup QR code

Also update the `get_repair_by_token` RPC to return all new fields + status_history array.

### 4. Update `RepairDialog.tsx`
Add two new fields at end of form:
- `estimated_ready_date` — date input
- `technician_note` — textarea with label "Note visible par le client"

Also update the `repair` prop interface and `onSubmit` to pass these through.

### 5. Update `src/pages/Settings.tsx`
In the existing shop settings tab (or receipts tab), add a new card with:
- Google Maps URL input
- Warranty days input (number)
- Toggle for "Afficher le paiement sur la page de suivi"
- Store hours textarea

### 6. Update `src/hooks/useRepairs.ts`
The `RepairInsert`/`RepairUpdate` types will automatically include new columns once migration runs. Just need `RepairDialog` changes.

### 7. Update `Repairs.tsx` / `RepairCard.tsx`
Pass `estimated_ready_date` and `technician_note` through the edit dialog.

## Files to change
1. `supabase/migrations/new.sql` — DB migration
2. `src/pages/RepairTracking.tsx` — Full rewrite
3. `src/hooks/useShopSettings.ts` — Add 4 new fields
4. `src/components/repairs/RepairDialog.tsx` — Add 2 new fields
5. `src/pages/Repairs.tsx` — Pass new fields to dialog
6. `src/components/repairs/RepairCard.tsx` — Show estimated_ready_date
7. `src/pages/Settings.tsx` — Add new config card
