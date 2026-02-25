import jsPDF from "jspdf";
import type { ShopSettings } from "@/hooks/useShopSettings";

// Thermal receipt: 80mm wide ≈ 226pt, variable height
const RECEIPT_WIDTH = 226;
const MARGIN = 10;
const CONTENT_WIDTH = RECEIPT_WIDTH - MARGIN * 2;

interface ReceiptLine {
  label: string;
  value: string;
  bold?: boolean;
}

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
  customer?: { name: string; phone?: string };
  device?: string;
  imei?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod?: string;
  time?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [20, 71, 179];
}

function getBrandRgb(brandColor: string): [number, number, number] {
  const presets: Record<string, string> = {
    "neon blue": "#1447b3",
    "emerald green": "#1f9d55",
    "crimson red": "#e02424",
    "amethyst purple": "#7c3aed",
    "sunset orange": "#f97316",
    "teal": "#1d8c9e",
    "blue": "#1447b3",
  };
  const hex = presets[brandColor.toLowerCase()] || (brandColor.startsWith("#") ? brandColor : "#1447b3");
  return hexToRgb(hex);
}

export async function generateThermalReceipt(
  data: ReceiptData,
  settings: ShopSettings,
  formatCurrency: (n: number) => string
) {
  // Calculate height dynamically
  let estimatedHeight = 400 + data.items.length * 20;
  if (data.type === "repair") estimatedHeight += 40;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [RECEIPT_WIDTH, estimatedHeight],
  });

  const brandRgb = getBrandRgb(settings.brand_color);
  let y = MARGIN;

  const centerText = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const w = doc.getTextWidth(text);
    doc.text(text, (RECEIPT_WIDTH - w) / 2, y);
    y += size * 1.3;
  };

  const leftRight = (left: string, right: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(left, MARGIN, y);
    const rw = doc.getTextWidth(right);
    doc.text(right, RECEIPT_WIDTH - MARGIN - rw, y);
    y += size * 1.3;
  };

  const dashedLine = () => {
    doc.setDrawColor(180);
    // Draw dashed line manually
    const step = 3;
    for (let x = MARGIN; x < RECEIPT_WIDTH - MARGIN; x += step * 2) {
      doc.line(x, y, Math.min(x + step, RECEIPT_WIDTH - MARGIN), y);
    }
    y += 6;
  };

  // === HEADER with logo or shop name ===
  if (settings.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = settings.logo_url!;
      });
      const maxW = 80;
      const maxH = 40;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      doc.addImage(img, "PNG", (RECEIPT_WIDTH - w) / 2, y, w, h);
      y += h + 4;
    } catch {
      // Fallback to text
      doc.setTextColor(...brandRgb);
      centerText(settings.shop_name, 14, true);
      doc.setTextColor(0);
    }
  } else {
    doc.setTextColor(...brandRgb);
    centerText(settings.shop_name, 14, true);
    doc.setTextColor(0);
  }

  // Shop contact details
  doc.setTextColor(80);
  doc.setFontSize(6);
  if (settings.address) {
    centerText(settings.address, 6);
  }
  if (settings.phone) {
    centerText(`Tél: ${settings.phone}`, 6);
  }
  if (settings.whatsapp_phone) {
    centerText(`WhatsApp: ${settings.whatsapp_phone}`, 6);
  }
  if (settings.email) {
    centerText(settings.email, 6);
  }
  doc.setTextColor(0);

  y += 2;

  // Subtitle
  doc.setTextColor(100);
  centerText(data.type === "repair" ? "FICHE DE RÉPARATION" : "REÇU DE VENTE", 8, true);
  doc.setTextColor(0);

  dashedLine();

  // Receipt ID & date
  leftRight("N°", data.id.slice(0, 8).toUpperCase(), 7, true);
  leftRight("Date", data.date, 7);
  if (data.time) {
    leftRight("Heure", data.time, 7);
  }

  dashedLine();

  // Customer
  if (data.customer) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", MARGIN, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(data.customer.name, MARGIN, y);
    y += 9;
    if (data.customer.phone) {
      doc.text(`Tél: ${data.customer.phone}`, MARGIN, y);
      y += 9;
    }
  }

  // Device info for repairs
  if (data.type === "repair" && data.device) {
    doc.text(`Appareil: ${data.device}`, MARGIN, y);
    y += 9;
    if (data.imei) {
      doc.text(`IMEI: ${data.imei}`, MARGIN, y);
      y += 9;
    }
  }

  dashedLine();

  // Items header
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Article", MARGIN, y);
  doc.text("Qté", MARGIN + 110, y);
  const pxLabel = "P.U.";
  doc.text(pxLabel, MARGIN + 135, y);
  const ttlLabel = "Total";
  const ttlW = doc.getTextWidth(ttlLabel);
  doc.text(ttlLabel, RECEIPT_WIDTH - MARGIN - ttlW, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    // Wrap long names
    const lines = doc.splitTextToSize(item.name, 105);
    lines.forEach((line: string, i: number) => {
      doc.text(line, MARGIN, y);
      if (i === 0) {
        doc.text(String(item.qty), MARGIN + 113, y);
        doc.text(formatCurrency(item.unitPrice), MARGIN + 135, y);
        const totalStr = formatCurrency(item.total);
        const tw = doc.getTextWidth(totalStr);
        doc.text(totalStr, RECEIPT_WIDTH - MARGIN - tw, y);
      }
      y += 9;
    });
  });

  dashedLine();

  // Totals
  leftRight("Sous-total", formatCurrency(data.subtotal), 7);
  if (data.taxRate && data.taxAmount) {
    leftRight(`TVA (${data.taxRate}%)`, formatCurrency(data.taxAmount), 7);
  }

  // Accent line
  doc.setDrawColor(...brandRgb);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y, RECEIPT_WIDTH - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  leftRight("TOTAL", formatCurrency(data.total), 10, true);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  leftRight("Payé", formatCurrency(data.paid), 7);
  if (data.remaining > 0) {
    doc.setTextColor(200, 0, 0);
    leftRight("Reste", formatCurrency(data.remaining), 7, true);
    doc.setTextColor(0);
  }

  if (data.paymentMethod) {
    leftRight("Paiement", data.paymentMethod === "card" ? "Carte" : "Espèces", 7);
  }

  dashedLine();

  // Terms & warranty
  doc.setFontSize(6);
  doc.setTextColor(120);
  const defaultTerms = [
    "Garantie de 90 jours sur toutes les pièces.",
    "Les appareils non récupérés après 30 jours",
    "ne sont plus sous notre responsabilité.",
    "Merci pour votre confiance !",
  ];
  const terms = (settings as any).receipt_terms
    ? (settings as any).receipt_terms.split('\n').filter((l: string) => l.trim())
    : defaultTerms;
  terms.forEach((line) => {
    centerText(line, 6);
  });

  y += 4;
  doc.setTextColor(0);
  centerText(settings.shop_name, 7, true);

  // Open in new window for print
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
