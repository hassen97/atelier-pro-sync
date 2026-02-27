
# Upgrade Fournisseurs: Ledger, Purchase History, Communication & Payment Proofs

## Overview

This is a major upgrade of the Suppliers module. It requires:
1. New database tables for tracking financial transactions and purchase history
2. A new supplier detail/drawer view with tabs
3. WhatsApp/Phone communication buttons
4. "Achat à Crédit" toggle in the product form
5. Payment proof file upload (storage)
6. Recalculate debt verification button

---

## Database Changes (Migrations Required)

### New Table: `supplier_transactions`
Tracks every financial event (purchases, payments) for a supplier.

```sql
CREATE TABLE public.supplier_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  type text NOT NULL, -- 'purchase' | 'payment'
  description text,
  amount numeric NOT NULL DEFAULT 0,
  running_balance numeric NOT NULL DEFAULT 0,
  proof_url text, -- for payment receipt photos
  status text NOT NULL DEFAULT 'pending', -- 'paid' | 'pending'
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

RLS policies: `owner or team can manage/view` (same pattern as existing tables).

### New Table: `supplier_purchases`
Tracks individual physical items purchased from a supplier.

```sql
CREATE TABLE public.supplier_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  transaction_id uuid REFERENCES supplier_transactions(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

RLS policies: same pattern.

### Storage Bucket: `supplier-proofs`
New public bucket for payment proof photos.

---

## New/Updated Files

### 1. `src/hooks/useSuppliers.ts` (update)
Add new hooks:
- `useSupplierTransactions(supplierId)` — fetches ledger for a supplier
- `useSupplierPurchases(supplierId)` — fetches purchase items for a supplier
- `useCreateSupplierTransaction()` — inserts a transaction record
- `useRecalculateSupplierBalance()` — recalculates debt from transaction sum
- Update `useUpdateSupplierBalance()` to also insert a `supplier_transactions` record of type `payment` with proof URL

### 2. `src/components/suppliers/SupplierDetailSheet.tsx` (new)
A `Sheet` (slide-over) that opens when clicking a supplier card. Contains:

**Header section:**
- Supplier name, avatar initials
- Balance badge (À payer / Soldé)
- Action buttons row: WhatsApp button, Phone call button, Edit button

**WhatsApp logic:**
```typescript
function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^00/, '+').replace(/^\+?216/, '216');
}
const waUrl = `https://wa.me/${cleanPhone(supplier.phone)}?text=${encodeURIComponent(template)}`;
```

**Message template picker:**
- Small popover with 2 quick templates
- Template 1: `Bonjour [Nom], je souhaite passer une commande...`
- Template 2: `Bonjour [Nom], je viens de vous envoyer un paiement de [Montant]...`

**Tabbed body** (`Tabs` from `@radix-ui/react-tabs`):

**Tab 1 — Historique Financier (Grand Livre):**
- Table: Date | Type | Description | Montant | Solde Courant
- Type shown as colored badge: `Achat` (destructive) / `Paiement` (success)
- Recalculate button (admin): triggers `useRecalculateSupplierBalance`
- Empty state message if no transactions

**Tab 2 — Historique des Achats:**
- Table: Date | Article | Qté | Prix Unitaire | Total
- Links to product if `product_id` is set

### 3. `src/components/suppliers/SupplierPaymentDialog.tsx` (update)
Add a file upload field for payment proof:
```tsx
<div className="space-y-2">
  <Label>Preuve de paiement (optionnel)</Label>
  <Input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
</div>
```
- On submit: upload file to `supplier-proofs` bucket, get public URL, pass to `useUpdateSupplierBalance`
- After payment: insert a `supplier_transactions` record of type `payment` with `status: 'paid'` and `proof_url`

### 4. `src/pages/Suppliers.tsx` (update)
- Each card becomes clickable (or has a "Voir détails" button) → opens `SupplierDetailSheet`
- Add WhatsApp icon button and Phone icon button directly on the card header (quick access)
- Keep existing dropdown for Edit/Delete

### 5. `src/components/inventory/ProductSheet.tsx` (update)
Add "Achat à Crédit" section at the bottom of the form (before submit):
```tsx
<div className="space-y-3 border rounded-lg p-3 bg-muted/30">
  <div className="flex items-center justify-between">
    <Label>Achat à Crédit</Label>
    <Switch checked={isCreditPurchase} onCheckedChange={setIsCreditPurchase} />
  </div>
  {isCreditPurchase && (
    <Combobox
      options={supplierOptions}
      value={selectedSupplierId}
      onValueChange={setSelectedSupplierId}
      placeholder="Sélectionner le fournisseur..."
    />
  )}
</div>
```
- When product is created/saved with `isCreditPurchase = true`:
  - Call `useCreateSupplierTransaction()` to add a purchase transaction
  - Call `useUpdateSupplierBalance()` to reduce supplier balance by `cost_price * quantity`
  - Insert into `supplier_purchases` with item name, qty, unit price

---

## Implementation Sequence

1. **Database migration** — create `supplier_transactions` and `supplier_purchases` tables + storage bucket
2. **Update `useSuppliers.ts`** — add new hooks
3. **Create `SupplierDetailSheet.tsx`** — the full detail panel with tabs and communication
4. **Update `SupplierPaymentDialog.tsx`** — add file upload for payment proof
5. **Update `Suppliers.tsx`** — wire up the detail sheet, add WhatsApp/phone buttons on cards
6. **Update `ProductSheet.tsx`** — add the "Achat à Crédit" toggle with supplier selector

---

## Technical Notes

- Phone number sanitization: strip all spaces, convert `00XXX` to `+XXX`, ensure the WhatsApp URL uses digits only
- All currency amounts in templates use the `format()` function from `useCurrency`
- The `running_balance` in the ledger is computed client-side from the sorted transaction list (no DB trigger needed), or recalculated with the Recalculate button
- File uploads use the existing Supabase storage client pattern already in the codebase
- No new dependencies required — `Switch`, `Tabs`, `Sheet`, `Table` components are all already installed
