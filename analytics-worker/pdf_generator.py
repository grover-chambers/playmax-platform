"""Generates branded PDF reports using ReportLab."""

import io
from typing import Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    Document,
    PageTemplate,
    Frame,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus.doctemplate import BaseDocTemplate
from datetime import datetime

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

TEAL = colors.HexColor("#0F6E56")
DARK = colors.HexColor("#1A1A1A")
GRAY = colors.HexColor("#888888")
WHITE = colors.white
YELLOW = colors.HexColor("#EAB308")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    "CoverTitle", fontName="Helvetica-Bold", fontSize=28, textColor=WHITE,
    spaceAfter=10, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    "CoverSub", fontName="Helvetica", fontSize=12, textColor=GRAY,
    spaceAfter=6, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    "SectionHead", fontName="Helvetica-Bold", fontSize=16, textColor=TEAL,
    spaceBefore=16, spaceAfter=8,
))
styles.add(ParagraphStyle(
    "BodyText2", fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#CCCCCC"),
    leading=14, spaceAfter=6,
))
styles.add(ParagraphStyle(
    "SmallLabel", fontName="Helvetica-Bold", fontSize=8, textColor=GRAY,
    spaceAfter=2,
))


class ReportDoc(BaseDocTemplate):
    def __init__(self, buf, **kwargs):
        super().__init__(buf, pagesize=A4, **kwargs)
        frame = Frame(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN, id="main")
        self.addPageTemplates([PageTemplate(id="main", frames=[frame])])


def _cover_page(project_name: str, client_name: str, date_str: str) -> list:
    elements = []
    elements.append(Spacer(1, 120))
    elements.append(Paragraph("PLAYMAX", ParagraphStyle(
        "Logo", fontName="Helvetica-Bold", fontSize=11, textColor=TEAL,
        spaceAfter=4, letterSpacing=3,
    )))
    elements.append(Paragraph("ANALYTIC ENGINE", ParagraphStyle(
        "Tag", fontName="Helvetica", fontSize=8, textColor=GRAY,
        spaceAfter=30, letterSpacing=2,
    )))
    elements.append(Paragraph(project_name, styles["CoverTitle"]))
    if client_name:
        elements.append(Paragraph(f"Prepared for {client_name}", styles["CoverSub"]))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Generated: {date_str}", styles["CoverSub"]))
    elements.append(Paragraph("CONFIDENTIAL", ParagraphStyle(
        "Conf", fontName="Helvetica-Bold", fontSize=9, textColor=colors.HexColor("#EF4444"),
        spaceBefore=40,
    )))
    return elements


def _executive_summary(ai_result: dict[str, Any]) -> list:
    elements = []
    elements.append(Paragraph("Executive Summary", styles["SectionHead"]))
    elements.append(Paragraph(ai_result.get("executive_summary", "No summary available."), styles["BodyText2"]))

    opps = ai_result.get("key_opportunities", [])
    if opps:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Key Opportunities", ParagraphStyle(
            "SubHead", fontName="Helvetica-Bold", fontSize=11, textColor=YELLOW,
            spaceBefore=8, spaceAfter=4,
        )))
        for o in opps:
            elements.append(Paragraph(f"• {o}", styles["BodyText2"]))

    risks = ai_result.get("risk_flags", [])
    if risks:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Risk Flags", ParagraphStyle(
            "SubHead", fontName="Helvetica-Bold", fontSize=11,
            textColor=colors.HexColor("#EF4444"),
            spaceBefore=8, spaceAfter=4,
        )))
        for r in risks:
            elements.append(Paragraph(f"• {r}", styles["BodyText2"]))

    actions = ai_result.get("recommended_actions", [])
    if actions:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Recommended Actions", ParagraphStyle(
            "SubHead", fontName="Helvetica-Bold", fontSize=11, textColor=TEAL,
            spaceBefore=8, spaceAfter=4,
        )))
        for a in actions:
            elements.append(Paragraph(f"• {a}", styles["BodyText2"]))

    note = ai_result.get("consumer_behaviour_note")
    if note:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Consumer Behaviour", ParagraphStyle(
            "SubHead", fontName="Helvetica-Bold", fontSize=11, textColor=TEAL,
            spaceBefore=8, spaceAfter=4,
        )))
        elements.append(Paragraph(note, styles["BodyText2"]))

    return elements


