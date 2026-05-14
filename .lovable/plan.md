## Problem

In the service request detail views, both `input_data` (Données envoyées) and `result_data` (Résultat) are rendered as raw JSON via `JSON.stringify(..., null, 2)`. This shows code-like blocks instead of readable info, and on the admin side the result textarea is pre-filled with raw JSON too, making it look like the same content as "sent details".

## Goal (UI only, no schema changes)

Display `input_data` and `result_data` as a clean labeled key/value list (e.g. `IMEI: 359...`, `Modèle: iPhone 13`, `Notes: ...`), in both:
- Shop owner dialog — `src/components/services/MyRequestsTable.tsx`
- Admin detail sheet — `src/components/admin/AdminServiceRequestsView.tsx`

## Changes

1. **New small helper** `src/components/services/KeyValueList.tsx`
   - Props: `data: Record<string, any> | null | undefined`
   - Maps known keys to friendly French labels: `imei → IMEI`, `model → Modèle`, `notes → Notes`, `code → Code`, `link → Lien`, fallback = humanized key (capitalize, replace `_` with space).
   - Renders rows: `<dt>Label</dt><dd>{value}</dd>`. Strings/numbers shown as text; URLs auto-linked; objects/arrays fall back to a small `<pre>`.
   - Empty → "Aucune donnée".

2. **MyRequestsTable.tsx (shop owner)**
   - Replace the `<pre>{JSON.stringify(detail.input_data,...)}` with `<KeyValueList data={detail.input_data} />`.
   - Replace the result `<pre>` with `<KeyValueList data={detail.result_data} />` (keep the green emerald background container).

3. **AdminServiceRequestsView.tsx (admin)**
   - Replace the "Données envoyées" `<pre>` with `<KeyValueList data={selected.input_data} />`.
   - For the "Résultat" editor, keep the `Textarea` for input but:
     - Initialize `resultText` from `result_data` only when it has meaningful values (already mostly the case), and
     - Above the textarea, when `selected.result_data` has keys, also show a read-only `<KeyValueList data={selected.result_data} />` preview so admins see the same friendly format clients see.
   - Improve the placeholder hint: `Code: 123456` style, plus accept either plain text (saved as `{ value: "..." }`, already handled) or JSON.

## Out of scope

- No DB / RLS / hook changes.
- No change to how data is saved (input_data and result_data remain JSONB).