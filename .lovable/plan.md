
# QR Code Smart Repair Tracking

## Overview
Add a QR code per repair that links to a **public, no-login** status page at `/track/{repair_id}` or `/track/{token}`. The token approach uses the existing `repair_id` (UUID) as the "secret" — UUIDs are unguessable (128-bit), so no separate token column is needed (matches existing pattern).

## Database Migration
Add column `tracking_token` (text, unique, not null default `gen_random_uuid()::text`) to `repairs` table.
Add a new **public RLS policy** on `repairs`:
```sql
CREATE POLICY "Anyone can view repair by tracking token"
ON repairs FOR SELECT
TO public
USING (true); -- scoped by token in query
```
Actually, since we filter by the token value, we just need a permissive SELECT policy allowing anonymous access when querying by token. Best pattern: add a new `repairs_public` view or a dedicated edge function / RPC that returns only safe columns (no internal notes, no user_id) for a given token. 

**Cleanest approach**: Create an RPC `get_repair_by_token(p_token text)` marked `SECURITY DEFINER` that returns only the public-safe fields. No new RLS policy needed — the function bypasses RLS and exposes only what we choose.

## What gets exposed publicly (only these fields):
- Repair short ID, device model, problem description, deposit date, status
- Customer first name only (or "Client" if none)
- Shop name & contact from `shop_settings`

## New Files

### `src/pages/RepairTracking.tsx` (public, no auth)
- Full-page mobile-optimized status tracker
- Shows shop branding (name, color), repair info, visual progress bar
- 7 display statuses mapped from 4 DB statuses + extended labels
- Informational message per status ("Votre appareil est en cours de diagnostic...")
- No sidebar, no auth required

### `src/components/repairs/QRCodeGenerator.tsx`
- Renders a QR code image using `qrcode` library (or canvas-based inline generation)
- Since `jsbarcode` is already installed but only does barcodes, we need **qrcode** package OR use a pure canvas/SVG approach to avoid adding a dependency
- **Decision**: Use the free `https://api.qrserver.com/v1/create-qr-code/` public API to render the QR as an `<img>` — zero dependencies, works offline for print since jsPDF can embed it as image

### Modified: `src/lib/receiptPdf.ts`
- Add `trackingUrl?: string` to `ReceiptData`
- When `trackingUrl` is set: render QR code image + "Scannez pour suivre votre réparation" text at bottom of thermal receipt

### Modified: `src/components/repairs/RepairReceiptDialog.tsx`
- Pass the tracking URL to the PDF generator

### Modified: `src/App.tsx`
- Add public route `/track/:token` → `<RepairTracking />`

## Database: RPC function (SECURITY DEFINER)
```sql
CREATE OR REPLACE FUNCTION public.get_repair_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', r.id,
    'tracking_token', r.tracking_token,
    'device_model', r.device_model,
    'problem_description', r.problem_description,
    'status', r.status,
    'deposit_date', r.deposit_date,
    'delivery_date', r.delivery_date,
    'customer_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Client'),
    'shop_name', ss.shop_name,
    'shop_phone', ss.phone,
    'shop_whatsapp', ss.whatsapp_phone,
    'brand_color', ss.brand_color
  )
  INTO result
  FROM repairs r
  LEFT JOIN customers c ON c.id = r.customer_id
  JOIN shop_settings ss ON ss.user_id = r.user_id
  WHERE r.tracking_token = p_token;
  
  RETURN result;
END;
$$;
```

## Status Display Mapping (7 visual stages from 4 DB statuses)
Since the DB has 4 statuses, the tracking page maps them to richer labels:
- `pending` → "En attente de diagnostic"
- `in_progress` → "En cours de réparation" (or show sub-label from `diagnosis` field)
- `completed` → "Réparation terminée — Prêt à récupérer"
- `delivered` → "Appareil livré"

Progress bar: 4 steps, fill based on status index.

## QR Code in PDF
The `RepairReceiptDialog` already calls `generateThermalReceipt`. We'll:
1. Build the tracking URL: `https://atelier-pro-sync.lovable.app/track/{tracking_token}`
2. Fetch the QR image from qrserver.com as a data URL and embed it via `doc.addImage()`
3. Print "Scannez ce QR code pour suivre votre réparation" below it

## Files Summary

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Add `tracking_token` to `repairs`, create `get_repair_by_token` RPC |
| `src/pages/RepairTracking.tsx` | New public page (no auth wrapper) |
| `src/App.tsx` | Add `/track/:token` route |
| `src/lib/receiptPdf.ts` | Add QR code section to thermal receipt |
| `src/components/repairs/RepairReceiptDialog.tsx` | Pass tracking URL to PDF |
| `src/hooks/useRepairs.ts` | `tracking_token` is now returned in queries (auto via `SELECT *`) |
