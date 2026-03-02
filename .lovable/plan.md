

# Add Toggle to Show/Hide "Main d'oeuvre" on Repair Receipt

## What Changes

A checkbox toggle will be added to the repair receipt preview dialog, letting you choose whether "Main d'oeuvre" (labor cost) appears on the printed receipt. By default it will be **hidden** (unchecked), so customers won't see the labor line — only the total.

## How It Works

- A `showLabor` state (default `false`) controls visibility
- The checkbox appears between the items list and the print button: **"Afficher main d'oeuvre sur le reçu"**
- When unchecked: the labor line is hidden in both the preview and the PDF
- When checked: it shows as before with the labor amount as a separate line
- The total amount stays the same regardless — it always includes labor

## Single File Change

### `src/components/repairs/RepairReceiptDialog.tsx`

1. Add `useState<boolean>(false)` for `showLabor`
2. Add a `Checkbox` + label below the items section in the preview
3. Conditionally render the "Main d'oeuvre" line in the preview based on `showLabor`
4. In `handlePrint`, conditionally include the labor item in the `items` array passed to `generateThermalReceipt`
5. Move the print button below the checkbox so the flow is: preview content → toggle → print

