
# Fix: Currency Label Hardcoded to "TND" in Inventory Components

## Root Cause

Four inventory components have **hardcoded "TND"** currency labels instead of reading the user's configured currency dynamically from the `ShopSettingsContext`. This is why changing the currency in Settings updates the Dashboard (which uses `useCurrency`) but not the inventory forms.

The affected files and exact locations:

| File | Problem |
|---|---|
| `ProductSheet.tsx` | Labels "Prix d'achat (TND)" and "Prix de vente (TND)" are hardcoded |
| `ProductDialog.tsx` | Same labels hardcoded in the edit dialog |
| `VariationMatrixDialog.tsx` | Table headers "Coût (TND)" and "Vente (TND)" are hardcoded |
| `LabelPrintDialog.tsx` | Price formatted with hardcoded `TND` symbol and 3 decimals (wrong for non-TND currencies) |

## The Fix

### 1. `ProductSheet.tsx`
Add `useCurrency` hook, replace hardcoded labels:
- `"Prix d'achat (TND)"` → `"Prix d'achat (${currencyCode})"`
- `"Prix de vente (TND)"` → `"Prix de vente (${currencyCode})"`

### 2. `ProductDialog.tsx`
Same fix — add `useCurrency` and replace the two hardcoded labels.

### 3. `VariationMatrixDialog.tsx`
Replace table headers:
- `"Coût (TND)"` → `"Coût (${currencyCode})"`
- `"Vente (TND)"` → `"Vente (${currencyCode})"`

### 4. `LabelPrintDialog.tsx`
Use the `format()` function from `useCurrency` instead of manually calling `(Number(price)).toFixed(3) + " TND"`. This correctly handles:
- The right currency symbol (€, MAD, DZD, etc.)
- The right number of decimal places (2 for EUR, 3 for TND, etc.)

## Technical Details

The `useCurrency` hook reads from `ShopSettingsContext` which is already provided at the app level (wrapping all protected routes in `App.tsx`), so no context changes are needed. The fix is purely replacing hardcoded strings with dynamic values from the hook.

```typescript
// Before (hardcoded)
<FormLabel>Prix d'achat (TND)</FormLabel>

// After (dynamic)
const { currencyCode, format } = useCurrency();
<FormLabel>Prix d'achat ({currencyCode})</FormLabel>
```

For `LabelPrintDialog`, the `format()` function also needs to be passed into the `printWindow.document.write()` call for the printed label to show the correct currency.
