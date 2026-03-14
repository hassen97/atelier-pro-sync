

## Fix: Sharp Thermal Receipt Printing

### Problem
The current receipt uses **jsPDF** to generate a PDF, which renders text as vector paths — thermal printers often rasterize these poorly, producing blurry output. The user wants native HTML text printing via `window.print()`.

### Solution
Replace the jsPDF-based `generateThermalReceipt` with an **HTML-based print approach** that opens a new window with pure HTML/CSS and calls `window.print()`. This produces crisp monospace text that thermal printers handle natively.

### Changes

**File: `src/lib/receiptPdf.ts`** — Full rewrite of `generateThermalReceipt`
- Instead of building a jsPDF document, construct an HTML string
- Open via `window.open()` → write HTML → `window.print()`
- Font: `"Courier New", "Liberation Mono", monospace` with fixed `px` sizes
- Pure black text (`#000`), no anti-aliasing (`-webkit-font-smoothing: none; text-rendering: optimizeSpeed`)
- `@page` size set to `72mm` (80mm) or `48mm` (58mm) with zero margins
- No `transform`, `scale`, `zoom`, `rem`, `em`, or `vw`
- Items rendered as an HTML `<table>` for reliable column alignment
- QR code as an `<img>` tag (same QR API)
- Barcode rendered via a canvas data URL embedded as `<img>`
- Line spacing: `line-height: 1.4; letter-spacing: 0.5px`
- `@media print` block forcing all styles
- Conditionally hide TVA when disabled

**File: `src/components/repairs/RepairReceiptDialog.tsx`** — No changes needed (already calls `generateThermalReceipt` correctly)

### Layout Structure (HTML)
```text
┌──────────────────────────┐
│    [LOGO or SHOP NAME]   │  centered, 16px bold
│      Address / Phone     │  centered, 10px
│──────────────────────────│
│    BON DE RÉPARATION     │  centered, 14px bold
│        N° 00042          │
│- - - - - - - - - - - - - │
│ Référence : 18F1005A     │
│ Date dépôt: 13/03/2026   │
│- - - - - - - - - - - - - │
│ Client : Ahmed           │
│ Appareil : iPhone 16     │
│ IMEI : 3569464646        │
│- - - - - - - - - - - - - │
│ Problème déclaré         │
│ Ecran cassé              │
│- - - - - - - - - - - - - │
│ Article  Qté  P.U   Tot  │  <table>
│ Ecran     1   70    70   │
│ M.O.      1   10    10   │
│──────────────────────────│
│ Sous-total:     80.00    │
│ Payé:            0.00    │
│ Reste:          80.00    │
│══════════════════════════│
│ TOTAL:          80.00    │
│══════════════════════════│
│ Garantie text...         │
│- - - - - - - - - - - - - │
│  Suivre votre réparation │
│       [QR CODE]          │
│   domain.com/r/token     │
│- - - - - - - - - - - - - │
│      [BARCODE]           │
│    REP-00042             │
│                          │
│ Présentez ce ticket pour │
│ récupérer votre appareil │
└──────────────────────────┘
```

### Key CSS
```css
@page { size: 72mm auto; margin: 0; }
body {
  font-family: "Courier New", "Liberation Mono", monospace;
  font-size: 12px;
  color: #000;
  -webkit-font-smoothing: none;
  text-rendering: optimizeSpeed;
  line-height: 1.4;
  letter-spacing: 0.5px;
  width: 72mm; /* or 48mm for 58mm printers */
  padding: 2mm;
}
table { width: 100%; border-collapse: collapse; }
td { padding: 1px 0; }
td.right { text-align: right; }
```

Only **1 file** changes: `src/lib/receiptPdf.ts`.

