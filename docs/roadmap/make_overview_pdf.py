"""Build 'System Overview.pdf': a plain-English picture of the whole workflow for the manager, from overview.json.

Usage:  python docs/roadmap/make_overview_pdf.py
Update overview.json when a stage goes from planned to building to live, then re-run. Needs: pip install reportlab
Output goes next to this file and is copied to D:\\downloads if that folder exists.
"""
import json
import os
import shutil

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "System Overview.pdf")
data = json.load(open(os.path.join(HERE, "overview.json"), encoding="utf-8"))

NAVY, AMBER, LG = colors.HexColor("#1e293b"), colors.HexColor("#d97706"), colors.HexColor("#f1f5f9")
STATUS = {"live": ("LIVE", colors.HexColor("#16a34a")), "building": ("BUILDING", colors.HexColor("#ca8a04")), "planned": ("PLANNED", colors.HexColor("#94a3b8"))}

ss = getSampleStyleSheet()
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=AMBER, fontSize=12.5, spaceBefore=10, spaceAfter=4, keepWithNext=1)
B = ParagraphStyle("B", parent=ss["BodyText"], fontSize=9.5, leading=13.5)
S = ParagraphStyle("S", parent=B, fontSize=8.5, leading=11.5)
T = ParagraphStyle("T", parent=ss["Title"], textColor=NAVY, fontSize=24, leading=28, alignment=0)
P = lambda t, s=B: Paragraph(t, s)


def hexc(c):
    return c.hexval().replace("0x", "#")


def footer(c, d):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    c.drawString(16 * mm, 9 * mm, f"Intersmart Employee Portal - System Overview - updated {data['updated']}")
    c.drawRightString(194 * mm, 9 * mm, f"Page {d.page}")
    c.restoreState()


st = [P("System Overview", T), P("How a project moves through the portal", ParagraphStyle("sub", parent=B, fontSize=12, textColor=AMBER)),
      P(f"Updated <b>{data['updated']}</b>", S), Spacer(1, 3 * mm), P(data["tagline"]), Spacer(1, 3 * mm)]

st.append(P("The journey of one project", H2))
legend = " &nbsp; ".join(f'<font color="{hexc(c)}"><b>{l}</b></font>' for l, c in STATUS.values())
st.append(P(f"Each step hands the project to the next team automatically and tells them. &nbsp; {legend}", S))
st.append(Spacer(1, 2 * mm))

rows = []
for i, f in enumerate(data["flow"], 1):
    label, col = STATUS[f["status"]]
    rows.append([P(f'<font color="white"><b>{i}</b></font>', ParagraphStyle("n", parent=B, alignment=1)),
                 P(f"<b>{f['who']}</b><br/>{f['what']}", S),
                 P(f'<font color="{hexc(col)}"><b>{label}</b></font>', ParagraphStyle("st", parent=S, alignment=1))])
t = Table(rows, colWidths=[10 * mm, 140 * mm, 24 * mm])
style = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOX", (1, 0), (2, -1), 0.25, colors.HexColor("#cbd5e1")),
         ("LINEBELOW", (1, 0), (2, -2), 0.25, colors.HexColor("#cbd5e1")), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]
for i, f in enumerate(data["flow"]):
    style.append(("BACKGROUND", (0, i), (0, i), STATUS[f["status"]][1]))
    if i % 2:
        style.append(("BACKGROUND", (1, i), (2, i), LG))
t.setStyle(TableStyle(style))
st.append(t)

st.append(P("How we keep it safe", H2))
st += [P("&bull; " + r) for r in data["rules"]]

st.append(P("In numbers", H2))
nt = Table([[P(f"<b>{k}</b>", S), P(v, S)] for k, v in data["numbers"]], colWidths=[62 * mm, 112 * mm])
nt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (0, -1), LG)]))
st.append(nt)

st.append(KeepTogether([P("What we need from the manager", H2)] + [P("&bull; " + x) for x in data["needs_from_manager"]]))

SimpleDocTemplate(OUT, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                  title="System Overview - Intersmart Employee Portal", author="Team QA").build(st, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT)

dl = r"D:\downloads"
if os.path.isdir(dl):
    shutil.copy(OUT, os.path.join(dl, "System Overview.pdf"))
    print("copied to", dl)
