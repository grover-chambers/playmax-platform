import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ANALYTICS_COLORS, CHART_COLORS } from "@/lib/analytics-colors";

const COLORS = {
  ...ANALYTICS_COLORS,
  dark: "#1a1a1a",
  ivory: "#FFFFF0",
  gray: "#666666",
  lightGray: "#999999",
};

const PALETTE = [...CHART_COLORS];

/* ── Types ── */
export interface SupplierData {
  id: string;
  name: string;
  revenue: number;
  units: number;
  share: number;
  avgPrice: number;
  isClient: boolean;
}

export interface BranchData {
  name: string;
  revenue: number;
  units: number;
  share: number;
}

export interface ClientBranchData {
  name: string;
  revenue: number;
  units: number;
}

export interface ReportData {
  grandTotal: number;
  grandQty: number;
  supplierDetails: SupplierData[];
  branchDetails: BranchData[];
  clientTotal: { total: number; units: number };
  clientRank: number;
  clientShare: number;
  clientBranchDetails: ClientBranchData[];
  totalSuppliers: number;
  totalProducts: number;
  totalBranches: number;
  categoryName: string;
  clientName: string;
  clientDisplayName: string;
  periodLabel: string;
}

/* ── Helpers ── */
function fmt(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...hexToRgb(COLORS.yellow));
  doc.rect(0, 0, 210, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 20, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 20, 36);

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 20, 42);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 46, 190, 46);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 20, y);
  doc.setFillColor(...hexToRgb(COLORS.yellow));
  doc.rect(20, y + 2, 30, 1.5, "F");
  return y + 12;
}

function drawParagraph(doc: jsPDF, text: string, y: number, maxWidth = 170): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 20, y);
  return y + lines.length * 5 + 4;
}

