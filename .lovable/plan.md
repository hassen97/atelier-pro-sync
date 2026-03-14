

## Plan: Status Change Dialog + Phone Label Receipt

### What the user wants
1. When changing a repair status to "En cours", prompt for **"Reçu par"** (received by) and **"Réparé par"** (technician) before confirming
2. Show these fields on the receipt (already supported in `receiptPdf.ts`)
3. Add a **second receipt type**: a compact "phone label" that can be physically attached to the device

### Changes

#### 1. New component: `src/components/repairs/StatusAssignDialog.tsx`
A small dialog that appears when status changes to `in_progress`. Contains:
- **Reçu par** — text input (who received the device)
- **Réparé par** — text input (technician assigned)
- Confirm button that saves both fields to the repair via `useUpdateRepair` and then changes the status

#### 2. Update `src/pages/Repairs.tsx` — `handleStatusChange`
- When `newStatus === "in_progress"`, instead of directly calling `updateStatus.mutate`, open the new `StatusAssignDialog`
- On dialog confirm: update `received_by` + `repaired_by` fields, then change status
- Store pending repair + status in state

#### 3. Update `src/components/repairs/RepairReceiptDialog.tsx` — Add phone label option
- Add a third button: **"Étiquette téléphone"** (Phone Label)
- This prints a compact label with: ticket number/barcode, customer name, device, problem summary, date — designed to be cut and taped to the phone
- New function `generatePhoneLabel` in `receiptPdf.ts` that produces a small HTML printout (~50mm x 30mm)

#### 4. Update `src/lib/receiptPdf.ts` — Add `generatePhoneLabel`
- New exported function producing a small compact label:
  - Ticket barcode
  - Customer name
  - Device model
  - Problem (truncated)
  - Deposit date
  - Received by / Repaired by
- Uses same `window.print()` approach, monospace font, `@page` size ~58mm x ~40mm

### Files to change
| File | Change |
|------|--------|
| `src/components/repairs/StatusAssignDialog.tsx` | **New** — dialog for assigning received_by/repaired_by on status change |
| `src/pages/Repairs.tsx` | Intercept `in_progress` status change to open assign dialog |
| `src/components/repairs/RepairReceiptDialog.tsx` | Add "Étiquette téléphone" print button |
| `src/lib/receiptPdf.ts` | Add `generatePhoneLabel()` function |

