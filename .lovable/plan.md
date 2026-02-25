

# Fix: Products Not Showing on POS Page

## Problem
Products are not displaying on the POS page even though the user has 3 products in the database and the code logic appears correct.

## Root Cause Analysis
After thorough investigation, the most likely cause is a **runtime error** in the POS component that prevents it from rendering. The recent additions (barcode scanner, repair integration, thermal receipt import) may be causing a silent crash. Specifically:

1. The `generateThermalReceipt` function imported from `src/lib/receiptPdf.ts` uses `jsPDF` -- if the import fails at runtime, the entire POS module fails to load
2. The `useUpdateRepairStatus` hook import could also be a potential issue if its export signature changed

## Fix Plan

### 1. Add error boundary and defensive loading to POS.tsx
- Wrap the `generateThermalReceipt` call in a dynamic import or try/catch to prevent it from crashing the module
- Add a check for `productsLoading || repairsLoading` (currently only checks `productsLoading`)

### 2. Ensure products render even when dependencies fail
- Move the `generateThermalReceipt` import to a lazy/dynamic import so that a jsPDF loading failure doesn't crash the page
- Add explicit error logging in the products query to surface any silent failures

### 3. Add fallback error state
- If the page fails to render, show an error message instead of a blank screen

## Technical Changes

**File: `src/pages/POS.tsx`**
- Change static `import { generateThermalReceipt }` to a dynamic import inside the `handlePayment` function
- This isolates the jsPDF dependency so it can't crash the page on load
- Add console.log in the component body to confirm rendering

This is a minimal, targeted fix that isolates the most likely crash point without changing any business logic.

