
# Global Thermal Print Sharpness + QR Half-Size

## Goal
Make every thermal print output sharper on Epson TM-T20X and similar printers by applying a consistent high-contrast “Thermal Profile” to POS receipts, repair tickets/labels, invoices, and supplier payment proof printing. Also reduce the repair tracking QR code to 50% of its current printed size while keeping it centered and scanner-readable.

## Implementation Plan

### 1. Add a reusable Thermal Print CSS profile
Create a shared print CSS helper in `src/lib/receiptPdf.ts` so every generated print window uses the same rules:

- Pure black text: `#000000`
- Pure white backgrounds: `#FFFFFF`
- No gray tones, shadows, blur, opacity, gradients, or filters
- Thermal sharpness rules:
  - `text-rendering: optimizeSpeed`
  - `-webkit-font-smoothing: none`
  - `-moz-osx-font-smoothing: grayscale/unset where appropriate`
  - `image-rendering: pixelated`
  - `print-color-adjust: exact`
  - `-webkit-print-color-adjust: exact`
- Monospace typography for printed data:
  - `"Courier New", Courier, "Liberation Mono", monospace`
- Thermal roll calibration:
  - `@page { margin: 0; }`
  - `body { margin: 0; padding: 5mm; }`
  - `.thermal-print-container { max-width: 72mm; width: 72mm; }` for 80mm
  - Keep existing 58mm support using the compact width already available in the receipt generator.

### 2. Apply the profile to POS sales receipts
File: `src/lib/receiptPdf.ts`

Update `generateThermalReceipt()` so POS receipts use the global profile instead of local duplicated print CSS.

This will affect receipts generated from:
- `src/pages/POS.tsx`

Changes:
- Wrap printed content in a `.thermal-print-container`
- Force all receipt tables, totals, separators, logos, barcodes, and QR images into black/white print-safe styling
- Keep the receipt layout compact for 80mm thermal rolls.

### 3. Apply the profile to repair intake and collection tickets
Files:
- `src/lib/receiptPdf.ts`
- `src/components/repairs/RepairReceiptDialog.tsx`

Update both repair receipt types:
- Full repair receipt / collection ticket via `generateThermalReceipt()`
- Compact phone label via `generatePhoneLabel()`

Changes:
- Use the same thermal print CSS profile
- Keep barcode rendering sharp with `image-rendering: pixelated`
- Preserve existing French ticket text and repair details.

### 4. Reduce QR code size by 50%
File: `src/lib/receiptPdf.ts`

Current QR print size is approximately:
- `48mm` on 80mm receipts
- `38mm` on 58mm receipts

Update to:
- `24mm` on 80mm receipts
- `19mm` on 58mm receipts

Also:
- Keep QR centered with `display: block; margin: 2mm auto;`
- Add a dedicated class like `.thermal-qr`
- Apply `image-rendering: pixelated` directly to the QR image
- Keep the QR URL text readable below it.

### 5. Fix invoice print styling
File: `src/pages/Invoices.tsx`

The invoice page currently uses `window.print()` from inside a dialog, while the global print CSS in `src/index.css` hides almost everything except `#thermal-label`.

I will update invoice printing to use a dedicated thermal print window instead of printing the whole app page.

Changes:
- Add a `handlePrintInvoice(invoice)` function that opens a new print window
- Use the same shared Thermal Profile CSS
- Format invoice content as a thermal invoice:
  - Shop name
  - Invoice number
  - Date
  - Customer
  - Type: Réparation / Vente
  - Device if repair exists
  - Total
  - Status
- Keep it black/white and max-width `72mm`.

### 6. Add supplier payment proof / accounting print support
Files:
- `src/components/suppliers/SupplierDetailSheet.tsx`
- optionally `src/lib/receiptPdf.ts`

Supplier payment proofs are currently viewed as uploaded images/links, not a dedicated thermal print flow. I will add a reusable print function for supplier payment records.

Changes:
- Add an “Imprimer” action beside supplier payment transactions that have payment data
- Print a compact thermal payment receipt containing:
  - Shop name
  - Supplier name
  - Date
  - Amount
  - Description
  - Payment/proof reference if available
- Use the same Thermal Profile CSS
- If the proof image itself is printed, force:
  - black/white-friendly background
  - no shadows
  - `image-rendering: pixelated`
  - centered max-width within `72mm`.

### 7. Update global print CSS safely
File: `src/index.css`

Improve the existing global `@media print` rules so they do not accidentally break invoices or other future print modules.

Changes:
- Keep `.no-print` / `.print-only`
- Add `.thermal-print-container` and `.thermal-print-root` rules
- Avoid forcing all printed pages to only show `#thermal-label` unless that element exists
- Add thermal defaults under print media:
  - black/white colors
  - no shadows
  - monospace for thermal print containers
  - pixelated image rendering.

## Files to Modify

| File | Change |
|---|---|
| `src/lib/receiptPdf.ts` | Add shared Thermal Profile CSS; apply to POS receipts, repair receipts, phone labels; reduce QR size by 50% |
| `src/pages/Invoices.tsx` | Replace dialog `window.print()` with dedicated thermal invoice print window |
| `src/components/suppliers/SupplierDetailSheet.tsx` | Add thermal print action for supplier payment/proof records |
| `src/index.css` | Add safe global print thermal rules and prevent current print CSS from hiding invoice content |

## Expected Result
- Epson TM-T20X output becomes sharper and higher contrast.
- POS receipts, repair tickets, labels, invoices, and supplier payment proofs share one consistent thermal print style.
- QR codes print at half their current size while remaining centered and sharp.
- 80mm rolls use a calibrated `72mm` content width to reduce clipping and wasted paper.
