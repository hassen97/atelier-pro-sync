## Add unlock code to the phone label (internal), not the customer receipt

The repair receipt dialog already prints two outputs:
- **"Reçu client"** → goes to the customer → must NOT show the unlock code.
- **"Étiquette tél."** (`generatePhoneLabel`) → sticker that stays attached to the phone for the technician → this is where the password/PIN/pattern should appear.

### Changes

1. **`src/lib/receiptPdf.ts` — `PhoneLabelData` + `generatePhoneLabel`:**
   - Add optional `unlockCode?: string` to the `PhoneLabelData` interface.
   - Render a new line on the label, just before the "Tech" line:
     ```
     Code déverrouillage: <value>
     ```
     Style it slightly emphasized (bold value) so the technician spots it. Only render when present.

2. **`src/components/repairs/RepairReceiptDialog.tsx` — `handlePrintLabel`:**
   - Pass `unlockCode: (repair as any).device_unlock_code || undefined` into `generatePhoneLabel`.
   - Do NOT pass it into `generateThermalReceipt` (customer receipt remains unchanged).

3. **`Repair` type fed to the dialog** (`src/pages/Repairs.tsx` and the `Repair` interface used by `RepairReceiptDialog`): the field is read via `(repair as any).device_unlock_code`, so no type change is strictly required, but optionally we add `device_unlock_code?: string | null` to the local `Repair` interface for cleanliness.

### Out of scope
- Customer receipt (`generateThermalReceipt`) — untouched.
- Public tracking page — already excludes the field via the RPC.