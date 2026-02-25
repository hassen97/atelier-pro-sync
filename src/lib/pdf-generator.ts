import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ShopSettings } from "@/hooks/useShopSettings";
import { formatCurrency } from "@/lib/currency";

// Brand color presets mapping
const COLOR_PRESETS: Record<string, [number, number, number]> = {
  blue: [37, 99, 235],
  emerald: [16, 185, 129],
  red: [239, 68, 68],
  purple: [139, 92, 246],
  amber: [245, 158, 11],
  pink: [236, 72, 153],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function getBrandColor(settings: ShopSettings): [number, number, number] {
  const brand = settings.brand_color || "blue";
  if (COLOR_PRESETS[brand]) return COLOR_PRESETS[brand];
  if (brand.startsWith("#")) return hexToRgb(brand);
  return COLOR_PRESETS.blue;
}

async function loadLogoAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface PdfShopInfo {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  logoUrl?: string;
  brandColor: [number, number, number];
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
}

interface PdfLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PdfCustomerInfo {
  name: string;
  phone?: string;
  email?: string;
  imei?: string;
  device?: string;
}

interface PdfReceiptData {
  type: "repair" | "sale" | "invoice";
  receiptNumber: string;
  date: string;
  customer: PdfCustomerInfo;
  items: PdfLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status?: string;
  warrantyTerms?: string;
}

export async function generatePdf(
  shop: PdfShopInfo,
  data: PdfReceiptData,
  mode: "download" | "preview" = "download"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const color = shop.brandColor;
  const fmt = (n: number) => formatCurrency(n, shop.currency);
  let y = 10;

  // ── Header background ──
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, pageW, 38, "F");

  // ── Logo or Shop Name ──
  let logoLoaded = false;
  if (shop.logoUrl) {
    const logoBase64 = await loadLogoAsBase64(shop.logoUrl);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 14, 6, 26, 26);
        logoLoaded = true;
      } catch {
        logoLoaded = false;
      }
    }
  }

  doc.setTextColor(255, 255, 255);
  const nameX = logoLoaded ? 46 : 14;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(shop.name, nameX, 18);

  // Shop contact info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const contacts: string[] = [];
  if (shop.phone) contacts.push(`Tél: ${shop.phone}`);
  if (shop.whatsapp) contacts.push(`WhatsApp: ${shop.whatsapp}`);
  if (shop.address) contacts.push(shop.address);
  if (contacts.length) {
    doc.text(contacts.join("  •  "), nameX, 25);
  }

  // Receipt type label on right
  const typeLabels = { repair: "FICHE DE RÉPARATION", sale: "REÇU DE VENTE", invoice: "FACTURE" };
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabels[data.type], pageW - 14, 18, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`N°: ${data.receiptNumber}`, pageW - 14, 24, { align: "right" });
  doc.text(`Date: ${data.date}`, pageW - 14, 30, { align: "right" });

  y = 46;

  // ── Customer Section ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Client", 14, y);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.5, 50, y + 1.5);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const custLines: string[] = [];
  custLines.push(`Nom: ${data.customer.name}`);
  if (data.customer.phone) custLines.push(`Tél: ${data.customer.phone}`);
  if (data.customer.email) custLines.push(`Email: ${data.customer.email}`);
  if (data.customer.device) custLines.push(`Appareil: ${data.customer.device}`);
  if (data.customer.imei) custLines.push(`IMEI: ${data.customer.imei}`);

  custLines.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  if (data.status) {
    doc.setFont("helvetica", "bold");
    doc.text(`Statut: ${data.status}`, pageW - 14, y - custLines.length * 5 + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
  }

  y += 4;

  // ── Itemized Table ──
  autoTable(doc, {
    startY: y,
    head: [["Désignation", "Qté", "Prix Unit.", "Total"]],
    body: data.items.map((item) => [
      item.name,
      String(item.quantity),
      fmt(item.unitPrice),
      fmt(item.total),
    ]),
    headStyles: {
      fillColor: [color[0], color[1], color[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
    theme: "grid",
    styles: { cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.2 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Totals Section ──
  const totalsX = pageW - 14;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Sous-total:", totalsX - 50, y);
  doc.text(fmt(data.subtotal), totalsX, y, { align: "right" });
  y += 6;

  if (shop.taxEnabled && data.tax > 0) {
    doc.text(`TVA (${shop.taxRate}%):`, totalsX - 50, y);
    doc.text(fmt(data.tax), totalsX, y, { align: "right" });
    y += 6;
  }

  // Total line
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  doc.line(totalsX - 60, y - 2, totalsX, y - 2);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text("TOTAL:", totalsX - 50, y + 4);
  doc.text(fmt(data.total), totalsX, y + 4, { align: "right" });
  y += 12;

  // Payment info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Payé: ${fmt(data.amountPaid)}`, totalsX - 50, y);
  const remaining = data.total - data.amountPaid;
  if (remaining > 0) {
    y += 5;
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text(`Reste à payer: ${fmt(remaining)}`, totalsX - 50, y);
  }

  y += 12;

  // ── Warranty / Terms ──
  if (data.warrantyTerms) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(14, y, pageW - 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Conditions & Garantie", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const terms = doc.splitTextToSize(data.warrantyTerms, pageW - 28);
    doc.text(terms, 14, y);
    y += terms.length * 3.5;
  }

  // ── Footer ──
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Merci pour votre confiance !", pageW / 2, y, { align: "center" });
  doc.text(shop.name, pageW / 2, y + 4, { align: "center" });

  // Output
  if (mode === "preview") {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } else {
    doc.save(`${data.receiptNumber}.pdf`);
  }
}

// ── Helper: Generate Repair PDF ──
export async function generateRepairPdf(
  repair: {
    id: string;
    customer: string;
    phone: string;
    device: string;
    imei?: string;
    issue: string;
    diagnosis?: string;
    status: string;
    depositDate: string;
    parts: { name: string; cost: number }[];
    labor: number;
    total: number;
    paid: number;
  },
  settings: ShopSettings,
  statusLabel: string,
  profile?: { phone?: string; whatsapp_phone?: string; email?: string }
) {
  const brandColor = getBrandColor(settings);
  const items: PdfLineItem[] = [
    ...repair.parts.map((p) => ({
      name: p.name,
      quantity: 1,
      unitPrice: p.cost,
      total: p.cost,
    })),
  ];
  if (repair.labor > 0) {
    items.push({ name: "Main d'œuvre", quantity: 1, unitPrice: repair.labor, total: repair.labor });
  }

  const partsCost = repair.parts.reduce((s, p) => s + p.cost, 0);
  const subtotal = partsCost + repair.labor;

  await generatePdf(
    {
      name: settings.shop_name,
      phone: profile?.phone,
      whatsapp: profile?.whatsapp_phone,
      logoUrl: settings.logo_url,
      brandColor,
      currency: settings.currency,
      taxEnabled: false,
      taxRate: 0,
    },
    {
      type: "repair",
      receiptNumber: repair.id.substring(0, 8).toUpperCase(),
      date: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
      customer: {
        name: repair.customer,
        phone: repair.phone,
        device: repair.device,
        imei: repair.imei,
      },
      items,
      subtotal,
      tax: 0,
      total: repair.total,
      amountPaid: repair.paid,
      status: statusLabel,
      warrantyTerms:
        "Garantie de 90 jours sur toutes les pièces remplacées. La garantie ne couvre pas les dommages causés par l'eau, les chutes ou toute modification non autorisée. Le client doit présenter ce reçu pour toute réclamation sous garantie.",
    },
    "preview"
  );
}

// ── Helper: Generate Sale PDF ──
export async function generateSalePdf(
  sale: {
    items: { name: string; quantity: number; price: number }[];
    customerName: string;
    customerPhone?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
  },
  settings: ShopSettings,
  profile?: { phone?: string; whatsapp_phone?: string }
) {
  const brandColor = getBrandColor(settings);

  await generatePdf(
    {
      name: settings.shop_name,
      phone: profile?.phone,
      whatsapp: profile?.whatsapp_phone,
      logoUrl: settings.logo_url,
      brandColor,
      currency: settings.currency,
      taxEnabled: settings.tax_enabled,
      taxRate: settings.tax_rate,
    },
    {
      type: "sale",
      receiptNumber: `V-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toLocaleDateString("fr-TN"),
      customer: { name: sale.customerName, phone: sale.customerPhone },
      items: sale.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        total: i.price * i.quantity,
      })),
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      amountPaid: sale.total,
      warrantyTerms:
        "Les produits vendus ne sont ni repris ni échangés sauf défaut de fabrication constaté dans les 7 jours suivant l'achat.",
    },
    "preview"
  );
}

// ── Helper: Generate Invoice PDF ──
export async function generateInvoicePdf(
  invoice: {
    invoiceNumber: string;
    customerName: string;
    customerPhone?: string;
    date: string;
    totalAmount: number;
    status: string;
    repairDevice?: string;
    saleAmount?: number;
    type: string;
  },
  settings: ShopSettings,
  profile?: { phone?: string; whatsapp_phone?: string }
) {
  const brandColor = getBrandColor(settings);

  const items: PdfLineItem[] = [];
  if (invoice.type === "Réparation" && invoice.repairDevice) {
    items.push({ name: `Réparation - ${invoice.repairDevice}`, quantity: 1, unitPrice: invoice.totalAmount, total: invoice.totalAmount });
  } else if (invoice.type === "Vente") {
    items.push({ name: "Vente de produits", quantity: 1, unitPrice: invoice.totalAmount, total: invoice.totalAmount });
  } else {
    items.push({ name: invoice.type, quantity: 1, unitPrice: invoice.totalAmount, total: invoice.totalAmount });
  }

  await generatePdf(
    {
      name: settings.shop_name,
      phone: profile?.phone,
      whatsapp: profile?.whatsapp_phone,
      logoUrl: settings.logo_url,
      brandColor,
      currency: settings.currency,
      taxEnabled: false,
      taxRate: 0,
    },
    {
      type: "invoice",
      receiptNumber: invoice.invoiceNumber,
      date: invoice.date,
      customer: { name: invoice.customerName, phone: invoice.customerPhone },
      items,
      subtotal: invoice.totalAmount,
      tax: 0,
      total: invoice.totalAmount,
      amountPaid: invoice.status === "paid" ? invoice.totalAmount : 0,
      status: invoice.status,
    },
    "preview"
  );
}
