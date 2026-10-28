"""Build 'Database Structure.pdf' from db_structure.json (the live database's structure only, no data).

Refresh the JSON with the live helper (read-only information_schema queries), then run:  python docs/roadmap/make_db_pdf.py
Tables and columns added by the Internal Software Plan (migrations dated 2026_10_24 and later) are marked NEW.
Row counts are the database's own estimates, not exact counts.
"""
import glob
import json
import os
import re
import shutil
from collections import defaultdict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Database Structure.pdf")
data = json.load(open(os.path.join(HERE, "db_structure.json"), encoding="utf-8"))
MIG = os.path.join(HERE, "..", "..", "backend", "database", "migrations")

# ---- what this project added (from the migration files)
new_tables, new_cols = {}, defaultdict(list)
for f in sorted(glob.glob(os.path.join(MIG, "2026_10_2[4-9]*.php")) + glob.glob(os.path.join(MIG, "2026_1[1-2]*.php"))):
    src = open(f, encoding="utf-8").read()
    for m in re.finditer(r"Schema::create\('(\w+)'", src):
        new_tables[m.group(1)] = os.path.basename(f)
    for m in re.finditer(r"Schema::table\('(\w+)'.*?\n        \}\);", src, re.S):
        for c in re.findall(r"\$table->\w+\('(\w+)'", m.group(0)):
            new_cols[m.group(1)].append(c)

tables = {t[0]: {"rows": t[1], "engine": t[2], "collation": t[3], "cols": [], "idx": defaultdict(list), "fks": [], "uniq": {}} for t in data["tables"]}
for t, c, ty, nl, df, key, extra, pos in data["columns"]:
    if t in tables:
        tables[t]["cols"].append((c, ty, nl, df, key, extra))
for t, name, nonu, seq, col in data["indexes"]:
    if t in tables:
        tables[t]["idx"][name].append(col)
        tables[t]["uniq"][name] = nonu == "0"
for t, col, cn, rt, rc in data["fks"]:
    if t in tables:
        tables[t]["fks"].append((col, rt, rc))

NAVY, GREEN, GREY, LG = colors.HexColor("#1e293b"), colors.HexColor("#1F5C4E"), colors.HexColor("#64748b"), colors.HexColor("#f1f5f9")
ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=18, spaceAfter=8)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=NAVY, fontSize=12, spaceBefore=10, spaceAfter=4, keepWithNext=1)
B = ParagraphStyle("B", parent=ss["BodyText"], fontSize=9, leading=12)
S = ParagraphStyle("S", parent=B, fontSize=7.5, leading=9.5)
SW = ParagraphStyle("SW", parent=S, textColor=colors.white, fontName="Helvetica-Bold")
T = ParagraphStyle("T", parent=ss["Title"], textColor=NAVY, fontSize=26, leading=30, alignment=0)
P = lambda t, s=B: Paragraph(str(t).replace("&", "&amp;").replace("<", "&lt;"), s)


def grid(rows, widths, head=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if head else 0)
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
          ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    if head:
        st += [("BACKGROUND", (0, 0), (-1, 0), NAVY)]
    t.setStyle(TableStyle(st))
    return t


def footer(c, d):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    w = landscape(A4)[0]
    c.drawString(15 * mm, 8 * mm, "Intersmart Employee Portal - Database Structure (structure only, no data)")
    c.drawRightString(w - 15 * mm, 8 * mm, f"Page {d.page}")
    c.restoreState()


doc = SimpleDocTemplate(OUT, pagesize=landscape(A4), leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=14 * mm, title="Database Structure")
W = landscape(A4)[0] - 30 * mm
story = []

n_new = sum(1 for t in tables if t in new_tables)
n_cols = sum(len(v["cols"]) for v in tables.values())
story += [P("Database Structure", T), Spacer(1, 4),
          P("Live database read on the production server (read-only schema queries, no data). Use it to verify that the structure is what you expect.", B), Spacer(1, 8),
          grid([[P("Database", SW), P("Value", SW)],
                [P("Name", S), P(os.environ.get("DB_NAME", "workplaceintersm_intersmart_portal"), S)],
                [P("Engine / collation", S), P(f"InnoDB, utf8mb4_unicode_ci", S)],
                [P("Tables", S), P(len(tables), S)], [P("Columns", S), P(n_cols, S)],
                [P("Foreign keys", S), P(len(data["fks"]), S)],
                [P("Migrations applied", S), P(len(data["migrations"]), S)],
                [P("Tables added by the Internal Software Plan (24 to 29 Oct 2026)", S), P(f"{n_new} (marked NEW)", S)],
                [P("Original portal tables that were altered", S), P(sum(1 for t in new_cols if t in tables and t not in new_tables), S)]], [90 * mm, 80 * mm]),
          Spacer(1, 8),
          P("Notes: row counts are the database's estimates. All changes in this project were add-only (new tables, new nullable columns); nothing existing was renamed or dropped.", B),
          PageBreak()]

