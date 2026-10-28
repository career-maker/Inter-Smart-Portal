"""Build 'Test Workflows.pdf' (a tick-box test script for the testers) from test_workflows.json.

Usage:  python docs/roadmap/make_test_pdf.py
After every change to the portal, edit test_workflows.json (add or change steps, mark sections
"new" or "changed", bump version/updated, add a changelog line), then re-run. Needs: pip install reportlab
Output goes next to this file and is copied to D:\\downloads if that folder exists.
"""
import json
import os
import shutil

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Test Workflows.pdf")
data = json.load(open(os.path.join(HERE, "test_workflows.json"), encoding="utf-8"))

NAVY, AMBER, LG = colors.HexColor("#1e293b"), colors.HexColor("#d97706"), colors.HexColor("#f1f5f9")
BADGE = {"new": ("NEW", colors.HexColor("#16a34a")), "changed": ("CHANGED", colors.HexColor("#ca8a04"))}

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=16, spaceBefore=4, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=AMBER, fontSize=12, spaceBefore=10, spaceAfter=3, keepWithNext=1)
B = ParagraphStyle("B", parent=ss["BodyText"], fontSize=9.5, leading=13.5)
S = ParagraphStyle("S", parent=B, fontSize=8.5, leading=11)
W = ParagraphStyle("W", parent=S, fontName="Helvetica-Bold", textColor=colors.white)
T = ParagraphStyle("T", parent=ss["Title"], textColor=NAVY, fontSize=24, leading=28, alignment=0)

P = lambda t, s=B: Paragraph(t, s)


def footer(c, d):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    w = landscape(A4)[0]
    c.drawString(14 * mm, 8 * mm, f"Intersmart Employee Portal - Test Workflows v{data['version']} - updated {data['updated']}")
    c.drawRightString(w - 14 * mm, 8 * mm, f"Page {d.page}")
    c.restoreState()


st = [P("Test Workflows", T),
      P("How to test every module from the manager's sheet, step by step", ParagraphStyle("sub", parent=B, fontSize=12, textColor=AMBER)),
      P(f"Version <b>{data['version']}</b> &nbsp;|&nbsp; Updated <b>{data['updated']}</b> &nbsp;|&nbsp; Covers: {data['covers']}", S),
      Spacer(1, 3 * mm), P("Before you start", H2)]
st += [P("&bull; " + x) for x in data["before_you_start"]]

st.append(P("Sections", H2))
rows = [[P(f"<b>{s['id']}</b>", S), P(s["title"][3:], S), P(f"{len(s['steps'])} steps", S),
         P(f'<font color="{BADGE[s["status"]][1].hexval().replace("0x", "#")}"><b>{BADGE[s["status"]][0]}</b></font>' if s.get("status") in BADGE else "", S)] for s in data["sections"]]
t = Table(rows, colWidths=[10 * mm, 130 * mm, 25 * mm, 25 * mm])
t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
st.append(t)
st.append(Spacer(1, 3 * mm))
st.append(P("A step is a pass only if what you see matches the 'Expect' column. 'Who' is the role to log in as.", S))

COLS = [9 * mm, 24 * mm, 44 * mm, 70 * mm, 74 * mm, 16 * mm, 16 * mm]
for s in data["sections"]:
    st.append(PageBreak() if s["id"] == data["sections"][0]["id"] else Spacer(1, 2 * mm))
    badge = ""
    if s.get("status") in BADGE:
        label, col = BADGE[s["status"]]
        badge = f' <font size="8" color="{col.hexval().replace("0x", "#")}"><b>[{label}]</b></font>'
    block = [P(s["title"] + badge, H2 if s["id"] != data["sections"][0]["id"] else H1)]
    if s.get("intro"):
        block.append(P(s["intro"], S))
    head = [P(h, W) for h in ["#", "Who", "Where", "Do this", "You should see", "Pass", "Fail"]]
    body = [[P(str(i + 1), S), P(x["who"], S), P(x["where"], S), P(x["do"], S), P(x["expect"], S), P("[&nbsp;&nbsp;&nbsp;&nbsp;]", S), P("[&nbsp;&nbsp;&nbsp;&nbsp;]", S)] for i, x in enumerate(s["steps"])]
    tb = Table([head] + body, colWidths=COLS, repeatRows=1)
    style = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    style += [("BACKGROUND", (0, i), (-1, i), LG) for i in range(2, len(body) + 1, 2)]
    tb.setStyle(TableStyle(style))
    block.append(tb)
    st.append(KeepTogether(block))

st.append(PageBreak())
st.append(P("Reporting a problem", H1))
st += [P("&bull; The step number (for example B3) and your name."), P("&bull; The page or address you were on."),
       P("&bull; What you clicked, what you expected, and what actually happened."), P("&bull; A screenshot, if you can."),
       Spacer(1, 3 * mm), P("Sign-off", H2)]
sign = Table([[P("Tester name", S), "", P("Role tested", S), "", P("Date", S), ""]] * 3, colWidths=[28 * mm, 55 * mm, 28 * mm, 55 * mm, 18 * mm, 40 * mm], rowHeights=[9 * mm] * 3)
sign.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
st.append(sign)

st.append(P("What changed in this version", H2))
rows = [[P(c["date"], S), P(c["text"], S)] for c in data["changelog"]]
cl = Table([[P("Date", W), P("Change", W)]] + rows, colWidths=[35 * mm, 200 * mm], repeatRows=1)
cl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
st.append(cl)

SimpleDocTemplate(OUT, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                  title="Test Workflows - Intersmart Employee Portal", author="Team QA").build(st, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT)

dl = r"D:\downloads"
if os.path.isdir(dl):
    shutil.copy(OUT, os.path.join(dl, "Test Workflows.pdf"))
    print("copied to", dl)
