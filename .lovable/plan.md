

# Implementation Plan: Warranty/RMA, Shop Activity Tracking, and Admin Enhancements

This plan covers three major features requested. Each is broken into clear steps.

---

## PART 1: Warranty and Returns (RMA) System

### What it does
Allows shop owners to process warranty returns linked to original repairs. Tracks defective parts separately and visually distinguishes warranty tickets in the repair list.

### Database Changes

**New table: `warranty_tickets`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) -- shop owner
- `original_repair_id` (uuid, NOT NULL) -- links to the original repair
- `return_reason` (text) -- "supplier_defect", "tech_error", "customer_damage"
- `action_taken` (text) -- free text describing what was done
- `labor_cost` (numeric, default 0)
- `parts_cost` (numeric, default 0)
- `total_cost` (numeric, default 0)
- `amount_paid` (numeric, default 0)
- `status` (text, default "pending") -- pending, in_progress, completed, delivered
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamps)
- RLS: same pattern as repairs (owner or team member)

**New table: `defective_parts`** (RMA/Defective Parts list)
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `warranty_ticket_id` (uuid, NOT NULL)
- `product_id` (uuid, nullable) -- the defective part from inventory
- `product_name` (text) -- snapshot of name
- `quantity` (integer, default 1)
- `supplier_id` (uuid, nullable) -- for returning to supplier
- `status` (text, default "pending") -- pending, returned_to_supplier, written_off
- `created_at` (timestamp)
- RLS: same owner/team pattern

**Modify `repairs` table:**
- Add column `is_warranty` (boolean, default false)
- Add column `warranty_ticket_id` (uuid, nullable) -- reverse link for quick access

### New Files

1. **`src/hooks/useWarranty.ts`** -- CRUD hooks for warranty_tickets and defective_parts, search by IMEI/ticket ID/phone
2. **`src/components/repairs/WarrantyDialog.tsx`** -- Search form (IMEI, Ticket ID, Phone) to find original repair, then warranty form with:
   - Display of original repair details (date, device, parts, price)
   - Dropdowns for Return Reason and Action Taken
   - Price defaulting to 0.00 but editable
   - Part replacement selector (deducts from stock, adds to defective_parts)
3. **`src/components/repairs/DefectivePartsList.tsx`** -- View/manage RMA parts list accessible from inventory or settings

### Modified Files

4. **`src/pages/Dashboard.tsx`** -- Add "Process Warranty/Return" button
5. **`src/pages/Repairs.tsx`** -- Add warranty tab/filter, visually highlight warranty tickets (orange/purple border)
6. **`src/components/repairs/RepairCard.tsx`** -- Add visual indicator (orange/purple badge) for warranty-linked repairs
7. **`src/hooks/useRepairs.ts`** -- Include `is_warranty` and `warranty_ticket_id` in queries

### Inventory Sync Logic
When a part is replaced during warranty:
1. New replacement part is deducted from `products` stock (quantity - 1)
2. Old defective part is inserted into `defective_parts` table with status "pending"
3. Shop owner can later mark it as "returned_to_supplier" or "written_off"

---

## PART 2: Shop Activity Tracking and Filtering (Admin)

### What it does
Track when each shop owner was last online. Show live status indicators in the admin shops table with smart filters.

### Database Changes

**Modify `profiles` table:**
- Add column `last_online_at` (timestamp with time zone, nullable)

### New/Modified Files

1. **`src/hooks/usePresence.ts`** (new) -- Hook that updates `last_online_at` on the user's profile every 2 minutes via a `setInterval` + on page visibility change. Uses a simple Supabase update.

2. **`src/contexts/AuthContext.tsx`** (modified) -- Integrate `usePresence` when user is authenticated

3. **`supabase/functions/admin-manage-users/index.ts`** (modified) -- In the "list" action, include `last_online_at` from profiles in the response

4. **`src/hooks/useAdmin.ts`** (modified) -- Add `last_online_at` to the `ShopOwner` interface

