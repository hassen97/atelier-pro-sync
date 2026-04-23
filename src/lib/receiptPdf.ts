import type { ShopSettings } from "@/hooks/useShopSettings";

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  type: "repair" | "sale";
  id: string;
  ticketNumber?: number | null;
  date: string;
  time?: string;
  customer?: { name: string; phone?: string };
  device?: string;
  imei?: string;
  problem?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate?: number;
  taxEnabled?: boolean;
  taxAmount?: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod?: string;
  trackingUrl?: string;
  discountItems?: { name: string; discount: string }[];
  receivedBy?: string;
  repairedBy?: string;
  deviceCondition?: string;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function getThermalPrintCss(pageW = "72mm", fontSize = "12px") {
  return `
    @page { size: ${pageW} auto; margin: 0; }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      color: #000000 !important;
      background: #FFFFFF !important;
      box-shadow: none !important;
      text-shadow: none !important;
      filter: none !important;
      opacity: 1 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 5mm;
      color: #000000 !important;
      background: #FFFFFF !important;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      letter-spacing: 0;
      text-rendering: optimizeSpeed;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: unset;
    }
    .thermal-print-root { width: 100%; }
    .thermal-print-container {
      width: ${pageW};
      max-width: ${pageW};
      margin: 0 auto;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
    }
    img, svg, canvas, .thermal-qr {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .thermal-qr {
      display: block;
      margin: 2mm auto;
      height: auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .shop-name { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 1px; }
    .shop-info { font-size: 10px; text-align: center; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin: 3px 0 1px; }
    .ticket-num { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .sep { border-top: 1px dashed #000000; margin: 3px 0; }
    .sep-bold { border-top: 2px solid #000000; margin: 3px 0; }
    .field { font-size: 12px; margin: 1px 0; }
    .label { font-weight: bold; font-size: 12px; margin: 2px 0 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 2px 0; font-family: inherit; }
    th, td { padding: 1px 0; vertical-align: top; text-align: left; }
    th { font-weight: bold; border-bottom: 1px solid #000000; }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: right; }
    .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 1px 0; gap: 3mm; }
    .total-row.grand { font-size: 14px; font-weight: bold; }
    .total-row .val { text-align: right; }
    .terms { font-size: 9px; text-align: center; margin: 1px 0; }
    .qr-section { text-align: center; margin: 3px 0; }
    .qr-label { font-size: 10px; font-weight: bold; }
    .qr-url { font-size: 9px; word-break: break-all; }
    .barcode-section, .barcode { text-align: center; margin: 3px 0; }
    .barcode-section img, .barcode img { display: block; margin: 0 auto; }
    .footer { font-size: 10px; text-align: center; font-weight: bold; margin-top: 4px; }
    @media print { body { width: auto; } }
  `;
}

