
# Finalize Thermal Receipt Template

## Goal
Improve receipt readability and control the thank-you footer by:
- forcing all thermal print text to bold black,
- removing the printed tracking link/URL text,
- adding a shop setting to show/hide “Merci de votre confiance !”,
- preserving compact thermal spacing with a safe bottom margin.

## Implementation Plan

### 1. Add a receipt footer toggle setting
Add a new boolean field to `shop_settings`:

```sql
show_receipt_note boolean not null default true
```

Defaulting to `true` preserves the current receipt behavior for existing shops.

Update the settings data flow:
- `src/hooks/useShopSettings.ts`
  - Add `show_receipt_note` to `ShopSettings`
  - Set default to `true`
  - Read it from `shop_settings`
  - Save it when settings are updated
- `src/pages/Settings.tsx`
  - Add local state for the toggle
  - Add a switch in “Paramètres Reçus” labeled:
    - `Afficher le message de remerciement`
  - Description:
    - `Affiche “Merci de votre confiance !” en bas des reçus.`
  - Include the value in `handleSaveGeneralSettings`

### 2. Force all thermal receipt text to bold
Update the shared thermal print CSS in `src/lib/receiptPdf.ts`:

```css
* {
  font-weight: bold !important;
  color: #000000 !important;
  background: #FFFFFF !important;
}
```

This will apply globally to:
- POS receipts
- repair receipts
- phone labels
- invoices
- supplier payment receipts

Also mirror the same rule in the safe global print rules in `src/index.css` for any `.thermal-print-root` / `.thermal-print-container` content.

### 3. Remove the printed tracking link text
In `src/lib/receiptPdf.ts`, remove the visible URL output from the repair receipt QR section.

Currently the template prints a shortened tracking URL under the QR code. That line will be removed entirely:

```html
<p class="qr-url">...</p>
```

The receipt will no longer show a clickable/readable tracking link at the bottom.

The QR image can remain available for repair tracking, but the printed text URL/link will be gone and its space collapsed.

### 4. Make the thank-you footer conditional
Separate the built-in thank-you note from the receipt terms.

Current default terms include:

```text
Merci pour votre confiance !
```

I will remove that line from the default terms array and render it separately only when:

```ts
settings.show_receipt_note === true
```

Receipt behavior:
- Toggle ON: prints `Merci de votre confiance !`
- Toggle OFF: no thank-you line is printed, and no blank space remains

The existing warranty/condition text remains controlled by `receipt_terms`.

### 5. Preserve thermal spacing and prevent tear-bar clipping
Update the thermal print layout so receipts have a safe bottom margin:

```css
.thermal-print-container {
  padding-bottom: 5mm;
}
```

This ensures the final line, QR code, barcode, or footer is not cut by the printer’s tear bar.

### 6. Keep prominent repair headers
Keep the existing receipt hierarchy:
- `BON DE RÉPARATION`
- ticket number / reference
- barcode where available

But because the global bold rule applies everywhere, headers and regular fields will all print with maximum ink visibility.

## Files to Modify

| File | Change |
|---|---|
| `supabase/migrations/...sql` | Add `shop_settings.show_receipt_note boolean not null default true` |
| `src/hooks/useShopSettings.ts` | Add/read/save `show_receipt_note` |
| `src/pages/Settings.tsx` | Add “Afficher le message de remerciement” toggle in receipt settings |
| `src/lib/receiptPdf.ts` | Force bold thermal CSS, remove printed tracking URL text, conditionally render thank-you note, add bottom padding |
| `src/index.css` | Add bold/high-visibility print fallback for thermal containers |

## Expected Result
- Every thermal print uses bold pure-black text for better Epson TM-T20X readability.
- The printed tracking URL/link is removed from receipts.
- Shop owners can enable or disable the thank-you message from Settings.
- Turning the footer note off saves paper by collapsing the space.
- Receipts keep a 5mm bottom safety margin to avoid cut-off text.