5. **`src/components/admin/AdminShopsView.tsx`** (modified) -- Major updates:
   - Add smart filter buttons above table: "All Shops", "Active Now" (last 5 min), "Active Last 24h", "Inactive (7+ days)"
   - Show status dot next to each shop:
     - Green = online now (last_online_at within 5 minutes)
     - Yellow = away (within 1 hour)
     - Red = offline (older than 1 hour)
   - Show "Last Seen" time (e.g., "il y a 3 minutes", "il y a 2 jours")

### Online Status Logic
```text
Green (Online):  last_online_at within last 5 minutes
Yellow (Away):   last_online_at within last 1 hour
Red (Offline):   last_online_at older than 1 hour or null
```

### Filter Logic
```text
All Shops:       No filter
Active Now:      last_online_at within 5 minutes
Active Last 24h: last_online_at within 24 hours
Inactive (7+):   last_online_at older than 7 days or null
```

---

## PART 3: Shop Management Table and Analytics Enhancements (Admin)

### What it does
Improve the admin shop management with a proper table layout showing key data, action menus, and global summary cards.

### Modified Files

1. **`src/components/admin/AdminShopsView.tsx`** -- Replace the current card list with a proper table:
   - Columns: Shop Name, Owner (username), Creation Date, Online Status, Total Repairs
   - Action menu per row: Reset Password, Lock/Unlock (Kill Switch), Delete Shop
   - These actions already exist, just reorganized into a table dropdown

2. **`src/components/admin/AdminOverview.tsx`** (modified) -- Update summary cards:
   - "Total Registered Shops" (already exists as "Boutiques actives")
   - "Currently Active Shops" (new -- count shops with last_online_at within 5 min)
   - "Global Total Repairs" (already exists)

3. **`src/hooks/useAdmin.ts`** (modified) -- Add `active_now_count` to AdminStats (calculated from last_online_at data)

4. **`supabase/functions/admin-manage-users/index.ts`** (modified) -- Compute `active_now_count` in the list action by counting profiles where `last_online_at` is within last 5 minutes

---

## Technical Summary

### Database Migrations (1 migration)
```sql
-- Warranty tickets table
CREATE TABLE warranty_tickets (...);
ALTER TABLE warranty_tickets ENABLE ROW LEVEL SECURITY;
-- Policies for owner/team access

-- Defective parts table
CREATE TABLE defective_parts (...);
ALTER TABLE defective_parts ENABLE ROW LEVEL SECURITY;
-- Policies for owner/team access

-- Add warranty flag to repairs
ALTER TABLE repairs ADD COLUMN is_warranty boolean NOT NULL DEFAULT false;
ALTER TABLE repairs ADD COLUMN warranty_ticket_id uuid;

-- Add last_online_at to profiles
ALTER TABLE profiles ADD COLUMN last_online_at timestamptz;

-- Enable realtime on warranty_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE warranty_tickets;
```

### New Files (4)
- `src/hooks/useWarranty.ts`
- `src/hooks/usePresence.ts`
- `src/components/repairs/WarrantyDialog.tsx`
- `src/components/repairs/DefectivePartsList.tsx`

### Modified Files (9)
- `src/pages/Dashboard.tsx` -- warranty button
- `src/pages/Repairs.tsx` -- warranty filter/highlight
- `src/components/repairs/RepairCard.tsx` -- warranty visual indicator
- `src/hooks/useRepairs.ts` -- include warranty fields
- `src/hooks/useAdmin.ts` -- last_online_at + active count
- `src/components/admin/AdminShopsView.tsx` -- table layout + status + filters
- `src/components/admin/AdminOverview.tsx` -- active shops card
- `src/contexts/AuthContext.tsx` -- presence tracking
- `supabase/functions/admin-manage-users/index.ts` -- last_online_at + active count

### Execution Order
1. Database migration (all schema changes)
2. Presence tracking (usePresence + AuthContext)
3. Admin enhancements (edge function + admin components)
4. Warranty system (hooks, dialog, repair page updates)

