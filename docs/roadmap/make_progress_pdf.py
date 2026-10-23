"""Build 'Progress Report.pdf' for the manager from progress.json.

Usage (from anywhere):  python docs/roadmap/make_progress_pdf.py
Edit progress.json after each phase/change, then re-run. Needs: pip install reportlab
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
OUT = os.path.join(HERE, "Progress Report.pdf")
data = json.load(open(os.path.join(HERE, "progress.json"), encoding="utf-8"))

NAVY, AMBER, LG = colors.HexColor("#1e293b"), colors.HexColor("#d97706"), colors.HexColor("#f1f5f9")
GREEN, YELLOW, GREY = colors.HexColor("#16a34a"), colors.HexColor("#ca8a04"), colors.HexColor("#94a3b8")
STATUS_COLOR = {"Done": GREEN, "In progress": YELLOW, "Not started": GREY, "Needs approval": colors.HexColor("#dc2626"), "Waiting for staging": YELLOW}

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=17, spaceBefore=4, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=AMBER, fontSize=12.5, spaceBefore=10, spaceAfter=4, keepWithNext=1)
B = ParagraphStyle("B", parent=ss["BodyText"], fontSize=9.5, leading=13.5)
S = ParagraphStyle("S", parent=B, fontSize=8.5, leading=11)
W = ParagraphStyle("W", parent=S, fontName="Helvetica-Bold", textColor=colors.white)
T = ParagraphStyle("T", parent=ss["Title"], textColor=NAVY, fontSize=24, leading=28, alignment=0)

P = lambda t, s=B: Paragraph(t, s)
bullets = lambda items: [P("&bull; " + i) for i in items]


def status_cell(status):
    c = STATUS_COLOR.get(status, GREY).hexval().replace("0x", "#")
    return Paragraph(f'<font color="{c}"><b>{status}</b></font>', S)


def bar(percent, width=60 * mm):
    """Progress bar as a 2-cell table."""
    done = max(0.0001, width * percent / 100)
    t = Table([["", ""]], colWidths=[done, max(0.0001, width - done)], rowHeights=[4 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), GREEN), ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#e2e8f0"))]))
    return t


def table(rows, widths, head):
    d = [[P(h, W) for h in head]] + rows
    t = Table(d, colWidths=widths, repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    st += [("BACKGROUND", (0, i), (-1, i), LG) for i in range(2, len(d), 2)]
    t.setStyle(TableStyle(st))
    return t


def footer(c, d):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    c.drawString(16 * mm, 9 * mm, f"Intersmart Employee Portal - Progress Report - updated {data['updated']}")
    c.drawRightString(194 * mm, 9 * mm, f"Page {d.page}")
    c.restoreState()


st = [P("Progress Report", T),
      P("Internal Software Plan for the Intersmart Employee Portal", ParagraphStyle("sub", parent=B, fontSize=12, textColor=AMBER)),
      P(f"Last updated: <b>{data['updated']}</b>", S), Spacer(1, 4 * mm),
      P(data["headline"]), Spacer(1, 3 * mm)]

ov = Table([[P(f"<b>Overall: {data['overall_percent']}%</b> of the plan complete (about 27 weeks in total)", B), bar(data["overall_percent"], 70 * mm)]],
           colWidths=[100 * mm, 74 * mm])
ov.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
st.append(ov)

st.append(P("Is the live system safe?", H2))
st += bullets(data["live_health"])

st.append(P("The 8 phases", H2))
rows = [[P(p["n"], S), P(f"<b>{p['name']}</b><br/>{p['delivers']}", S), P(p["weeks"] + " wks", S),
         status_cell(p["status"]), bar(p["percent"], 26 * mm)] for p in data["phases"]]
st.append(table(rows, [8 * mm, 98 * mm, 14 * mm, 22 * mm, 32 * mm], ["#", "Phase and what it delivers", "Time", "Status", "Progress"]))

st.append(P("Done in this update", H2))
st += bullets(data["done_this_update"])

def phase_detail(title, intro, tasks, first=False):
    st.append(P(title, H1 if first else H2))
    st.append(P(intro))
    rows = [[P(t["task"], S), status_cell(t["status"]), P(t["note"], S)] for t in tasks]
    st.append(table(rows, [64 * mm, 25 * mm, 85 * mm], ["Task", "Status", "Note"]))


phase_detail("Phase 0 detail: the safety net", "Phase 0 adds no features. It makes sure new work cannot break what already runs.",
             data["phase0_tasks"], first=True)
if data.get("phase1_tasks"):
    phase_detail("Phase 1 detail: Accounts module", data.get("phase1_intro", ""), data["phase1_tasks"])
if data.get("phase2_tasks"):
    phase_detail("Phase 2 detail: Sales module", data.get("phase2_intro", ""), data["phase2_tasks"])

st.append(P("What happens next", H2))
st += bullets(data["next"])

st.append(P("Can the system handle 100+ users at the same time?", H2))
st.append(P(data["capacity_answer"]))

st.append(P("Open risks", H2))
rows = [[P(r["risk"], S), P(r["action"], S)] for r in data["risks"]]
st.append(table(rows, [96 * mm, 78 * mm], ["Risk", "What we are doing"]))

st.append(P("Decisions needed from the manager", H2))
st += bullets(data["decisions"])

st.append(P("Change log", H2))
rows = [[P(c["date"], S), P(c["text"], S)] for c in data["changelog"]]
st.append(table(rows, [28 * mm, 146 * mm], ["Date", "What changed"]))

SimpleDocTemplate(OUT, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                  title="Progress Report - Internal Software Plan", author="Team QA").build(st, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT)

dl = r"D:\downloads"
if os.path.isdir(dl):
    shutil.copy(OUT, os.path.join(dl, "Progress Report.pdf"))
    print("copied to", dl)
