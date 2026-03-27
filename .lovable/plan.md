

# Add Proof-of-Payment Source Picker (Camera vs Gallery)

## Problem
The `SupplierPaymentDialog` uses `capture="environment"` which forces the camera on mobile, preventing users from selecting existing screenshots or photos from their gallery.

## Solution
Create a reusable `ProofPickerSheet` bottom-sheet component that offers two choices: Camera or Gallery/Files. Replace the raw file input in `SupplierPaymentDialog` (and optionally `Checkout.tsx`) with this picker.

## Changes

### 1. New Component: `src/components/ui/ProofPickerSheet.tsx`

A Drawer (bottom-sheet on mobile) with two large buttons:
- **"Utiliser l'appareil photo"** — Camera icon, triggers a hidden `<input type="file" accept="image/*" capture="environment" />`
- **"Choisir dans la galerie/fichiers"** — Images icon, triggers a hidden `<input type="file" accept="image/*" />` (no `capture` attribute, opens native file picker)

On file selection, calls `onFileSelected(file: File)` and closes.

### 2. Update `SupplierPaymentDialog.tsx`

- Remove the raw `<Input type="file" capture="environment" />` block (lines 124-134)
- Replace with a styled button "Choisir un fichier" that opens the `ProofPickerSheet`
- When a file is selected, show a thumbnail preview + filename instead of "Aucun fichier choisi"
- Add an "X" button to clear the selection

### 3. Update `Checkout.tsx` (same pattern)

Apply the same `ProofPickerSheet` to the checkout proof upload for consistency across the app.

## Technical Details

- Uses the existing `Drawer` component from `src/components/ui/drawer.tsx` for the bottom-sheet behavior
- Two hidden `<input>` elements: one with `capture="environment"` (camera), one without (gallery)
- File state remains managed by the parent component
- Thumbnail preview via `URL.createObjectURL(file)`

| File | Change |
|------|--------|
| `src/components/ui/ProofPickerSheet.tsx` | New reusable bottom-sheet picker |
| `src/components/suppliers/SupplierPaymentDialog.tsx` | Replace file input with ProofPickerSheet + thumbnail preview |
| `src/pages/Checkout.tsx` | Same treatment for checkout proof upload |