def _section_table(headers: list[str], rows: list[list], col_widths: list | None = None) -> Table:
    data = [headers] + rows
    w = col_widths or [PAGE_W - 2 * MARGIN / len(headers)] * len(headers)
    t = Table(data, colWidths=w, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#CCCCCC")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#1A1A1A")),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _algorithm_sections(algorithm_results: dict[str, list]) -> list:
    elements = []

    comp = algorithm_results.get("competition", [])
    if comp and "error" not in comp[0]:
        elements.append(Paragraph("Competition Matrix", styles["SectionHead"]))
        rows = [[
            c.get("product", "")[:30],
            c.get("supplier", "")[:20],
            c.get("competitor", "")[:30],
            f"KES {c.get('our_avg_price', 0):,.0f}",
            f"KES {c.get('competitor_avg_price', 0):,.0f}",
            str(c.get("our_volume", 0)),
            str(c.get("competitor_volume", 0)),
        ] for c in comp[:20]]
        if rows:
            elements.append(_section_table(
                ["Product", "Supplier", "Competitor", "Our Price", "Comp Price", "Our Vol", "Comp Vol"],
                rows, [55, 40, 55, 30, 30, 25, 25],
            ))
            elements.append(Spacer(1, 12))

    cat = algorithm_results.get("category", [])
    if cat and "error" not in cat[0]:
        elements.append(Paragraph("Category Analysis", styles["SectionHead"]))
        rows = [[
            c.get("category", "")[:25],
            str(c.get("product_count", 0)),
            f"KES {c.get('total_revenue', 0):,.0f}",
            str(c.get("total_units", 0)),
            f"KES {c.get('avg_unit_price', 0):,.2f}",
        ] for c in cat[:15]]
        if rows:
            elements.append(_section_table(
                ["Category", "Products", "Revenue", "Units", "Avg Price"],
                rows, [60, 30, 50, 30, 40],
            ))
            elements.append(Spacer(1, 12))

    branch = algorithm_results.get("branch", [])
    if branch and "error" not in branch[0]:
        elements.append(Paragraph("Branch Performance", styles["SectionHead"]))
        for b in branch[:8]:
            name = b.get("branch", "Unknown")
            top = b.get("top_products", [])
            elements.append(Paragraph(f"<b>{name}</b>", ParagraphStyle(
                "Branch", fontName="Helvetica-Bold", fontSize=10, textColor=WHITE,
                spaceBefore=6, spaceAfter=2,
            )))
            if top:
                rows = [[
                    t.get("product", "")[:35],
                    f"KES {t.get('revenue', 0):,.0f}",
                    str(t.get("volume", 0)),
                ] for t in top]
                elements.append(_section_table(
                    ["Product", "Revenue", "Volume"],
                    rows, [120, 60, 40],
                ))
            elements.append(Spacer(1, 8))

    sd = algorithm_results.get("supply_demand", [])
    if sd and "error" not in sd[0]:
        gaps = [g for g in sd if g.get("gap_status") in ("UNDERSUPPLY", "NO_STOCK")]
        if gaps:
            elements.append(Paragraph("Supply/Demand Gaps — Opportunities", styles["SectionHead"]))
            rows = [[
                g.get("product", "")[:30],
                g.get("branch", "")[:20],
                g.get("gap_status", ""),
                str(g.get("gap", 0)),
            ] for g in gaps[:15]]
            if rows:
                elements.append(_section_table(
                    ["Product", "Branch", "Status", "Gap"],
                    rows, [65, 50, 40, 25],
                ))
                elements.append(Spacer(1, 12))

    return elements


def generate_pdf(
    project_name: str,
    client_name: str | None,
    algorithm_results: dict[str, list],
    ai_result: dict[str, Any] | None,
) -> bytes:
    buf = io.BytesIO()
    doc = ReportDoc(buf)
    elements = []

    date_str = datetime.now().strftime("%d %B %Y")
    project_label = project_name or "Market Analysis"

    elements.extend(_cover_page(project_label, client_name or "", date_str))
    elements.append(PageBreak())

    if ai_result:
        elements.extend(_executive_summary(ai_result))
        elements.append(PageBreak())
    else:
        elements.append(Paragraph("AI analysis was not available.", styles["BodyText2"]))
        elements.append(Spacer(1, 12))

    elements.extend(_algorithm_sections(algorithm_results))

    elements.append(Spacer(1, 40))
    elements.append(Paragraph(
        f"Generated by PlayMax Analytic Engine · {date_str}",
        ParagraphStyle("Footer", fontName="Helvetica", fontSize=7, textColor=GRAY, alignment=TA_CENTER),
    ))

    doc.build(elements)
    return buf.getvalue()