export function printThermalHtml(html: string, windowSize = "width=400,height=600") {
  const printWindow = window.open("", "_blank", windowSize);
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

async function generateBarcodeDataUrl(value: string): Promise<string | null> {
  try {
    const mod = await import("jsbarcode");
    const JsBarcode = mod.default;
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function generateThermalReceipt(
  data: ReceiptData,
  settings: ShopSettings,
  formatCurrency: (n: number) => string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";

  // Prepare barcode image
  let barcodeImgTag = "";
  if (data.ticketNumber) {
    const barcodeValue = `REP-${String(data.ticketNumber).padStart(5, "0")}`;
    const barcodeDataUrl = await generateBarcodeDataUrl(barcodeValue);
    if (barcodeDataUrl) {
      barcodeImgTag = `<img src="${barcodeDataUrl}" style="max-width:90%;height:auto;" alt="${escHtml(barcodeValue)}" />`;
    } else {
      barcodeImgTag = `<p style="font-size:11px;font-weight:bold;">${escHtml(barcodeValue)}</p>`;
    }
  }

  // QR code
  let qrImgTag = "";
  let shortUrl = "";
  if (data.trackingUrl) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.trackingUrl)}&format=png&margin=2`;
    qrImgTag = `<img src="${qrUrl}" style="width:${printerWidth === "58mm" ? "38mm" : "48mm"};height:auto;" alt="QR" />`;
    shortUrl = data.trackingUrl.replace(/^https?:\/\//, "");
  }

  // Logo
  let logoTag = "";
  if (settings.logo_url) {
    logoTag = `<img src="${escHtml(settings.logo_url)}" style="max-width:50mm;max-height:20mm;display:block;margin:0 auto 2mm;" alt="logo" crossorigin="anonymous" />`;
  }

  // Items table
  let itemsHtml = "";
  if (data.items.length > 0) {
    const rows = data.items.map(item =>
      `<tr><td>${escHtml(item.name)}</td><td class="center">${item.qty}</td><td class="right">${escHtml(formatCurrency(item.unitPrice))}</td><td class="right">${escHtml(formatCurrency(item.total))}</td></tr>`
    ).join("");
    itemsHtml = `
      <div class="sep"></div>
      <table>
        <thead><tr><th>Article</th><th class="center">Qté</th><th class="right">P.U.</th><th class="right">Tot.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // Problem (simple mode)
  let problemHtml = "";
  if (data.problem && data.items.length === 0) {
    problemHtml = `
      <div class="sep"></div>
      <p class="label">Problème déclaré</p>
      <p>${escHtml(data.problem)}</p>`;
  }

  // Terms
  const defaultTerms = [
    "Garantie de 90 jours sur toutes les pièces.",
    "Appareils non récupérés après 30 jours non garantis.",
    "Présentez ce ticket pour récupérer votre appareil.",
    "Merci pour votre confiance !",
  ];
  const termsRaw: string = (settings as any).receipt_terms || "";
  const terms = termsRaw.trim() ? termsRaw.split("\n").filter((l: string) => l.trim()) : defaultTerms;
  const termsHtml = terms.map(t => `<p class="terms">${escHtml(t)}</p>`).join("");

  // Phones
  const phones = [settings.phone, settings.whatsapp_phone].filter(Boolean);

  // Ticket number
  const ticketStr = data.ticketNumber ? String(data.ticketNumber).padStart(5, "0") : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Reçu</title>
<style>
  @page { size: ${pageW} auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Courier New", "Liberation Mono", monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: unset;
    text-rendering: optimizeSpeed;
    line-height: 1.4;
    letter-spacing: 0.5px;
    width: ${pageW};
    padding: 2mm;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .shop-name { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 1px; }
  .shop-info { font-size: 10px; text-align: center; color: #000; }
  .title { font-size: 14px; font-weight: bold; text-align: center; margin: 3px 0 1px; }
  .ticket-num { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .sep { border-top: 1px dashed #000; margin: 3px 0; }
  .sep-bold { border-top: 2px solid #000; margin: 3px 0; }
  .field { font-size: 12px; margin: 1px 0; }
  .label { font-weight: bold; font-size: 12px; margin: 2px 0 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 2px 0; }
  th, td { padding: 1px 0; vertical-align: top; text-align: left; }
  th { font-weight: bold; border-bottom: 1px solid #000; }
  th.center, td.center { text-align: center; }
  th.right, td.right { text-align: right; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 1px 0; }
  .total-row.grand { font-size: 14px; font-weight: bold; }
  .total-row .val { text-align: right; }
  .terms { font-size: 9px; text-align: center; color: #000; margin: 1px 0; }
  .qr-section { text-align: center; margin: 3px 0; }
  .qr-section img { display: block; margin: 2px auto; }
  .qr-label { font-size: 10px; font-weight: bold; }
  .qr-url { font-size: 9px; word-break: break-all; }
  .barcode-section { text-align: center; margin: 3px 0; }
  .barcode-section img { display: block; margin: 0 auto; }
  .footer { font-size: 10px; text-align: center; font-weight: bold; margin-top: 4px; }
  @media print {
    body { width: ${pageW}; }
  }
</style>
</head>
<body>

${logoTag}
<p class="shop-name">${escHtml(settings.shop_name)}</p>
${settings.address ? `<p class="shop-info">${escHtml(settings.address)}</p>` : ""}
${phones.length ? `<p class="shop-info">Tél : ${escHtml(phones.join(" / "))}</p>` : ""}
${settings.email ? `<p class="shop-info">${escHtml(settings.email)}</p>` : ""}

<div class="sep-bold"></div>

<p class="title">${data.type === "repair" ? "BON DE RÉPARATION" : "REÇU DE VENTE"}</p>
${ticketStr ? `<p class="ticket-num">N° ${ticketStr}</p>` : ""}

<div class="sep"></div>

<p class="field">Référence : ${escHtml(data.id.slice(0, 8).toUpperCase())}</p>
<p class="field">Date dépôt : ${escHtml(data.date)}</p>
${data.time ? `<p class="field">Heure : ${escHtml(data.time)}</p>` : ""}

<div class="sep"></div>

${data.customer ? `<p class="field">Client : ${escHtml(data.customer.name)}</p>` : ""}
${data.customer?.phone ? `<p class="field">Tél : ${escHtml(data.customer.phone)}</p>` : ""}
${data.type === "repair" && data.device ? `<p class="field">Appareil : ${escHtml(data.device)}</p>` : ""}
${data.type === "repair" && data.imei ? `<p class="field">IMEI : ${escHtml(data.imei)}</p>` : ""}
${data.deviceCondition ? `<p class="field">État à réception : ${escHtml(data.deviceCondition)}</p>` : ""}
${data.receivedBy ? `<p class="field">Reçu par : ${escHtml(data.receivedBy)}</p>` : ""}
${data.repairedBy ? `<p class="field">Réparé par : ${escHtml(data.repairedBy)}</p>` : ""}

${problemHtml}
${itemsHtml}

<div class="sep"></div>

<div class="total-row"><span>Sous-total :</span><span class="val">${escHtml(formatCurrency(data.subtotal))}</span></div>

<div class="total-row"><span>Payé :</span><span class="val">${escHtml(formatCurrency(data.paid))}</span></div>
${data.remaining > 0 ? `<div class="total-row"><span>Reste :</span><span class="val bold">${escHtml(formatCurrency(data.remaining))}</span></div>` : ""}
${data.paymentMethod ? `<div class="total-row"><span>Paiement :</span><span class="val">${data.paymentMethod === "card" ? "Carte" : "Espèces"}</span></div>` : ""}

<div class="sep-bold"></div>
<div class="total-row grand"><span>TOTAL :</span><span class="val">${escHtml(formatCurrency(data.total))}</span></div>
<div class="sep-bold"></div>

${termsHtml}

${data.trackingUrl ? `
<div class="sep"></div>
<div class="qr-section">
  <p class="qr-label">Suivre votre réparation</p>
  <p class="terms">Scannez le QR code ci-dessous</p>
  ${qrImgTag}
  <p class="qr-url">${escHtml(shortUrl)}</p>
</div>
` : ""}

${barcodeImgTag ? `
<div class="sep"></div>
<div class="barcode-section">
  ${barcodeImgTag}
</div>
` : ""}

<p class="footer">Présentez ce ticket pour récupérer<br>votre appareil.</p>

</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

// ── Phone Label (compact sticker for attaching to device) ──────────────

interface PhoneLabelData {
  ticketNumber?: number | null;
  customer: string;
  phone?: string;
  device: string;
  problem: string;
  depositDate: string;
  receivedBy?: string;
  repairedBy?: string;
}

export async function generatePhoneLabel(
  data: PhoneLabelData,
  shopName: string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";
  const ticketStr = data.ticketNumber ? String(data.ticketNumber).padStart(5, "0") : "";

  let barcodeImgTag = "";
  if (data.ticketNumber) {
    const barcodeValue = `REP-${ticketStr}`;
    const barcodeDataUrl = await generateBarcodeDataUrl(barcodeValue);
    if (barcodeDataUrl) {
      barcodeImgTag = `<img src="${barcodeDataUrl}" style="max-width:90%;height:auto;" alt="${escHtml(barcodeValue)}" />`;
    } else {
      barcodeImgTag = `<p style="font-size:11px;font-weight:bold;">${escHtml(barcodeValue)}</p>`;
    }
  }

  const problemTruncated = data.problem.length > 60 ? data.problem.slice(0, 57) + "..." : data.problem;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Étiquette</title>
<style>
  @page { size: ${pageW} auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Courier New", "Liberation Mono", monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
    -webkit-font-smoothing: none;
    text-rendering: optimizeSpeed;
    line-height: 1.3;
    letter-spacing: 0.5px;
    width: ${pageW};
    padding: 2mm;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 2px 0; }
  .shop { font-size: 12px; font-weight: bold; text-align: center; }
  .ticket { font-size: 14px; font-weight: bold; text-align: center; margin: 2px 0; }
  .field { font-size: 11px; margin: 1px 0; }
  .barcode { text-align: center; margin: 3px 0; }
  .barcode img { display: block; margin: 0 auto; }
  @media print { body { width: ${pageW}; } }
</style>
</head>
<body>

<p class="shop">${escHtml(shopName)}</p>
${ticketStr ? `<p class="ticket">N° ${ticketStr}</p>` : ""}
<div class="sep"></div>
<p class="field"><span class="bold">Client:</span> ${escHtml(data.customer)}</p>
${data.phone ? `<p class="field"><span class="bold">Tél:</span> ${escHtml(data.phone)}</p>` : ""}
<p class="field"><span class="bold">Appareil:</span> ${escHtml(data.device)}</p>
<p class="field"><span class="bold">Problème:</span> ${escHtml(problemTruncated)}</p>
<p class="field"><span class="bold">Dépôt:</span> ${escHtml(data.depositDate)}</p>
${data.receivedBy ? `<p class="field"><span class="bold">Reçu par:</span> ${escHtml(data.receivedBy)}</p>` : ""}
${data.repairedBy ? `<p class="field"><span class="bold">Tech:</span> ${escHtml(data.repairedBy)}</p>` : ""}
<div class="sep"></div>
${barcodeImgTag ? `<div class="barcode">${barcodeImgTag}</div>` : ""}

</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=350,height=400");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
