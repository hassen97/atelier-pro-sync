import jsPDF from "jspdf";
import type { ShopSettings } from "@/hooks/useShopSettings";

// 80mm ≈ 226pt  |  58mm ≈ 164pt
const WIDTHS = { "80mm": 226, "58mm": 164 } as const;
const MARGIN = 8;

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  type: "repair" | "sale";
  id: string;
  date: string;
  time?: string;
  customer?: { name: string; phone?: string };
  device?: string;
  imei?: string;
  problem?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod?: string;
  trackingUrl?: string;
  discountItems?: { name: string; discount: string }[];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [20, 71, 179];
}

function getBrandRgb(brandColor: string): [number, number, number] {
  const presets: Record<string, string> = {
    "neon blue": "#1447b3", "emerald green": "#1f9d55", "crimson red": "#e02424",
    "amethyst purple": "#7c3aed", "sunset orange": "#f97316", "teal": "#1d8c9e", "blue": "#1447b3",
  };
  const hex = presets[brandColor?.toLowerCase()] || (brandColor?.startsWith("#") ? brandColor : "#1447b3");
  return hexToRgb(hex);
}

// Pad / truncate string to fixed width (for monospace column alignment)
function padEnd(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + " ".repeat(len - str.length);
}
function padStart(str: string, len: number): string {
  if (str.length >= len) return str.slice(-len);
  return " ".repeat(len - str.length) + str;
}