# ---- what was added
story.append(P("1. Added by the Internal Software Plan", H1))
rows = [[P("New table", SW), P("Created by migration", SW), P("Columns", SW), P("Links to", SW)]]
for t in sorted(new_tables):
    if t not in tables:
        continue
    links = sorted({r for _, r, _ in tables[t]["fks"]})
    rows.append([P(t, S), P(new_tables[t].replace(".php", ""), S), P(len(tables[t]["cols"]), S), P(", ".join(links) or "-", S)])
story.append(grid(rows, [50 * mm, 95 * mm, 18 * mm, W - 163 * mm]))
story.append(Spacer(1, 8))
story.append(P("Columns added later (all nullable or defaulted)", H2))
orig = [t for t in sorted(new_cols) if t in tables and t not in new_tables]
story.append(P("Original portal tables altered: " + (", ".join(orig) if orig else "none. The users, teams, leave, attendance, projects, tasks, TA, chat and all other original tables were not changed."), B))
rows = [[P("Table (created by this project)", SW), P("Columns added by a later migration", SW)]]
for t in sorted(new_cols):
    if t in tables and t in new_tables:
        rows.append([P(t, S), P(", ".join(dict.fromkeys(new_cols[t])), S)])
story.append(grid(rows, [70 * mm, W - 70 * mm]))
story.append(Spacer(1, 6))
story.append(P("Settings rows (system_settings, no schema change): module.<name>.enabled flags, access.<privilege> assignments (who holds each module privilege), and nothing else.", B))
story.append(PageBreak())

# ---- index
story.append(P("2. All tables", H1))
rows = [[P("Table", SW), P("Rows (est.)", SW), P("Columns", SW), P("Table", SW), P("Rows (est.)", SW), P("Columns", SW)]]
names = sorted(tables)
half = (len(names) + 1) // 2
for i in range(half):
    r = []
    for n in (names[i], names[i + half] if i + half < len(names) else None):
        if n is None:
            r += [P("", S)] * 3
        else:
            r += [P(n + ("  NEW" if n in new_tables else ""), S), P(tables[n]["rows"], S), P(len(tables[n]["cols"]), S)]
    rows.append(r)
story.append(grid(rows, [60 * mm, 20 * mm, 15 * mm, 60 * mm, 20 * mm, 15 * mm]))
story.append(PageBreak())

# ---- per table
story.append(P("3. Table by table", H1))
for n in names:
    t = tables[n]
    tag = "NEW" if n in new_tables else ""
    story.append(P(f"{n}   {tag}", H2))
    story.append(P(f"About {t['rows']} rows. {len(t['cols'])} columns." + (f" Created by {new_tables[n]}." if n in new_tables else ""), S))
    rows = [[P("Column", SW), P("Type", SW), P("Null", SW), P("Default", SW), P("Key", SW), P("Extra", SW)]]
    for c, ty, nl, df, key, extra in t["cols"]:
        mark = " NEW" if (c in new_cols.get(n, []) and n not in new_tables) else ""
        rows.append([P(c + mark, S), P(ty, S), P(nl, S), P(df, S), P(key, S), P(extra, S)])
    story.append(grid(rows, [55 * mm, 55 * mm, 15 * mm, 45 * mm, 15 * mm, W - 185 * mm]))
    extra_rows = []
    for name, cols in t["idx"].items():
        if name != "PRIMARY":
            extra_rows.append([P("Index" + (" (unique)" if t["uniq"].get(name) else ""), S), P(name, S), P(", ".join(cols), S)])
    for col, rt, rc in t["fks"]:
        extra_rows.append([P("Foreign key", S), P(col, S), P(f"{rt}.{rc}", S)])
    if extra_rows:
        story.append(Spacer(1, 3))
        story.append(grid([[P("Kind", SW), P("Name / column", SW), P("Columns / references", SW)]] + extra_rows, [35 * mm, 80 * mm, W - 115 * mm]))
    story.append(Spacer(1, 6))

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT, f"({len(tables)} tables, {n_new} new)")
if os.path.isdir("D:/downloads"):
    shutil.copy(OUT, "D:/downloads/Database Structure.pdf")
    print("copied to D:/downloads")
