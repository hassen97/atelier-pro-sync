

# Repair Tracking Page Enhancements

## Overview
Enhance the public tracking page with priority features (estimated ready time, technician notes, status history) plus additional improvements (payment visibility, Google Maps, warranty info, pickup QR, expanded timeline, dark mode).

## Database Changes

### 1. New table: `repair_status_history`
Automatic log of every status change.
```sql
CREATE TABLE public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No RLS needed — accessed only via SECURITY DEFINER RPC
```

### 2. New columns on `repairs`
```sql
ALTER TABLE repairs ADD COLUMN estimated_ready_date date;
ALTER TABLE repairs ADD COLUMN technician_note text;
ALTER TABLE repairs ADD COLUMN intake_photo_url text;
```

### 3. New columns on `shop_settings`
```sql
ALTER TABLE shop_settings ADD COLUMN google_maps_url text;
ALTER TABLE shop_settings ADD COLUMN warranty_days integer NOT NULL DEFAULT 30;
ALTER TABLE shop_settings ADD COLUMN show_payment_on_tracking boolean NOT NULL DEFAULT false;
ALTER TABLE shop_settings ADD COLUMN store_hours text;
```

### 4. Trigger: auto-log status changes
```sql
CREATE OR REPLACE FUNCTION log_repair_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO repair_status_history (repair_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  IF OLD.technician_note IS DISTINCT FROM NEW.technician_note AND NEW.technician_note IS NOT NULL THEN
    INSERT INTO repair_status_history (repair_id, status, note)
    VALUES (NEW.id, NEW.status, NEW.technician_note);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_repair_status_log
AFTER UPDATE ON repairs
FOR EACH ROW EXECUTE FUNCTION log_repair_status_change();
```

### 5. Update `get_repair_by_token` RPC
Add new fields to the returned JSON:
- `estimated_ready_date`, `technician_note`, `intake_photo_url`
- `labor_cost`, `parts_cost`, `total_cost`, `amount_paid` (for payment block)
- `google_maps_url`, `warranty_days`, `show_payment_on_tracking`, `store_hours` (from shop_settings)
- `status_history` (sub-query from `repair_status_history`)

## Frontend Changes

### `src/pages/RepairTracking.tsx` — Major rewrite
**Expanded timeline** (6 stages instead of 4):
- Déposé → Diagnostic → En réparation → Test final → Prêt à récupérer → Livré

Map DB statuses: `pending` → stage 1, `in_progress` → stage 3, `completed` → stage 5, `delivered` → stage 6.

**New sections** (in order on page):
1. **Header** — shop name, personalized greeting (use actual name or "Bonjour" fallback), repair ref
2. **"Ready" banner** — prominent green banner when status = `completed`
3. **Progress bar + percentage** — "Réparation complétée à 83%"
4. **Status card** — current status with descriptive message
5. **Estimated ready time** — if `estimated_ready_date` is set
6. **Technician note** — if `technician_note` is set
7. **Status history timeline** — chronological list from `status_history`
8. **Repair details** — device model, problem, deposit date, ref
9. **Payment block** — if `show_payment_on_tracking` is true (total, paid, remaining)
10. **Intake photo** — if `intake_photo_url` is set
11. **Warranty info** — if status is `completed` or `delivered`, show "Garantie: X jours"
12. **Contact + Google Maps** — WhatsApp, phone, maps button
13. **Pickup QR code** — QR containing repair ref for in-store scan

**Visual polish**: larger icons (w-10 h-10 for timeline), smooth animations, color-coded stages, subtle shadows, dark mode via `prefers-color-scheme` media query.

### `src/components/repairs/RepairDialog.tsx`
Add fields:
- `estimated_ready_date` (date input)
- `technician_note` (textarea, "Note visible par le client")

### `src/pages/Repairs.tsx` / `RepairCard.tsx`
- Show/edit `technician_note` inline or in the edit dialog
- Show `estimated_ready_date` on the card

### `src/pages/Settings.tsx`
Add in the shop settings tab:
- Google Maps URL input
- Warranty days input
- Toggle "Afficher le paiement sur la page de suivi"
- Store hours textarea

### `src/hooks/useShopSettings.ts`
Add new fields to the ShopSettings interface.

## Implementation Priority
1. DB migration (table + columns + trigger + updated RPC)
2. RepairTracking.tsx rewrite (all new sections)
3. RepairDialog.tsx (estimated date + technician note fields)
4. Settings.tsx (new config fields)
5. Visual polish (dark mode, animations)

## Files Summary

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | New table, columns, trigger, updated RPC |
| `src/pages/RepairTracking.tsx` | Full rewrite with all new sections |
| `src/components/repairs/RepairDialog.tsx` | Add estimated_ready_date + technician_note |
| `src/pages/Settings.tsx` | Add maps URL, warranty days, payment toggle, store hours |
| `src/hooks/useShopSettings.ts` | Add new fields |
| `src/hooks/useRepairs.ts` | Types updated automatically via Supabase types |