export async function generateThermalReceipt(
  data: ReceiptData,
  settings: ShopSettings,
  formatCurrency: (n: number) => string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const RW = WIDTHS[printerWidth];
  const CW = RW - MARGIN * 2;
  // Chars that fit in content width at font size 7 (Courier ~4.2pt per char)
  const CHARS = printerWidth === "80mm" ? 42 : 30;

  // ── Dynamic height estimate ──────────────────────────────────────────────
  let h = 320 + data.items.length * 18;
  if (data.type === "repair") h += 60;
  if (data.trackingUrl) h += 100;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [RW, h] });

  // Use Courier (monospace) for perfect alignment
  const MONO = "courier";
  const brandRgb = getBrandRgb(settings.brand_color || "blue");
  let y = MARGIN;

  // ── helpers ───────────────────────────────────────────────────────────────
  const setFont = (size: number, style: "normal" | "bold" = "normal") => {
    doc.setFontSize(size);
    doc.setFont(MONO, style);
  };

  const centerText = (text: string, size: number, bold: "normal" | "bold" = "normal") => {
    setFont(size, bold);
    const w = doc.getTextWidth(text);
    doc.text(text, (RW - w) / 2, y);
    y += size * 1.35;
  };

  const leftText = (text: string, size: number, bold: "normal" | "bold" = "normal") => {
    setFont(size, bold);
    // Wrap long text
    const lines = doc.splitTextToSize(text, CW);
    lines.forEach((line: string) => {
      doc.text(line, MARGIN, y);
      y += size * 1.35;
    });
  };

  // Two-column row: label left, value right
  const row = (label: string, value: string, size = 7, bold: "normal" | "bold" = "normal") => {
    setFont(size, bold);
    doc.text(label, MARGIN, y);
    const vw = doc.getTextWidth(value);
    doc.text(value, RW - MARGIN - vw, y);
    y += size * 1.35;
  };

  const solidLine = (color: [number, number, number] = [0, 0, 0], width = 0.5) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(MARGIN, y, RW - MARGIN, y);
    y += 5;
  };

  const dashedLine = () => {
    doc.setDrawColor(160, 160, 160);
    const step = 3;
    for (let x = MARGIN; x < RW - MARGIN; x += step * 2) {
      doc.line(x, y, Math.min(x + step, RW - MARGIN), y);
    }
    y += 5;
  };

  const gap = (pts = 4) => { y += pts; };

  // ── HEADER ────────────────────────────────────────────────────────────────
  if (settings.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = settings.logo_url!; });
      const maxW = 70, maxH = 35;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio, hh = img.height * ratio;
      doc.addImage(img, "PNG", (RW - w) / 2, y, w, hh);
      y += hh + 4;
    } catch {
      doc.setTextColor(...brandRgb);
      centerText(settings.shop_name, 13, "bold");
      doc.setTextColor(0, 0, 0);
    }
  } else {
    doc.setTextColor(...brandRgb);
    centerText(settings.shop_name, 13, "bold");
    doc.setTextColor(0, 0, 0);
  }

  // Shop contact line(s)
  doc.setTextColor(60, 60, 60);
  if (settings.address) centerText(settings.address, 6);
  const phones = [settings.phone, settings.whatsapp_phone].filter(Boolean);
  if (phones.length) centerText(`Tél : ${phones.join(" / ")}`, 6);
  if (settings.email) centerText(settings.email, 6);
  doc.setTextColor(0, 0, 0);

  gap(3);
  solidLine(brandRgb, 1);

  // ── RECEIPT TITLE ─────────────────────────────────────────────────────────
  centerText(data.type === "repair" ? "BON DE RÉPARATION" : "REÇU DE VENTE", 9, "bold");
  dashedLine();

  // ── REF / DATE / TIME ─────────────────────────────────────────────────────
  row("Référence :", data.id.slice(0, 8).toUpperCase());
  row("Date dépôt :", data.date);
  if (data.time) row("Heure :", data.time);

  dashedLine();

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  if (data.customer) {
    leftText("Client : " + data.customer.name, 7);
    if (data.customer.phone) leftText("Tél : " + data.customer.phone, 7);
  }

  if (data.type === "repair" && data.device) {
    leftText("Appareil : " + data.device, 7);
    if (data.imei) leftText("IMEI : " + data.imei, 7);
  }

  dashedLine();

  // ── PROBLEM DESCRIPTION ───────────────────────────────────────────────────
  if (data.problem && data.items.length === 0) {
    // Simple mode: show problem
    setFont(7, "bold");
    doc.text("Problème déclaré", MARGIN, y);
    y += 7 * 1.35;
    setFont(7, "normal");
    const lines = doc.splitTextToSize(data.problem, CW);
    lines.forEach((line: string) => { doc.text(line, MARGIN, y); y += 7 * 1.35; });
    dashedLine();
  }

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  if (data.items.length > 0) {
    setFont(7, "bold");
    // Column headers
    const nameW = Math.floor(CHARS * 0.52);
    const qtyW = 3;
    const puW = Math.floor(CHARS * 0.22);
    const totW = Math.floor(CHARS * 0.22);

    const hdr = padEnd("Article", nameW) + padEnd("Qté", qtyW) + padStart("P.U.", puW) + padStart("Tot.", totW);
    doc.text(hdr, MARGIN, y);
    y += 7 * 1.35;

    solidLine([180, 180, 180], 0.3);

    setFont(6.5, "normal");
    data.items.forEach((item) => {
      const nameParts = doc.splitTextToSize(item.name, CW * 0.52);
      nameParts.forEach((part: string, i: number) => {
        if (i === 0) {
          const qty = String(item.qty);
          const pu = formatCurrency(item.unitPrice);
          const tot = formatCurrency(item.total);
          const line = padEnd(part, nameW) + padEnd(qty, qtyW) + padStart(pu, puW) + padStart(tot, totW);
          doc.text(line, MARGIN, y);
        } else {
          doc.text(part, MARGIN, y);
        }
        y += 6.5 * 1.35;
      });
    });

    dashedLine();
  }

  // ── TOTALS ────────────────────────────────────────────────────────────────
  setFont(7, "normal");
  row("Sous-total :", formatCurrency(data.subtotal));
  if (data.taxRate && data.taxAmount) {
    row(`TVA (${data.taxRate}%) :`, formatCurrency(data.taxAmount));
  }
  row("Payé :", formatCurrency(data.paid));
  if (data.remaining > 0) {
    doc.setTextColor(180, 0, 0);
    row("Reste :", formatCurrency(data.remaining));
    doc.setTextColor(0, 0, 0);
  }
  if (data.paymentMethod) {
    row("Paiement :", data.paymentMethod === "card" ? "Carte" : "Espèces");
  }

  gap(2);
  solidLine(brandRgb, 1.2);
  setFont(10, "bold");
  row("TOTAL :", formatCurrency(data.total), 10, "bold");
  solidLine(brandRgb, 1.2);

  // ── TERMS ─────────────────────────────────────────────────────────────────
  gap(3);
  setFont(6, "normal");
  doc.setTextColor(100, 100, 100);
  const defaultTerms = [
    "Garantie de 90 jours sur toutes les pièces.",
    "Appareils non récupérés après 30 jours non garantis.",
    "Présentez ce ticket pour récupérer votre appareil.",
    "Merci pour votre confiance !",
  ];
  const termsRaw: string = (settings as any).receipt_terms || "";
  const terms = termsRaw.trim()
    ? termsRaw.split("\n").filter((l: string) => l.trim())
    : defaultTerms;
  terms.forEach((line: string) => centerText(line, 6));
  doc.setTextColor(0, 0, 0);

  // ── QR CODE ───────────────────────────────────────────────────────────────
  if (data.trackingUrl) {
    gap(3);
    dashedLine();
    gap(2);
    centerText("Suivre votre réparation", 7, "bold");
    centerText("Scannez le QR code ci-dessous", 6);
    gap(3);

    try {
      const qrSize = printerWidth === "58mm" ? 54 : 68;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.trackingUrl)}&format=png&margin=2`;
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = qrUrl;
      });
      if (qrImg.complete && qrImg.naturalWidth > 0) {
        doc.addImage(qrImg, "PNG", (RW - qrSize) / 2, y, qrSize, qrSize);
        y += qrSize + 4;
      }
    } catch { /* skip */ }

    doc.setTextColor(80, 80, 80);
    // Show short tracking URL below QR
    const shortUrl = data.trackingUrl.replace(/^https?:\/\//, "");
    centerText(shortUrl, 6);
    doc.setTextColor(0, 0, 0);
  }

  gap(6);

  // ── Open PDF ───────────────────────────────────────────────────────────────
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  if (win) win.onload = () => win.print();
}