function drawKPIBox(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number, color: string) {
  doc.setFillColor(...hexToRgb("#f8f8f8"));
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setFillColor(...hexToRgb(color));
  doc.rect(x, y, w, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(value, x + w / 2, y + h / 2 + 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(label, x + w / 2, y + h / 2 + 10, { align: "center" });
}

function drawBarChart(doc: jsPDF, data: { label: string; value: number; color?: string }[], y: number, maxBars = 8): number {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 6;
  const gap = 3;
  const labelW = 45;
  const barW = 100;

  for (let i = 0; i < Math.min(data.length, maxBars); i++) {
    const barY = y + i * (barH + gap);
    const pct = data[i].value / maxVal;
    const color = data[i].color || PALETTE[i % PALETTE.length];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(data[i].label.slice(0, 25), 20, barY + 4.5);

    doc.setFillColor(230, 230, 230);
    doc.roundedRect(20 + labelW + 2, barY, barW, barH, 1, 1, "F");

    doc.setFillColor(...hexToRgb(color));
    doc.roundedRect(20 + labelW + 2, barY, barW * pct, barH, 1, 1, "F");

    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(fmt(data[i].value), 20 + labelW + barW + 5, barY + 4.5);
  }

  return y + Math.min(data.length, maxBars) * (barH + gap) + 5;
}

function drawFooter(doc: jsPDF, pageNum: number) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Kanini Analytics · Confidential", 20, pageH - 10);
  doc.text(`Page ${pageNum}`, 190, pageH - 10, { align: "right" });
}

function checkPageBreak(doc: jsPDF, currentY: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageH - 25) {
    doc.addPage();
    drawFooter(doc, doc.getNumberOfPages());
    return 55;
  }
  return currentY;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 1: Market Share Intelligence
   ══════════════════════════════════════════════════════════════════ */

export function generateMarketShareReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, "Market Share Intelligence", `${data.categoryName} Category · ${data.clientDisplayName} · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Executive Summary", y);

  const knownSuppliers = data.supplierDetails.filter((s) => s.id !== "unknown");
  const topSupplier = knownSuppliers[0];

  y = drawParagraph(
    doc,
    `The ${data.categoryName.toLowerCase()} category within the Kanini retail network represents a total addressable market of ${fmt(data.grandTotal)} in revenue across ${fmtNum(data.grandQty)} units sold through ${data.totalBranches} branches during the ${data.periodLabel} period. This comprehensive analysis covers ${data.totalSuppliers} active suppliers competing for shelf space across ${data.totalProducts} distinct product lines.`,
    y
  );

  y = drawParagraph(
    doc,
    `${data.clientDisplayName} currently holds position #${data.clientRank} in the competitive landscape with a ${fmtPct(data.clientShare)} market share, generating ${fmt(data.clientTotal.total)} in revenue from ${fmtNum(data.clientTotal.units)} units sold. This positions ${data.clientName} as a significant player with substantial room for growth against the market leaders.`,
    y
  );

  y = drawParagraph(
    doc,
    `The market is led by ${topSupplier?.name || "the market leader"} with a ${fmtPct(topSupplier?.share || 0)} share, commanding ${fmt(topSupplier?.revenue || 0)} in revenue. The top three suppliers collectively control a dominant portion of the market, indicating an oligopolistic competitive structure that requires careful navigation.`,
    y
  );

  // KPI boxes
  y += 5;
  drawKPIBox(doc, "Market Leader", topSupplier?.name?.slice(0, 18) || "—", 20, y, 42, 22, COLORS.yellow);
  drawKPIBox(doc, "Your Rank", `#${data.clientRank}`, 65, y, 30, 22, COLORS.green);
  drawKPIBox(doc, "Your Share", fmtPct(data.clientShare), 98, y, 30, 22, COLORS.yellow);
  drawKPIBox(doc, "Total Market", fmt(data.grandTotal), 131, y, 59, 22, COLORS.blue);
  y += 30;

  // Market share table
  y = drawSectionTitle(doc, "Competitive Market Share Ranking", y);

  const tableData = knownSuppliers.slice(0, 12).map((s, i) => [
    `#${i + 1}`,
    s.isClient ? `${s.name} (you)` : s.name,
    fmt(s.revenue),
    fmtPct(s.share),
    fmtNum(s.units),
    s.isClient ? "You" : "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Rank", "Supplier", "Revenue", "Share", "Units", ""]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
    },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const supplier = knownSuppliers[hookData.row.index];
        if (supplier?.isClient) {
          hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Analysis paragraph
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Strategic Analysis", y);
  y = drawParagraph(
    doc,
    `The competitive dynamics in the ${data.categoryName.toLowerCase()} category reveal a market where scale and distribution reach are key differentiators. The market leader, ${topSupplier?.name}, has established dominance through extensive product range and branch penetration. ${data.clientDisplayName}, while currently at ${fmtPct(data.clientShare)} share, demonstrates strong unit velocity with an average selling price of KES ${Math.round(data.clientTotal.total / data.clientTotal.units).toLocaleString()} per unit.`,
    y
  );
  y = drawParagraph(
    doc,
    `To improve market position, ${data.clientName} should consider: (1) Expanding product range to capture price-sensitive segments, (2) Negotiating volume-based supplier agreements to improve margins, (3) Strengthening presence in high-volume branches where performance currently lags, and (4) Leveraging premium brand positioning to command higher margins in key urban branches.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 2: Category Analysis
   ══════════════════════════════════════════════════════════════════ */

export function generateCategoryAnalysisReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, "Category Performance Analysis", `${data.categoryName} Segment · Kanini Network · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Category Overview", y);

  y = drawParagraph(
    doc,
    `The ${data.categoryName.toLowerCase()} category is a critical product segment in the Kanini retail network. With ${data.totalProducts} active product lines sourced from ${data.totalSuppliers} suppliers and distributed across ${data.totalBranches} retail outlets, this category represents a ${fmt(data.grandTotal)} revenue opportunity during the ${data.periodLabel} review period.`,
    y
  );

  y = drawParagraph(
    doc,
    `Total unit volume reached ${fmtNum(data.grandQty)} units, translating to an average category velocity of approximately ${fmtNum(data.grandQty / data.totalBranches)} units per branch over the period. The category demonstrates strong demand fundamentals driven by consistent consumer demand across the network.`,
    y
  );

  // KPI boxes
  y += 5;
  drawKPIBox(doc, "Total Revenue", fmt(data.grandTotal), 20, y, 42, 22, COLORS.yellow);
  drawKPIBox(doc, "Total Units", fmtNum(data.grandQty), 65, y, 35, 22, COLORS.green);
  drawKPIBox(doc, "Active SKUs", String(data.totalProducts), 103, y, 30, 22, COLORS.blue);
  drawKPIBox(doc, "Suppliers", String(data.totalSuppliers), 136, y, 30, 22, COLORS.pink);
  drawKPIBox(doc, "Branches", String(data.totalBranches), 169, y, 21, 22, COLORS.orange);
  y += 30;

  // Branch performance
  y = drawSectionTitle(doc, "Branch Performance Distribution", y);
  y = drawParagraph(
    doc,
    `Revenue distribution across branches shows significant variation, with the top-performing branch generating substantially more volume than smaller outlets. This geographic concentration suggests opportunities for targeted supplier negotiations and localized promotional strategies.`,
    y
  );

  const branchBars = data.branchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => ({ label: b.name, value: b.revenue, color: PALETTE[i % PALETTE.length] }));

  y = drawBarChart(doc, branchBars, y);

  // Branch table
  y = checkPageBreak(doc, y, 80);
  const branchTableData = data.branchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => [
      `#${i + 1}`,
      b.name,
      fmt(b.revenue),
      fmtPct(b.share),
      fmtNum(b.units),
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Branch", "Revenue", "Share", "Units"]],
    body: branchTableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  y = checkPageBreak(doc, y, 50);
  y = drawSectionTitle(doc, "Key Observations", y);
  y = drawParagraph(
    doc,
    `1. Geographic concentration is significant: The top three branches account for over ${fmtPct(data.branchDetails.slice(0, 3).reduce((s, b) => s + b.share, 0))} of total category revenue, indicating potential for targeted growth strategies in underperforming locations.`,
    y
  );
  y = drawParagraph(
    doc,
    `2. Branch-level performance varies considerably, with some locations showing minimal sales activity. This suggests either stock availability issues or differing consumer demand patterns that warrant further investigation.`,
    y
  );
  y = drawParagraph(
    doc,
    `3. The branch-level variation presents an opportunity for ${data.clientName} to negotiate branch-specific supply agreements that account for local demand patterns and competitive dynamics.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 3: Client Performance Deep Dive
   ══════════════════════════════════════════════════════════════════ */

export function generateNicePerformanceReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, `${data.clientDisplayName} Performance`, `Competitive Position Analysis · ${data.categoryName} Category · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Position Summary", y);

  y = drawParagraph(
    doc,
    `${data.clientDisplayName} occupies position #${data.clientRank} out of ${data.totalSuppliers} active suppliers in the ${data.categoryName.toLowerCase()} category, generating ${fmt(data.clientTotal.total)} in total revenue from ${fmtNum(data.clientTotal.units)} units sold across ${data.totalBranches} branches during the ${data.periodLabel} period. This translates to a ${fmtPct(data.clientShare)} market share in a category worth ${fmt(data.grandTotal)}.`,
    y
  );

  // KPI boxes
  y += 5;
  drawKPIBox(doc, "Market Position", `#${data.clientRank}`, 20, y, 35, 22, COLORS.yellow);
  drawKPIBox(doc, "Revenue", fmt(data.clientTotal.total), 58, y, 42, 22, COLORS.green);
  drawKPIBox(doc, "Market Share", fmtPct(data.clientShare), 103, y, 35, 22, COLORS.blue);
  drawKPIBox(doc, "Units Sold", fmtNum(data.clientTotal.units), 141, y, 49, 22, COLORS.orange);
  y += 30;

  const avgPrice = Math.round(data.clientTotal.total / data.clientTotal.units);

  y = drawSectionTitle(doc, "Revenue Analysis", y);
  y = drawParagraph(
    doc,
    `${data.clientName}'s revenue performance of ${fmt(data.clientTotal.total)} represents a solid foundation in the ${data.categoryName.toLowerCase()} category. The average selling price of KES ${avgPrice.toLocaleString()} per unit indicates strong positioning in the market. This pricing strategy, while potentially limiting volume potential, protects margin integrity and supports brand equity.`,
    y
  );

  // Client branch breakdown
  y = drawSectionTitle(doc, "Branch-Level Performance", y);
  y = drawParagraph(
    doc,
    `${data.clientName}'s revenue distribution across branches reveals a clear geographic strength pattern. The following analysis highlights top-performing locations and areas where increased presence could drive significant growth.`,
    y
  );

  const clientBranchBars = data.clientBranchDetails
    .filter((b) => b.revenue > 0)
    .map((b) => ({ label: b.name, value: b.revenue, color: COLORS.yellow }));

  y = drawBarChart(doc, clientBranchBars, y);

  // Client branch table
  y = checkPageBreak(doc, y, 80);
  const clientBranchTable = data.clientBranchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => [
      `#${i + 1}`,
      b.name,
      fmt(b.revenue),
      fmtNum(b.units),
      fmt(b.revenue / b.units) + "/unit",
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Branch", "Revenue", "Units", "Avg Price"]],
    body: clientBranchTable,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Growth Recommendations", y);
  y = drawParagraph(
    doc,
    `Based on the competitive analysis, ${data.clientName} has significant opportunities to grow its market share in the ${data.categoryName.toLowerCase()} category. The following strategic recommendations are designed to accelerate growth while maintaining the brand positioning that differentiates ${data.clientName} from volume-focused competitors.`,
    y
  );
  y = drawParagraph(
    doc,
    `1. Expand the product range to include additional pack sizes and variants that capture broader purchase occasions without diluting brand perception.`,
    y
  );
  y = drawParagraph(
    doc,
    `2. Strengthen presence in high-volume branches where ${data.clientName} currently has limited visibility but strong market potential.`,
    y
  );
  y = drawParagraph(
    doc,
    `3. Negotiate volume-based rebate agreements with suppliers to improve margins while maintaining competitive retail pricing.`,
    y
  );
  y = drawParagraph(
    doc,
    `4. Implement targeted in-store promotions in underperforming branches to increase trial rates and build repeat purchase behavior among price-sensitive consumers.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 4: Supplier Competition Analysis
   ══════════════════════════════════════════════════════════════════ */

export function generateSupplierCompetitionReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, "Supplier Competition Analysis", `Competitive Landscape · ${data.categoryName} Category · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Competitive Landscape Overview", y);

  const knownSuppliers = data.supplierDetails.filter((s) => s.id !== "unknown");

  y = drawParagraph(
    doc,
    `The ${data.categoryName.toLowerCase()} category features ${data.totalSuppliers} active suppliers competing for shelf space and consumer preference across the Kanini retail network. The competitive landscape is characterized by a mix of large-scale suppliers and specialized regional producers, creating a dynamic market environment with varying pricing strategies and product positioning approaches.`,
    y
  );

  y = drawParagraph(
    doc,
    `Total category revenue of ${fmt(data.grandTotal)} is distributed across these suppliers with significant concentration at the top. The market exhibits a classic power-law distribution where a handful of dominant players capture the majority of revenue, while smaller suppliers compete for niche segments and regional market share.`,
    y
  );

  // Competitor ranking table
  y = drawSectionTitle(doc, "Competitive Ranking", y);

  const tableData = knownSuppliers.slice(0, 15).map((s, i) => [
    `#${i + 1}`,
    s.isClient ? `YOU  ${s.name}` : `${s.name.slice(0, 25)}`,
    fmt(s.revenue),
    fmtPct(s.share),
    fmt(s.avgPrice) + "/unit",
    s.isClient ? "You" : "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Rank", "Supplier", "Revenue", "Share", "Avg Price", ""]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const supplier = knownSuppliers[hookData.row.index];
        if (supplier?.isClient) {
          hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Revenue distribution chart
  y = checkPageBreak(doc, y, 70);
  y = drawSectionTitle(doc, "Revenue Distribution", y);

  const topBars = knownSuppliers.slice(0, 8).map((s, i) => ({
    label: s.name.slice(0, 22),
    value: s.revenue,
    color: s.isClient ? COLORS.yellow : PALETTE[i % PALETTE.length],
  }));

  y = drawBarChart(doc, topBars, y);

  // Competitive insights
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Competitive Intelligence", y);

  const topSupplier = knownSuppliers[0];
  const secondSupplier = knownSuppliers[1];

  y = drawParagraph(
    doc,
    `The market leader, ${topSupplier?.name}, commands a dominant position with ${fmtPct(topSupplier?.share || 0)} market share. Their competitive advantage stems from extensive distribution networks, strong brand recognition, and competitive pricing strategies. The gap between the market leader and the second-ranked supplier, ${secondSupplier?.name}, is significant at ${fmtPct((topSupplier?.share || 0) - (secondSupplier?.share || 0))} percentage points.`,
    y
  );

  y = drawParagraph(
    doc,
    `${data.clientDisplayName} at position #${data.clientRank} occupies a strategic mid-market position. The key challenge is balancing brand positioning with volume growth to improve overall category economics.`,
    y
  );

  y = drawParagraph(
    doc,
    `Price analysis reveals that premium-positioned suppliers like ${data.clientName} command higher average selling prices (KES ${Math.round(data.clientTotal.total / data.clientTotal.units).toLocaleString()}/unit) compared to volume-focused competitors. This pricing premium is justified by product quality perception and brand trust but requires careful management to avoid price-sensitive consumer defection.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 5: Branch Breakdown
   ══════════════════════════════════════════════════════════════════ */

export function generateBranchBreakdownReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, "Branch Performance Breakdown", `Geographic Sales Distribution · ${data.categoryName} Category · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Geographic Revenue Analysis", y);

  y = drawParagraph(
    doc,
    `The Kanini retail network operates ${data.totalBranches} branches across Kenya, each serving distinct market segments with varying competitive dynamics and consumer preferences. This branch-level analysis reveals significant geographic variations in ${data.categoryName.toLowerCase()} demand, pricing patterns, and supplier competitive positioning.`,
    y
  );

  y = drawParagraph(
    doc,
    `Total category revenue of ${fmt(data.grandTotal)} is distributed across branches with notable concentration. The top-performing branch generates approximately ${fmtPct(data.branchDetails[0]?.share || 0)} of total revenue, while smaller outlets contribute minimally. This geographic concentration has significant implications for supplier negotiation strategies and distribution logistics.`,
    y
  );

  // Branch ranking
  y = drawSectionTitle(doc, "Branch Revenue Ranking", y);

  const branchBars = data.branchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => ({ label: b.name, value: b.revenue, color: PALETTE[i % PALETTE.length] }));

  y = drawBarChart(doc, branchBars, y, 11);

  // Branch table
  y = checkPageBreak(doc, y, 100);
  const branchTableData = data.branchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => [
      `#${i + 1}`,
      b.name,
      fmt(b.revenue),
      fmtPct(b.share),
      fmtNum(b.units),
      fmt(b.revenue / b.units) + "/unit",
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Branch", "Revenue", "Share", "Units", "Avg Price"]],
    body: branchTableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Branch analysis
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Branch-Level Insights", y);

  y = drawParagraph(
    doc,
    `1. The top three branches collectively account for approximately ${fmtPct(data.branchDetails.slice(0, 3).reduce((s, b) => s + b.share, 0))} of total category revenue. These high-volume locations represent priority targets for supplier negotiations and promotional investments.`,
    y
  );

  const lowPerformers = data.branchDetails.filter((b) => b.revenue > 0).slice(-2).map((b) => b.name).join(" and ");
  y = drawParagraph(
    doc,
    `2. ${lowPerformers} show minimal ${data.categoryName.toLowerCase()} activity, suggesting either operational challenges, stock availability issues, or consumer preference patterns that differ from other locations. A detailed investigation is recommended.`,
    y
  );
  y = drawParagraph(
    doc,
    `3. Branch-level pricing varies significantly, with some locations commanding premium prices while others compete on volume. This variation creates opportunities for differentiated supplier agreements that account for local market conditions.`,
    y
  );
  y = drawParagraph(
    doc,
    `4. For ${data.clientName} specifically, understanding branch-level performance enables targeted strategies that account for local competitive dynamics and consumer preferences in each location.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT 6: Kanini Network Sales Performance
   ══════════════════════════════════════════════════════════════════ */

export function generateKaniniNetworkReport(data: ReportData): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, "Kanini Network Sales Performance", `Cross-Branch Intelligence · ${data.categoryName} Category · ${data.periodLabel}`);

  let y = 55;
  y = drawSectionTitle(doc, "Network Overview", y);

  const knownSuppliers = data.supplierDetails.filter((s) => s.id !== "unknown");
  const avgPrice = data.grandQty > 0 ? Math.round(data.grandTotal / data.grandQty) : 0;

  y = drawParagraph(
    doc,
    `The Kanini retail network represents a significant distribution platform for ${data.categoryName.toLowerCase()} products, operating ${data.totalBranches} branches that collectively generated ${fmt(data.grandTotal)} in category revenue during the ${data.periodLabel} period. This performance reflects the strength of the Kanini brand and its ability to attract both suppliers and consumers across diverse geographic markets.`,
    y
  );

  y = drawParagraph(
    doc,
    `Total unit volume reached ${fmtNum(data.grandQty)} units, with an average selling price of KES ${avgPrice.toLocaleString()} across all suppliers and product lines. The network's reach and scale create significant opportunities for suppliers seeking to optimize their distribution efficiency and market penetration.`,
    y
  );

  // KPI boxes
  y += 5;
  drawKPIBox(doc, "Network Revenue", fmt(data.grandTotal), 20, y, 42, 22, COLORS.yellow);
  drawKPIBox(doc, "Total Units", fmtNum(data.grandQty), 65, y, 35, 22, COLORS.green);
  drawKPIBox(doc, "Avg Price", `KES ${avgPrice.toLocaleString()}`, 103, y, 35, 22, COLORS.blue);
  drawKPIBox(doc, "Active Suppliers", String(knownSuppliers.length), 141, y, 30, 22, COLORS.pink);
  drawKPIBox(doc, "Branches", String(data.totalBranches), 174, y, 16, 22, COLORS.orange);
  y += 30;

  // Network branch performance
  y = drawSectionTitle(doc, "Branch Network Performance", y);
  y = drawParagraph(
    doc,
    `The following analysis presents the performance of each branch within the Kanini network, highlighting revenue contribution, unit velocity, and pricing patterns. This data is essential for understanding geographic demand variations and optimizing supply chain strategies across the network.`,
    y
  );

  const branchTableData = data.branchDetails
    .filter((b) => b.revenue > 0)
    .map((b, i) => [
      `#${i + 1}`,
      b.name,
      fmt(b.revenue),
      fmtPct(b.share),
      fmtNum(b.units),
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Branch", "Revenue", "Share", "Units"]],
    body: branchTableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Supplier landscape
  y = checkPageBreak(doc, y, 80);
  y = drawSectionTitle(doc, "Supplier Landscape Within Kanini Network", y);
  y = drawParagraph(
    doc,
    `The Kanini network hosts ${knownSuppliers.length} active ${data.categoryName.toLowerCase()} suppliers, creating a competitive marketplace that benefits consumers through product variety and competitive pricing. The following ranking shows the top suppliers by revenue contribution to the network.`,
    y
  );

  const topSuppliersTable = knownSuppliers.slice(0, 10).map((s, i) => [
    `#${i + 1}`,
    s.isClient ? `YOU  ${s.name}` : s.name.slice(0, 28),
    fmt(s.revenue),
    fmtPct(s.share),
    fmt(s.avgPrice),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Supplier", "Revenue", "Share", "Avg Price"]],
    body: topSuppliersTable,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const supplier = knownSuppliers[hookData.row.index];
        if (supplier?.isClient) {
          hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Network insights
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Network Intelligence & Opportunities", y);
  y = drawParagraph(
    doc,
    `1. The Kanini network's geographic spread across ${data.totalBranches} branches provides suppliers with unparalleled reach into diverse Kenyan markets. This distribution advantage is particularly valuable for suppliers seeking to establish national brand presence without investing in proprietary distribution infrastructure.`,
    y
  );
  y = drawParagraph(
    doc,
    `2. Branch-level performance variation creates opportunities for targeted supplier agreements. High-volume branches offer volume-based negotiation opportunities, while smaller branches provide testing grounds for new products and pricing strategies.`,
    y
  );
  y = drawParagraph(
    doc,
    `3. For ${data.clientDisplayName}, the network data reveals specific branch-level opportunities where increased presence could significantly improve overall market share.`,
    y
  );
  y = drawParagraph(
    doc,
    `4. Cross-branch analysis enables predictive demand modeling that can optimize inventory allocation, reduce stockouts, and improve overall supply chain efficiency. Suppliers who leverage this data for supply planning will gain competitive advantages in service levels and cost management.`,
    y
  );

  drawFooter(doc, 1);
  return doc;
}

/* ── Summary Report (used by the publish pipeline) ── */
export function generateSummaryReport(title: string, clientName: string | null, bodyText: string): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, title, clientName ? `Prepared for ${clientName}` : "");
  let y = 54;
  y = drawSectionTitle(doc, "Executive Summary", y);
  y += 2;
  drawParagraph(doc, bodyText, y);
  drawFooter(doc, 1);
  return doc;
}

export interface CategorySupplierRank {
  rank: number;
  name: string;
  revenue: number;
  units: number;
  share: number;
  isClient: boolean;
}

export interface BranchSupplierInfo {
  name: string;
  revenue: number;
  units: number;
  share: number;
  isClient: boolean;
}

export interface BranchMarketShareItem {
  branch: string;
  suppliers: BranchSupplierInfo[];
}

export interface SupplierCompetitionItem {
  supplier: string;
  isClient: boolean;
  totalRevenue: number;
  totalUnits: number;
  products: { product: string; revenue: number; units: number }[];
}

export interface BranchAnalysisItem {
  branch: string;
  totalRevenue: number;
  totalUnits: number;
  totalTransactions: number;
  clientRevenue: number;
  clientUnits: number;
  clientShare: number;
  avgRevenuePerTransaction: number;
}

export interface EnrichedReportData {
  categoryName: string;
  clientName: string;
  categoryTotal: number;
  categoryUnits: number;
  clientTotal: number;
  clientUnits: number;
  clientShare: number;
  clientRank: number;
  totalSuppliers: number;
  supplierRank: CategorySupplierRank[];
  branchMarketShare: BranchMarketShareItem[];
  supplierCompetition: SupplierCompetitionItem[];
  branchAnalysis: BranchAnalysisItem[];
  bestBranch: BranchAnalysisItem | null;
  worstBranch: BranchAnalysisItem | null;
}

export function generateEnrichedMarketShareReport(data: EnrichedReportData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Market Share Report`, `Prepared for ${data.clientName}`);
  let y = 54;

  // Executive summary
  y = drawSectionTitle(doc, "Market Share Overview", y);
  y = drawParagraph(doc, `This report provides a detailed analysis of the ${data.categoryName} market across the Kanini FMCG network. ${data.clientName} has achieved KES ${(data.clientTotal / 1000000).toFixed(1)}M in total sales, representing a ${data.clientShare.toFixed(1)}% share of the category and ranking #${data.clientRank} of ${data.totalSuppliers} suppliers.`, y);

  // Supplier ranking table
  y = checkPageBreak(doc, y, 80);
  y = drawSectionTitle(doc, "Category Supplier Rankings", y);
  y = drawParagraph(doc, `The following table ranks all ${data.totalSuppliers} suppliers in the ${data.categoryName} category by total revenue contribution.`, y);

  const supTable = data.supplierRank.slice(0, 15).map((s) => [
    `#${s.rank}`, s.isClient ? `YOU  ${s.name}` : s.name.slice(0, 28),
    fmt(s.revenue), fmtPct(s.share), fmtNum(s.units),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Supplier", "Revenue", "Share", "Units"]],
    body: supTable,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const s = data.supplierRank[hookData.row.index];
        if (s?.isClient) {
          hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Per-branch market share breakdown
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Per-Branch Supplier Breakdown", y);
  y = drawParagraph(doc, `The following analysis shows the supplier landscape within each branch. Each branch's top suppliers are listed with their revenue contribution and market share within that branch.`, y);

  for (const branch of data.branchMarketShare.slice(0, 10)) {
    y = checkPageBreak(doc, y, 40);
    y = drawParagraph(doc, `${branch.branch}`, y);
    const bTable = branch.suppliers.slice(0, 8).map((s) => [
      s.isClient ? `YOU  ${s.name}` : s.name.slice(0, 25),
      fmt(s.revenue), fmtPct(s.share),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Supplier", "Revenue", "Branch Share"]],
      body: bTable,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
      margin: { left: 25 },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.row.index !== undefined) {
          const s = branch.suppliers[hookData.row.index];
          if (s?.isClient) {
            hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  drawFooter(doc, Math.ceil((doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y) / 297);
  return doc;
}

export function generateEnrichedSupplierCompetitionReport(data: EnrichedReportData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Supplier Competition Report`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Competitive Landscape", y);
  y = drawParagraph(doc, `This report provides a detailed product-level comparison of suppliers in the ${data.categoryName} category. Each supplier's product portfolio is analyzed to identify competitive overlaps and opportunities for ${data.clientName}.`, y);

  const clientComp = data.supplierCompetition.find((s) => s.isClient);
  const topCompetitors = data.supplierCompetition.filter((s) => !s.isClient).slice(0, 5);

  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Your Product Portfolio", y);
  if (clientComp) {
    const prodTable = clientComp.products.map((p) => [p.product.slice(0, 30), fmt(p.revenue), fmtNum(p.units)]);
    autoTable(doc, {
      startY: y,
      head: [["Product", "Revenue", "Units"]],
      body: prodTable,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
      margin: { left: 20 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  } else {
    y = drawParagraph(doc, `${data.clientName} has no product listings in this category.`, y);
  }

  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, "Top Competitor Product Comparison", y);
  for (const comp of topCompetitors) {
    y = checkPageBreak(doc, y, 35);
    y = drawParagraph(doc, `${comp.supplier} — KES ${(comp.totalRevenue / 1000000).toFixed(1)}M total`, y);
    const cTable = comp.products.slice(0, 5).map((p) => [p.product.slice(0, 30), fmt(p.revenue), fmtNum(p.units)]);
    autoTable(doc, {
      startY: y,
      head: [["Product", "Revenue", "Units"]],
      body: cTable,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(COLORS.orange), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
      margin: { left: 25 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  const totalPages = Math.ceil((y + 20) / 297);
  drawFooter(doc, totalPages);
  return doc;
}

export function generateEnrichedBranchAnalysisReport(data: EnrichedReportData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Branch Performance Report`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Branch Performance Overview", y);
  y = drawParagraph(doc, `This report analyzes the ${data.categoryName} category performance across ${data.branchAnalysis.length} branches. It identifies the best and worst performing branches for ${data.clientName} and provides a complete branch-level breakdown.`, y);

  // Best and worst branches
  if (data.bestBranch) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Best Performing Branch", y);
    const bb = data.bestBranch;
    y = drawParagraph(doc, `Branch: ${bb.branch}`, y);
    y = drawParagraph(doc, `Total Category Revenue: ${fmt(bb.totalRevenue)}`, y);
    y = drawParagraph(doc, `${data.clientName} Revenue: ${fmt(bb.clientRevenue)} (${fmtPct(bb.clientShare)} share)`, y);
  }
  if (data.worstBranch) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Worst Performing Branch", y);
    const wb = data.worstBranch;
    y = drawParagraph(doc, `Branch: ${wb.branch}`, y);
    y = drawParagraph(doc, `Total Category Revenue: ${fmt(wb.totalRevenue)}`, y);
    y = drawParagraph(doc, `${data.clientName} Revenue: ${fmt(wb.clientRevenue)} (${fmtPct(wb.clientShare)} share)`, y);
  }

  // Complete branch breakdown table
  y = checkPageBreak(doc, y, 50);
  y = drawSectionTitle(doc, "Complete Branch Breakdown", y);
  const brTable = data.branchAnalysis.map((b) => [
    b.branch.slice(0, 20), fmt(b.totalRevenue), fmtPct(b.clientShare),
    fmt(b.clientRevenue), fmtNum(b.totalTransactions),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Branch", "Total Revenue", "Client Share", "Client Revenue", "Transactions"]],
    body: brTable,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const b = data.branchAnalysis[hookData.row.index];
        if (b && b.branch === data.bestBranch?.branch) {
          hookData.cell.styles.fillColor = hexToRgb("#E8F5E9");
        } else if (b && b.branch === data.worstBranch?.branch) {
          hookData.cell.styles.fillColor = hexToRgb("#FFEBEE");
        }
      }
    },
  });

  const totalPages = Math.ceil(((doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 40) / 297);
  drawFooter(doc, totalPages);
  return doc;
}

/* ── Report 4: Supplier Dominance per Branch ──────────── */

export interface BranchDominanceItem {
  branch: string;
  dominantSupplier: string;
  dominantShare: number;
  dominantRevenue: number;
  clientShare: number;
  clientRevenue: number;
  clientRank: number;
  totalSuppliers: number;
}

export interface BranchDominanceData {
  categoryName: string;
  clientName: string;
  branches: BranchDominanceItem[];
}

export function generateSupplierDominanceReport(data: BranchDominanceData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Supplier Dominance by Branch`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Branch Dominance Analysis", y);
  y = drawParagraph(doc, `This report identifies the dominant supplier in each branch alongside ${data.clientName}'s position. Highlighted rows show branches where ${data.clientName} is the leader.`, y);

  const tableData = data.branches.map((b) => [
    b.branch.slice(0, 18),
    b.dominantSupplier.slice(0, 22),
    fmtPct(b.dominantShare),
    fmt(b.dominantRevenue),
    `#${b.clientRank}`,
    fmtPct(b.clientShare),
    fmt(b.clientRevenue),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Branch", "Dominant Supplier", "Dom. Share", "Dom. Revenue", "Your Rank", "Your Share", "Your Revenue"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
    margin: { left: 15 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const b = data.branches[hookData.row.index];
        if (b && b.clientRank === 1) {
          hookData.cell.styles.fillColor = hexToRgb("#E8F5E9");
          hookData.cell.styles.fontStyle = "bold";
        } else if (b && b.clientRank === 2) {
          hookData.cell.styles.fillColor = hexToRgb("#E3F2FD");
        }
      }
    },
  });

  const fp = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y;
  drawFooter(doc, Math.ceil(fp / 297));
  return doc;
}

/* ── Report 5: Share Shift Analysis ────────────────────── */

export interface ShareShiftItem {
  supplier: string;
  isClient: boolean;
  currentShare: number;
  previousShare: number;
  shareChange: number;
  currentRevenue: number;
  previousRevenue: number;
  revenueChange: number;
  direction: "up" | "down" | "stable";
}

export interface ShareShiftData {
  categoryName: string;
  clientName: string;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  shifts: ShareShiftItem[];
}

export function generateShareShiftReport(data: ShareShiftData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Market Share Shift Analysis`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Share Movement Overview", y);
  y = drawParagraph(doc, `Comparing ${data.currentPeriodLabel} vs ${data.previousPeriodLabel}. Suppliers with positive share changes are gaining ground while declining ones are losing market position.`, y);

  const sorted = [...data.shifts].sort((a, b) => Math.abs(b.shareChange) - Math.abs(a.shareChange));
  const tableData = sorted.map((s) => [
    s.isClient ? `YOU  ${s.supplier}` : s.supplier.slice(0, 24),
    fmtPct(s.currentShare),
    fmtPct(s.previousShare),
    `${s.shareChange >= 0 ? "+" : ""}${s.shareChange.toFixed(1)}pp`,
    fmt(s.currentRevenue),
    fmt(s.previousRevenue),
    s.direction === "up" ? "▲" : s.direction === "down" ? "▼" : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Supplier", "Current", "Previous", "Change", "Current Rev", "Prev Rev", "Δ"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
    margin: { left: 15 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.row.index !== undefined) {
        const s = sorted[hookData.row.index];
        if (s?.isClient) {
          hookData.cell.styles.fillColor = hexToRgb("#FFFDE7");
          hookData.cell.styles.fontStyle = "bold";
        } else if (s && s.shareChange > 1) {
          hookData.cell.styles.fillColor = hexToRgb("#E8F5E9");
        } else if (s && s.shareChange < -1) {
          hookData.cell.styles.fillColor = hexToRgb("#FFEBEE");
        }
      }
    },
  });

  const fp = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y;
  drawFooter(doc, Math.ceil(fp / 297));
  return doc;
}

/* ── Report 6: MoM Trend for Top 5 vs NICE ────────────── */

export interface MoMTrendPoint {
  period: string;
  clientRevenue: number;
  clientShare: number;
  competitors: { name: string; revenue: number; share: number }[];
}

export interface MoMTrendData {
  categoryName: string;
  clientName: string;
  trendPoints: MoMTrendPoint[];
}

export function generateMoMTrendReport(data: MoMTrendData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Month-over-Month Market Share Trend`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Monthly Trend Analysis", y);
  y = drawParagraph(doc, `Tracking the month-over-month performance of ${data.clientName} against the top 5 competitors in the ${data.categoryName} category.`, y);

  for (let pi = 0; pi < data.trendPoints.length; pi++) {
    const point = data.trendPoints[pi];
    y = checkPageBreak(doc, y, 35);
    y = drawParagraph(doc, `${point.period} — ${data.clientName}: ${fmtPct(point.clientShare)} (${fmt(point.clientRevenue)})`, y);

    const rows = point.competitors.map((c) => [c.name.slice(0, 24), fmt(c.revenue), fmtPct(c.share)]);
    autoTable(doc, {
      startY: y,
      head: [["Supplier", "Revenue", "Share"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 6, textColor: [60, 60, 60] },
      margin: { left: 25 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  drawFooter(doc, Math.ceil((y + 10) / 297));
  return doc;
}

/* ── Report 7: Head-to-Head Supplier Comparison ────────── */

export interface H2HProduct {
  name: string;
  clientRevenue: number;
  competitorRevenue: number;
  clientUnits: number;
  competitorUnits: number;
  winner: "client" | "competitor" | "tie";
}

export interface H2HComparison {
  competitorName: string;
  clientRevenue: number;
  competitorRevenue: number;
  clientShare: number;
  competitorShare: number;
  clientSKUs: number;
  competitorSKUs: number;
  winningProducts: number;
  totalProducts: number;
  products: H2HProduct[];
}

export interface H2HData {
  categoryName: string;
  clientName: string;
  comparisons: H2HComparison[];
}

export function generateHeadToHeadReport(data: H2HData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, `${data.categoryName} — Head-to-Head Supplier Comparison`, `Prepared for ${data.clientName}`);
  let y = 54;

  y = drawSectionTitle(doc, "Competitive Comparison Summary", y);
  y = drawParagraph(doc, `Detailed head-to-head comparison between ${data.clientName} and the top 5 competitors in the ${data.categoryName} category, covering product portfolios (SKUs), market share, and revenue.`, y);

  for (const comp of data.comparisons) {
    y = checkPageBreak(doc, y, 50);
    y = drawSectionTitle(doc, `${data.clientName} vs ${comp.competitorName}`, y);

    y = drawParagraph(doc, `Revenue: ${fmt(comp.clientRevenue)} vs ${fmt(comp.competitorRevenue)}`, y);
    y = drawParagraph(doc, `Share: ${fmtPct(comp.clientShare)} vs ${fmtPct(comp.competitorShare)}`, y);
    y = drawParagraph(doc, `SKUs: ${comp.clientSKUs} vs ${comp.competitorSKUs}`, y);
    y = drawParagraph(doc, `Winning products: ${comp.winningProducts}/${comp.totalProducts}`, y);
    y += 4;

    const prodTable = comp.products.map((p) => [
      p.name.slice(0, 26),
      fmt(p.clientRevenue),
      fmt(p.competitorRevenue),
      p.winner === "client" ? "✓" : p.winner === "competitor" ? "✗" : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Product", `${data.clientName.slice(0, 12)}`, comp.competitorName.slice(0, 12), "Win"]],
      body: prodTable,
      theme: "grid",
      headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 6, textColor: [60, 60, 60] },
      margin: { left: 20 },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.row.index !== undefined) {
          const p = comp.products[hookData.row.index];
          if (p?.winner === "client") {
            hookData.cell.styles.fillColor = hexToRgb("#E8F5E9");
          } else if (p?.winner === "competitor") {
            hookData.cell.styles.fillColor = hexToRgb("#FFEBEE");
          }
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  drawFooter(doc, Math.ceil((y + 10) / 297));
  return doc;
}

/* ══════════════════════════════════════════════════
   Industry Report Schema — uniform format for all reports
   ══════════════════════════════════════════════════ */

export interface IndustryProfile {
  id: string;
  label: string;
  distributionTerm: string;
  growthTerm: string;
  competitionTerm: string;
  presenceTerm: string;
}

export const FMCG_INDUSTRY: IndustryProfile = {
  id: "fmcg_retail",
  label: "FMCG Retail",
  distributionTerm: "shelf presence",
  growthTerm: "sales volume",
  competitionTerm: "supplier",
  presenceTerm: "distribution intensity",
};

export interface StandingInfo {
  rank: number;
  totalPeers: number;
  share: number;
  revenue: number;
  units: number;
  positionLabel: "leader" | "challenger" | "contender" | "niche";
}

export interface CompetitiveGap {
  name: string;
  shareGap: number;
  revenueGap: number;
}

export interface CompetitiveGapsInfo {
  vsLeader: CompetitiveGap;
  vsAbove: CompetitiveGap | null;
  vsBelow: CompetitiveGap | null;
  marketConcentration: number;
}

export interface InsightCard {
  headline: string;
  evidence: string;
  branch?: string;
}

export interface RecommendationCard {
  action: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

export interface PortfolioBenchmark {
  skuCount: number;
  revenuePerSku: number;
  peerBenchmarks: { name: string; skuCount: number; revenuePerSku: number }[];
}

export interface ReportSchema {
  meta: {
    title: string;
    industry: IndustryProfile;
    clientName: string;
    category: string;
    period: string;
  };
  standing: StandingInfo;
  competitiveGaps: CompetitiveGapsInfo;
  portfolio: PortfolioBenchmark;
  opportunities: InsightCard[];
  risks: InsightCard[];
  recommendations: RecommendationCard[];
}

/* ── Compute helpers that derive the schema from raw data ── */

export interface EnrichedInput {
  categoryName: string;
  clientName: string;
  categoryTotal: number;
  categoryUnits: number;
  clientTotal: number;
  clientUnits: number;
  clientShare: number;
  clientRank: number;
  totalSuppliers: number;
  supplierRank: { rank: number; name: string; revenue: number; share: number; isClient: boolean }[];
  branchAnalysis: { branch: string; totalRevenue: number; clientRevenue: number; clientShare: number }[];
  branchMarketShare: { branch: string; suppliers: { name: string; revenue: number; share: number; isClient: boolean }[] }[];
  supplierCompetition: { supplier: string; isClient: boolean; totalRevenue: number; products: { product: string; revenue: number }[] }[];
}

function positionLabel(rank: number, total: number): StandingInfo["positionLabel"] {
  if (rank === 1) return "leader";
  if (rank <= Math.ceil(total * 0.15)) return "challenger";
  if (rank <= Math.ceil(total * 0.4)) return "contender";
  return "niche";
}

export function computeReportSchema(input: EnrichedInput, industry?: IndustryProfile, period?: string): ReportSchema {
  const ind = industry || FMCG_INDUSTRY;
  const { supplierRank, clientRank, clientTotal, clientShare, totalSuppliers } = input;

  const standing: StandingInfo = {
    rank: clientRank,
    totalPeers: totalSuppliers,
    share: clientShare,
    revenue: clientTotal,
    units: input.clientUnits,
    positionLabel: positionLabel(clientRank, totalSuppliers),
  };

  const clientIdx = supplierRank.findIndex((s) => s.isClient);
  const vsLeader: CompetitiveGap = {
    name: supplierRank[0]?.name || "",
    shareGap: (supplierRank[0]?.share || 0) - clientShare,
    revenueGap: (supplierRank[0]?.revenue || 0) - clientTotal,
  };
  const vsAbove = clientIdx > 0 ? {
    name: supplierRank[clientIdx - 1]?.name || "",
    shareGap: (supplierRank[clientIdx - 1]?.share || 0) - clientShare,
    revenueGap: (supplierRank[clientIdx - 1]?.revenue || 0) - clientTotal,
  } : null;
  const vsBelow = clientIdx < supplierRank.length - 1 ? {
    name: supplierRank[clientIdx + 1]?.name || "",
    shareGap: clientShare - (supplierRank[clientIdx + 1]?.share || 0),
    revenueGap: clientTotal - (supplierRank[clientIdx + 1]?.revenue || 0),
  } : null;
  const top3Share = supplierRank.slice(0, 3).reduce((s, sup) => s + sup.share, 0);
  const marketConcentration = top3Share;

  const clientComp = input.supplierCompetition.find((s) => s.isClient);
  const clientSKUs = clientComp?.products.length || 0;
  const clientRevPerSku = clientSKUs > 0 ? clientTotal / clientSKUs : 0;
  const topCompetitors = input.supplierCompetition.filter((s) => !s.isClient).slice(0, 5);
  const peerBenchmarks = topCompetitors.map((c) => ({
    name: c.supplier,
    skuCount: c.products.length,
    revenuePerSku: c.products.length > 0 ? c.totalRevenue / c.products.length : 0,
  }));

  const realBranches = input.branchAnalysis.filter((b) => b.totalRevenue > 0);
  const avgClientShare = realBranches.length > 0
    ? realBranches.reduce((s, b) => s + b.clientShare, 0) / realBranches.length
    : 0;

  const opportunities: InsightCard[] = [];
  const risks: InsightCard[] = [];

  const branchGaps = realBranches
    .map((b) => ({
      branch: b.branch,
      totalRevenue: b.totalRevenue,
      clientRevenue: b.clientRevenue,
      currentShare: b.clientShare,
      avgShare: avgClientShare,
      gapRevenue: Math.max(0, (avgClientShare / 100) * b.totalRevenue - b.clientRevenue),
    }))
    .filter((b) => b.gapRevenue > 0)
    .sort((a, b) => b.gapRevenue - a.gapRevenue);

  if (branchGaps.length > 0) {
    const topGap = branchGaps[0];
    opportunities.push({
      headline: `Direct distribution push at ${topGap.branch} — KES ${(topGap.gapRevenue / 1000000).toFixed(1)}M addressable gap`,
      evidence: `${topGap.branch} generates KES ${(topGap.totalRevenue / 1000000).toFixed(1)}M in ${input.categoryName} sales but you hold only ${topGap.currentShare.toFixed(1)}% — reaching your network-average of ${avgClientShare.toFixed(1)}% would add KES ${(topGap.gapRevenue / 1000000).toFixed(1)}M.`,
      branch: topGap.branch,
    });
  }

  if (branchGaps.length > 1) {
    const totalGap = branchGaps.reduce((s, g) => s + g.gapRevenue, 0);
    opportunities.push({
      headline: `${branchGaps.length} underweight branches represent KES ${(totalGap / 1000000).toFixed(1)}M in unrealized revenue`,
      evidence: `Closing the gap between your current share and your network-average in ${branchGaps.length} branches would add approximately KES ${(totalGap / 1000000).toFixed(1)}M — before any market growth.`,
    });
  }

  if (vsAbove) {
    opportunities.push({
      headline: `${vsAbove.name} is within striking distance — KES ${(vsAbove.revenueGap / 1000000).toFixed(1)}M gap`,
      evidence: `You are ${vsAbove.shareGap.toFixed(1)} percentage points and KES ${(vsAbove.revenueGap / 1000000).toFixed(1)}M behind #${clientRank - 1}. That's the closest gap in the ranking and a realistic short-term target.`,
    });
  }

  const topSkuSuppliers = peerBenchmarks.filter((p) => p.skuCount > clientSKUs);
  if (topSkuSuppliers.length > 0) {
    opportunities.push({
      headline: `Expand from ${clientSKUs} to ${Math.min(clientSKUs + 2, 5)} SKUs to match competitor range`,
      evidence: `Top suppliers carry ${topSkuSuppliers.map((p) => `${p.skuCount}`).join(", ")} SKUs vs your ${clientSKUs}. At your current revenue per SKU (KES ${(clientRevPerSku / 1000000).toFixed(1)}M), adding 2 products could add KES ${((clientRevPerSku * 2) / 1000000).toFixed(1)}M.`,
    });
  }

  if (vsBelow && (!vsAbove || vsBelow.revenueGap < vsAbove.revenueGap)) {
    risks.push({
      headline: `${vsBelow.name} is KES ${(vsBelow.revenueGap / 1000000).toFixed(1)}M behind — narrow cushion`,
      evidence: `You hold only a KES ${(vsBelow.revenueGap / 1000000).toFixed(1)}M lead over #${clientRank + 1}. A single bulk contract loss could shift this position.`,
    });
  }

  if (marketConcentration > 60) {
    risks.push({
      headline: `Top 3 suppliers control ${marketConcentration.toFixed(0)}% of the category — oligopolistic market`,
      evidence: `High concentration means shelf access and distribution deals are controlled by few players. Competitive response times are faster.`,
    });
  }

  const recommendations: RecommendationCard[] = [];

  if (vsAbove) {
    recommendations.push({
      priority: "high",
      action: `Close the gap with ${vsAbove.name} — push toward KES ${(vsAbove.revenueGap / 1000000).toFixed(1)}M revenue target`,
      rationale: `You are only ${vsAbove.shareGap.toFixed(1)}pp behind #${clientRank - 1}. This is the most winnable rank improvement.`,
    });
  }

  if (branchGaps.length > 0) {
    recommendations.push({
      priority: "high",
      action: `Prioritize ${branchGaps.slice(0, 2).map((b) => b.branch).join(" and ")} for distribution push`,
      rationale: `These branches have the largest addressable revenue gap — KES ${(branchGaps.slice(0, 2).reduce((s, g) => s + g.gapRevenue, 0) / 1000000).toFixed(1)}M combined — at your own average performance level.`,
    });
  }

  if (topSkuSuppliers.length > 0) {
    recommendations.push({
      priority: "medium",
      action: `Expand product range from ${clientSKUs} to ${Math.min(clientSKUs + 2, 5)} SKUs`,
      rationale: `Your per-SKU revenue (KES ${(clientRevPerSku / 1000000).toFixed(1)}M) already outperforms several larger competitors. Range expansion is the highest-leverage growth move.`,
    });
  }

  const strongholds = realBranches.filter((b) => b.clientShare > avgClientShare * 1.3).slice(0, 2);
  if (strongholds.length > 0) {
    recommendations.push({
      priority: "low",
      action: `Defend and study ${strongholds.map((b) => b.branch).join(" and ")} as reference branches`,
      rationale: `These branches already achieve ${strongholds.map((b) => `${b.clientShare.toFixed(1)}%`).join(" and ")} share — well above your ${avgClientShare.toFixed(1)}% average. Use their approach as the playbook for underweight branches.`,
    });
  }

  const portfolio: PortfolioBenchmark = {
    skuCount: clientSKUs,
    revenuePerSku: clientRevPerSku,
    peerBenchmarks,
  };

  return {
    meta: {
      title: `${input.categoryName} — Market Analysis`,
      industry: ind,
      clientName: input.clientName,
      category: input.categoryName,
      period: period || "Current Period",
    },
    standing,
    competitiveGaps: { vsLeader, vsAbove, vsBelow, marketConcentration },
    portfolio,
    opportunities,
    risks,
    recommendations,
  };
}

/* ── Report 8: Industry-standard report generator ── */

export function generateIndustryReport(schema: ReportSchema): jsPDF {
  const { meta, standing, competitiveGaps, portfolio, opportunities, risks, recommendations } = schema;
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawHeader(doc, meta.title, `Prepared for ${meta.clientName}`);
  let y = 54;

  y = checkPageBreak(doc, y, 30);
  y = drawSectionTitle(doc, "Where You Stand", y);
  const place = standing.rank === 1 ? "#1" : `#${standing.rank} of ${standing.totalPeers}`;
  const positionDesc =
    standing.positionLabel === "leader" ? "You are the market leader." :
    standing.positionLabel === "challenger" ? "You are a top-tier challenger within striking distance of the lead." :
    standing.positionLabel === "contender" ? "You are a solid mid-tier contender with clear paths to improve." :
    "You are a niche player with focused opportunities to grow.";

  y = drawParagraph(doc, `${meta.clientName} ranks ${place} in ${meta.category}, holding ${standing.share.toFixed(1)}% share (KES ${(standing.revenue / 1000000).toFixed(1)}M, ${Math.round(standing.units).toLocaleString()} units). The market is ${competitiveGaps.marketConcentration > 60 ? "top-heavy" : "moderately fragmented"}: the top three suppliers combined control ${competitiveGaps.marketConcentration.toFixed(0)}% of the category. ${positionDesc}`, y);

  y = checkPageBreak(doc, y, 40);
  y = drawSectionTitle(doc, "Against Whom — Competitive Gaps", y);

  const gapLines: string[] = [];
  if (competitiveGaps.vsAbove) {
    gapLines.push(`${competitiveGaps.vsAbove.name} is ranked #${standing.rank - 1} — you are KES ${(competitiveGaps.vsAbove.revenueGap / 1000000).toFixed(1)}M and ${competitiveGaps.vsAbove.shareGap.toFixed(1)}pp behind. That's the single closest gap in the ranking.`);
  } else if (standing.rank === 1) {
    gapLines.push(`You hold the #1 position with ${competitiveGaps.vsLeader.shareGap.toFixed(1)}pp lead over ${competitiveGaps.vsLeader.name}.`);
  }
  if (competitiveGaps.vsBelow) {
    gapLines.push(`${competitiveGaps.vsBelow.name} is #${standing.rank + 1}, KES ${(competitiveGaps.vsBelow.revenueGap / 1000000).toFixed(1)}M behind you (${competitiveGaps.vsBelow.shareGap.toFixed(1)}pp cushion).`);
  }
  gapLines.push(`The market leader ${competitiveGaps.vsLeader.name} holds ${(competitiveGaps.vsLeader.shareGap + standing.share).toFixed(1)}% share (KES ${((competitiveGaps.vsLeader.revenueGap + standing.revenue) / 1000000).toFixed(1)}M) — a scale gap that makes them a long-term aspiration rather than an immediate target.`);

  for (const line of gapLines) {
    y = drawParagraph(doc, line, y);
  }

  y = checkPageBreak(doc, y, 40);
  y = drawSectionTitle(doc, "Product Portfolio Comparison", y);
  y = drawParagraph(doc, `You carry ${portfolio.skuCount} SKU${portfolio.skuCount !== 1 ? "s" : ""} in this category, generating KES ${(portfolio.revenuePerSku / 1000000).toFixed(1)}M per product on average.`, y);

  const portTable = portfolio.peerBenchmarks.slice(0, 5).map((p) => [
    p.name.slice(0, 22),
    String(p.skuCount),
    `KES ${(p.revenuePerSku / 1000000).toFixed(1)}M`,
    p.revenuePerSku > 0 && portfolio.revenuePerSku > 0
      ? `${((portfolio.revenuePerSku / p.revenuePerSku) * 100).toFixed(0)}%`
      : "—",
  ]);
  autoTable(doc, {
    startY: y,
    head: [["Competitor", "SKUs", "Rev/SKU", "Your Efficiency vs Them"]],
    body: portTable,
    theme: "grid",
    headStyles: { fillColor: hexToRgb(COLORS.yellow), textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, textColor: [60, 60, 60] },
    margin: { left: 20 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 3 && hookData.cell.raw) {
        const val = String(hookData.cell.raw);
        if (val.startsWith("1") || val.startsWith("2")) {
          hookData.cell.styles.fillColor = hexToRgb("#E8F5E9");
        }
      }
    },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (opportunities.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Key Opportunities", y);
    for (const opp of opportunities) {
      y = checkPageBreak(doc, y, 25);
      y = drawParagraph(doc, `› ${opp.headline}`, y);
      y = drawParagraph(doc, `  ${opp.evidence}`, y);
    }
  }

  if (risks.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Risks to Monitor", y);
    for (const risk of risks) {
      y = checkPageBreak(doc, y, 20);
      y = drawParagraph(doc, `⚠ ${risk.headline}`, y);
      y = drawParagraph(doc, `  ${risk.evidence}`, y);
    }
  }

  if (recommendations.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Recommended Actions", y);
    for (const rec of recommendations) {
      y = checkPageBreak(doc, y, 25);
      const badge = rec.priority === "high" ? "🔴 HIGH" : rec.priority === "medium" ? "🟡 MEDIUM" : "🟢 LOW";
      y = drawParagraph(doc, `${badge} — ${rec.action}`, y);
      y = drawParagraph(doc, `  Why: ${rec.rationale}`, y);
    }
  }

  drawFooter(doc, Math.ceil((y + 20) / 297));
  return doc;
}
