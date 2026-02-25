

# Selective Data Reset - Choose What to Delete

## Overview
Replace the current "delete everything" button with a dialog that lets you pick exactly which data categories to delete. You'll see checkboxes for each type (products, customers, repairs, etc.) and can choose one or multiple.

## How It Will Work
1. Click "Reinitialiser les donnees" in Settings > Security
2. A dialog opens with checkboxes for each data category:
   - Produits et categories
   - Clients
   - Fournisseurs
   - Reparations (et pieces utilisees)
   - Ventes (et articles vendus)
   - Factures
   - Depenses
3. Select which ones to delete (or "Select all")
4. Type SUPPRIMER to confirm
5. Only the selected categories are deleted

## Technical Details

### File: `src/components/settings/ResetDataDialog.tsx`
- Add checkboxes for each data category using the existing Checkbox component
- Add a "Select all / Deselect all" toggle
- Pass selected categories to `onConfirm`
- Update the confirmation list to only show selected items
- Disable confirm button if nothing is selected

### File: `src/hooks/useSecuritySettings.ts`
- Change `resetAllData` to accept a `categories: string[]` parameter
- Conditionally delete only the selected tables:
  - `"products"` -> deletes products + categories
  - `"customers"` -> deletes customers
  - `"suppliers"` -> deletes suppliers
  - `"repairs"` -> deletes repairs + repair_parts
  - `"sales"` -> deletes sales + sale_items
  - `"invoices"` -> deletes invoices
  - `"expenses"` -> deletes expenses
- Maintain proper deletion order (child tables before parent tables)
- Only reload if at least one category was successfully deleted

### File: `src/pages/Settings.tsx`
- Minor update to pass the new signature through (the `ResetDataDialog` will now pass categories to `onConfirm`)

