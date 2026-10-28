"""Build 'Live Report.html': ONE responsive report page for the manager.

Sections: summary, what the portal already had, what the sheet introduced, coverage of every sheet line by role (charts),
workflows (diagrams), technology, plan and progress, decisions, tick-box test workflows.

Data: progress.json, overview.json, test_workflows.json and report_content.json in this folder.
After every piece of work: update those files, run this script, then republish the page with the Artifact tool
(same file path so the link stays the same).

Usage:  python docs/roadmap/make_live_report.py
"""
import html
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Live Report.html")
load = lambda n: json.load(open(os.path.join(HERE, n), encoding="utf-8"))
overview, progress, tests, content = load("overview.json"), load("progress.json"), load("test_workflows.json"), load("report_content.json")
esc = lambda s: html.escape(str(s), quote=True)

# ---- statuses used on every chip and chart
ST = {
    "existing": ("Already had", "var(--c-existing)"), "live": ("Live", "var(--c-live)"), "built": ("Built, release pending", "var(--c-built)"),
    "pending": ("Planned", "var(--c-pending)"), "decision": ("Waiting for the manager", "var(--c-decision)"),
}
ORDER = ["live", "existing", "built", "pending", "decision"]
TASK_CLASS = {"Done": "live", "In progress": "built", "Built": "built", "Not started": "pending", "Needs approval": "decision", "Waiting for staging": "built",
              "Waiting for Phase 2": "pending", "Waiting for Phase 3": "pending", "Waiting for Phase 4": "pending"}
chip = lambda key, label=None: f'<span class="chip c-{key}">{esc(label or ST[key][0])}</span>'

# ---- numbers
lines = [(r["role"], f[0], f[1]) for r in content["coverage"] for f in r["lines"]]
total = len(lines)
count = {k: sum(1 for _, _, s in lines if s == k) for k in ORDER}
covered_pct = round(100 * (count["live"] + count["existing"]) / total)
with_built_pct = round(100 * (count["live"] + count["existing"] + count["built"]) / total)
tests_now = content["tests_growth"][-1][1]


def donut():
    r, c, w = 70, 2 * math.pi * 70, 26
    segs, offset = "", 0.0
    for k in ORDER:
        if not count[k]:
            continue
        length = c * count[k] / total
        segs += (f'<circle cx="100" cy="100" r="{r}" fill="none" stroke="{ST[k][1]}" stroke-width="{w}" stroke-dasharray="{length:.2f} {c - length:.2f}" '
                 f'stroke-dashoffset="{-offset:.2f}" transform="rotate(-90 100 100)"><title>{esc(ST[k][0])}: {count[k]}</title></circle>')
        offset += length
    return (f'<svg viewBox="0 0 200 200" class="donut" role="img" aria-label="{covered_pct} percent of the sheet is live or already existed">{segs}'
            f'<text x="100" y="98" text-anchor="middle" class="d-big">{covered_pct}%</text><text x="100" y="120" text-anchor="middle" class="d-small">of the sheet is live</text></svg>')


def legend():
    return '<ul class="legend">' + "".join(f'<li><i style="background:{ST[k][1]}"></i><span>{esc(ST[k][0])}</span><b class="num">{count[k]}</b></li>' for k in ORDER) + "</ul>"


def role_bars():
    rows = ""
    for r in content["coverage"]:
        n = len(r["lines"])
        c = {k: sum(1 for f in r["lines"] if f[1] == k) for k in ORDER}
        segs = "".join(f'<i style="width:{100 * c[k] / n:.2f}%;background:{ST[k][1]}" title="{esc(ST[k][0])}: {c[k]}"></i>' for k in ORDER if c[k])
        done = c["live"] + c["existing"]
        rows += f'<div class="rrow"><span class="rname">{esc(r["role"])}</span><div class="stack" role="img" aria-label="{esc(r["role"])}: {done} of {n} live">{segs}</div><span class="num rcount">{done}/{n}</span></div>'
    return rows


def coverage_details():
    out = ""
    for r in content["coverage"]:
        items = "".join(f'<li>{chip(s)}<span>{esc(f)}</span></li>' for f, s in r["lines"])
        done = sum(1 for _, s in r["lines"] if s in ("live", "existing"))
        out += f'<details class="acc"><summary>{esc(r["role"])} <span class="muted small">{done} of {len(r["lines"])} live</span></summary><ul class="lines">{items}</ul></details>'
    return out


def existing_html():
    return "".join(f'<div class="card"><h3>{esc(g["group"])}</h3><ul class="tags">' + "".join(f"<li>{esc(i)}</li>" for i in g["items"]) + "</ul></div>" for g in content["existing_modules"])


def new_html():
    cards = ""
    for m in content["new_modules"]:
        pts = "".join(f"<li>{esc(p)}</li>" for p in m["points"])
        cards += f'<div class="card mod m-{m["status"]}"><div class="mod-head"><h3>{esc(m["name"])}</h3>{chip(m["status"])}</div><p class="muted small">For: {esc(m["who"])}</p><ul class="ticks">{pts}</ul></div>'
    return cards


def phase_bars():
    rows = ""
    for x in progress["phases"]:
        k = TASK_CLASS.get(x["status"], "pending")
        rows += (f'<div class="prow"><span class="pn num">{esc(x["n"])}</span><div class="pbody"><div class="ptitle"><b>{esc(x["name"])}</b>{chip(k, x["status"])}</div>'
                 f'<div class="bar"><i style="width:{x["percent"]}%"></i></div><span class="muted small">{esc(x["delivers"])}</span></div><span class="num pp">{x["percent"]}%</span></div>')
    return rows


def tests_chart():
    data, w, h, pad = content["tests_growth"], 560, 220, 34
    mx = max(v for _, v in data)
    step = (w - 2 * pad) / len(data)
    bars = ""
    for i, (label, v) in enumerate(data):
        bh = (h - 2 * pad) * v / mx
        x = pad + i * step + step * 0.18
        bw = step * 0.64
        last = i == len(data) - 1
        bars += (f'<rect x="{x:.1f}" y="{h - pad - bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="3" fill="{"var(--accent)" if last else "var(--bar-soft)"}"><title>{esc(label)}: {v} tests</title></rect>'
                 f'<text x="{x + bw / 2:.1f}" y="{h - pad - bh - 6:.1f}" text-anchor="middle" class="ch-val">{v}</text>'
                 f'<text x="{x + bw / 2:.1f}" y="{h - pad + 16}" text-anchor="middle" class="ch-lab">{esc(label)}</text>')
    return f'<svg viewBox="0 0 {w} {h}" class="chart" role="img" aria-label="Automated tests grew from {data[0][1]} to {data[-1][1]}"><line x1="{pad}" y1="{h - pad}" x2="{w - pad}" y2="{h - pad}" class="ch-axis"/>{bars}</svg>'


def tech_html():
    out = ""
    for i, t in enumerate(content["technology"]):
        tags = "".join(f"<li>{esc(x)}</li>" for x in t["items"])
        out += f'<div class="layer"><div class="l-name">{esc(t["layer"])}</div><div class="l-body"><ul class="tags">{tags}</ul><p class="muted small">{esc(t["note"])}</p></div></div>'
        if i < len(content["technology"]) - 1:
            out += '<div class="l-arrow" aria-hidden="true">&#8595;</div>'
    return out


def workflows_html():
    return "".join(f'<div class="card wf"><h3>{esc(w["title"])}</h3><p class="muted small">{esc(w["intro"])}</p><div class="scroll"><pre class="mermaid">{esc(w["mermaid"])}</pre></div></div>' for w in content["workflows"])


def plan_tables():
    p, out = progress, ""
    for n in range(0, 8):
        tasks = p.get(f"phase{n}_tasks")
        if not tasks:
            continue
        name = next((x["name"] for x in p["phases"] if x["n"] == str(n)), "")
        rows = "".join(f'<tr><td>{esc(t["task"])}</td><td>{chip(TASK_CLASS.get(t["status"], "pending"), t["status"])}</td><td>{esc(t["note"])}</td></tr>' for t in tasks)
        out += (f'<details class="acc"><summary>Phase {n}: {esc(name)} <span class="muted small">{len(tasks)} items</span></summary>'
                f'<div class="scroll"><table><thead><tr><th>Task</th><th>Status</th><th>Note</th></tr></thead><tbody>{rows}</tbody></table></div></details>')
    return out


def tests_html():
    t, secs = tests, ""
    for s in t["sections"]:
        badge = {"new": '<span class="chip c-live">New</span>', "changed": '<span class="chip c-built">Changed</span>'}.get(s.get("status"), "")
        rows = ""
        for i, st in enumerate(s["steps"], 1):
            sid = f'{s["id"]}{i}'
            rows += (f'<tr data-step="{sid}"><td class="num">{sid}</td><td>{esc(st["who"])}</td><td>{esc(st["where"])}</td><td>{esc(st["do"])}</td><td>{esc(st["expect"])}</td>'
                     f'<td class="mark"><button type="button" class="tick pass" data-r="pass" aria-label="Pass {sid}">Pass</button><button type="button" class="tick fail" data-r="fail" aria-label="Fail {sid}">Fail</button></td></tr>')
        intro = f'<p class="muted">{esc(s["intro"])}</p>' if s.get("intro") else ""
        secs += (f'<details class="acc" data-sec="{esc(s["id"])}"><summary>{esc(s["title"])} {badge} <span class="sec-count muted small"></span></summary>{intro}'
                 f'<div class="scroll"><table class="steps"><thead><tr><th>#</th><th>Who</th><th>Where</th><th>Do this</th><th>You should see</th><th>Result</th></tr></thead><tbody>{rows}</tbody></table></div></details>')
    before = "".join(f"<li>{esc(b)}</li>" for b in t["before_you_start"])
    return (f'<p class="muted">Version {esc(t["version"])}, updated {esc(t["updated"])}. Covers: {esc(t["covers"])}. Your Pass and Fail ticks stay in this browser only.</p>'
            f'<div class="tally" id="tally" aria-live="polite"></div><h3>Before you start</h3><ul class="plain">{before}</ul>{secs}'
            f'<p><button type="button" class="ghost" id="reset-ticks">Clear all my ticks</button></p>')


CSS = """
/* Layout: deep teal hero with a KPI strip, a sticky chip navigation, then alternating bands of cards, charts and tables. */
:root {
  --bg: #f1f6f5; --surface: #ffffff; --band: #e8f0ee; --ink: #12231f; --muted: #53665f; --line: #d5e0dc; --head-bg: #ecf2f0;
  --accent: #0f766e; --accent-soft: #cfe8e4; --bar-soft: #9cc7c1; --hero: #0a2f2b; --hero-ink: #eaf7f4; --hero-muted: #9ccfc7;
  --c-live: #1f9d55; --c-existing: #5967c9; --c-built: #d98a0b; --c-pending: #8a9aa4; --c-decision: #d9480f;
  --f-head: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif; --f-body: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; --f-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0c1614; --surface: #14211e; --band: #101c19; --ink: #e4eeeb; --muted: #9db0aa; --line: #263733; --head-bg: #1a2a27;
  --accent: #46c7b8; --accent-soft: #17403b; --bar-soft: #2c5c56; --hero: #071f1c; --c-live: #3ec878; --c-existing: #8c97ee; --c-built: #f0ad3d; --c-pending: #7f929c; --c-decision: #ff7a45; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #0c1614; --surface: #14211e; --band: #101c19; --ink: #e4eeeb; --muted: #9db0aa; --line: #263733; --head-bg: #1a2a27;
  --accent: #46c7b8; --accent-soft: #17403b; --bar-soft: #2c5c56; --hero: #071f1c; --c-live: #3ec878; --c-existing: #8c97ee; --c-built: #f0ad3d; --c-pending: #7f929c; --c-decision: #ff7a45; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.6; padding-block: 0 64px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 20; background: var(--hero); }
.full { margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding-inline: max(16px, env(safe-area-inset-left, 0px)); }
.in { max-width: 1080px; margin: 0 auto; }
.hero { background: var(--hero); color: var(--hero-ink); padding-block: 38px 74px;
  background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size: 36px 36px; }
.eyebrow { font-family: var(--f-mono); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--hero-muted); margin: 0 0 10px; }
h1 { font-family: var(--f-head); font-size: clamp(1.9rem, 5.2vw, 3.1rem); line-height: 1.08; margin: 0 0 12px; letter-spacing: -0.02em; text-wrap: balance; max-width: 18ch; }
.sub { font-size: 1.08rem; color: var(--hero-muted); max-width: 60ch; margin: 0; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: -48px; position: relative; z-index: 2; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; box-shadow: 0 6px 20px rgba(0,0,0,.08); }
.kpi b { display: block; font-family: var(--f-mono); font-size: 1.9rem; font-weight: 500; color: var(--accent); line-height: 1.1; } .kpi span { font-size: 13px; color: var(--muted); }
nav.chips { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 15; background: var(--bg); border-bottom: 1px solid var(--line); margin-top: 22px; }
nav.chips .in { display: flex; gap: 6px; overflow-x: auto; padding-block: 10px; scrollbar-width: thin; }
nav.chips a { flex: none; font-size: 13.5px; font-weight: 600; color: var(--muted); text-decoration: none; padding: 6px 13px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface); }
nav.chips a:hover, nav.chips a.on { color: var(--accent-ink, #fff); background: var(--accent); border-color: var(--accent); } nav.chips a:hover, nav.chips a.on { color: #fff; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
section { padding-block: 34px 8px; scroll-margin-top: 62px; }
section.band { background: var(--band); margin-top: 22px; padding-bottom: 34px; }
h2 { font-family: var(--f-head); font-size: clamp(1.35rem, 3.4vw, 1.8rem); margin: 0 0 6px; letter-spacing: -0.01em; text-wrap: balance; }
h3 { font-family: var(--f-head); font-size: 1.05rem; margin: 0 0 6px; } p { margin: 0 0 10px; max-width: 72ch; }
.kicker { color: var(--muted); max-width: 70ch; margin-bottom: 18px; } .muted { color: var(--muted); } .small { font-size: 12.5px; } .num { font-family: var(--f-mono); font-variant-numeric: tabular-nums; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; } .grid > * { min-width: 0; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
.tags { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; } .tags li { font-size: 13px; background: var(--head-bg); border-radius: 6px; padding: 3px 9px; }
.chip { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; border-radius: 99px; padding: 2px 9px; color: #fff; white-space: nowrap; }
.c-live { background: var(--c-live); } .c-existing { background: var(--c-existing); } .c-built { background: var(--c-built); } .c-pending { background: var(--c-pending); } .c-decision { background: var(--c-decision); }
.mod { border-top: 4px solid var(--c-pending); } .mod.m-live { border-top-color: var(--c-live); } .mod.m-built { border-top-color: var(--c-built); }
.mod-head { display: flex; justify-content: space-between; align-items: start; gap: 8px; flex-wrap: wrap; }
.ticks { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 14px; } .ticks li { padding-left: 18px; position: relative; } .ticks li::before { content: ""; position: absolute; left: 2px; top: .55em; width: 7px; height: 7px; border-radius: 2px; background: var(--accent); }
.cover { display: grid; grid-template-columns: minmax(200px, 280px) 1fr; gap: 22px 36px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
.donut { width: 100%; max-width: 280px; margin: 0 auto; display: block; } .d-big { font-family: var(--f-mono); font-size: 30px; font-weight: 500; fill: var(--ink); } .d-small { font-size: 9.5px; fill: var(--muted); }
.legend { list-style: none; margin: 0 0 14px; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 14px; } .legend li { display: flex; align-items: center; gap: 8px; font-size: 13.5px; }
.legend i { width: 12px; height: 12px; border-radius: 3px; flex: none; } .legend b { margin-left: auto; font-weight: 500; }
.rrow { display: grid; grid-template-columns: 130px 1fr 46px; gap: 10px; align-items: center; margin: 7px 0; font-size: 13.5px; }
.stack { display: flex; height: 16px; border-radius: 99px; overflow: hidden; background: var(--head-bg); } .stack i { display: block; height: 100%; } .rcount { text-align: right; color: var(--muted); font-size: 12.5px; }
.acc { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 0 16px; margin: 8px 0; }
.acc > summary { cursor: pointer; font-family: var(--f-head); font-weight: 600; padding: 12px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; } .acc[open] > summary { border-bottom: 1px solid var(--line); margin-bottom: 8px; }
.lines { list-style: none; margin: 0; padding: 4px 0 12px; display: grid; gap: 7px; } .lines li { display: flex; gap: 10px; align-items: baseline; font-size: 14px; } .lines .chip { flex: none; min-width: 74px; text-align: center; }
.scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 9px 10px; vertical-align: top; border-bottom: 1px solid var(--line); } tr:last-child td { border-bottom: 0; }
th { background: var(--head-bg); font-size: 11.5px; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); font-weight: 600; white-space: nowrap; }
.steps td:nth-child(4), .steps td:nth-child(5) { min-width: 210px; } .nowrap { white-space: nowrap; }
.prow { display: grid; grid-template-columns: 28px 1fr 48px; gap: 10px; align-items: start; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin: 8px 0; }
.pn { color: var(--accent); font-size: 1.2rem; } .ptitle { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; justify-content: space-between; margin-bottom: 6px; } .pp { text-align: right; font-weight: 500; }
.bar { height: 9px; background: var(--head-bg); border-radius: 99px; overflow: hidden; margin-bottom: 6px; } .bar i { display: block; height: 100%; background: var(--accent); border-radius: 99px; }
.wf { margin-bottom: 14px; } .wf .scroll { padding: 8px 0; } pre.mermaid { margin: 0; text-align: center; }
.stackdiag { display: grid; gap: 6px; max-width: 820px; } .layer { display: grid; grid-template-columns: 170px 1fr; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.l-name { background: var(--accent); color: #fff; font-family: var(--f-head); font-weight: 600; padding: 14px; display: flex; align-items: center; } .l-body { padding: 12px 16px; min-width: 0; } .l-body p { margin: 8px 0 0; }
.l-arrow { text-align: center; color: var(--accent); font-size: 20px; line-height: 1; }
.chartbox { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; } .chart { width: 100%; height: auto; display: block; }
.ch-val { font-family: var(--f-mono); font-size: 12px; fill: var(--ink); } .ch-lab { font-size: 10.5px; fill: var(--muted); } .ch-axis { stroke: var(--line); stroke-width: 1.5; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 22px; } .two > * { min-width: 0; }
ul.plain { margin: 6px 0 0; padding-left: 20px; display: grid; gap: 6px; max-width: 78ch; } .asks li::marker { color: var(--c-decision); }
.tally { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; } .tally span { font-family: var(--f-mono); font-size: 13px; padding: 4px 12px; border-radius: 99px; background: var(--head-bg); color: var(--muted); }
.tally .p { background: var(--c-live); color: #fff; } .tally .f { background: var(--c-decision); color: #fff; }
.mark { white-space: nowrap; } .tick { font: inherit; font-size: 12px; font-weight: 700; padding: 4px 10px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); cursor: pointer; }
.tick.pass { border-radius: 6px 0 0 6px; } .tick.fail { border-radius: 0 6px 6px 0; border-left: 0; }
.tick.pass[aria-pressed="true"] { background: var(--c-live); color: #fff; border-color: var(--c-live); } .tick.fail[aria-pressed="true"] { background: var(--c-decision); color: #fff; border-color: var(--c-decision); }
.ghost { font: inherit; background: none; border: 1px solid var(--line); color: var(--muted); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
footer { color: var(--muted); font-size: 13px; padding-top: 26px; }
@media (max-width: 700px) { .cover { grid-template-columns: 1fr; } .rrow { grid-template-columns: 96px 1fr 40px; } .layer { grid-template-columns: 1fr; } .l-name { padding: 8px 14px; } .hero { padding-block: 28px 66px; } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
html { scroll-behavior: smooth; }
"""

JS = """
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.chips a'));
  var ids = links.map(function (a) { return a.getAttribute('href').slice(1); });
  function mark() {
    var cur = ids[0];
    ids.forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) cur = id; });
    links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });
  }
  window.addEventListener('scroll', mark, { passive: true }); mark();

  var KEY = 'intersmart-live-report-ticks-v1', ticks = {};
  try { ticks = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { ticks = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ticks)); } catch (e) {} }
  function paint() {
    var pass = 0, fail = 0, total = 0;
    document.querySelectorAll('tr[data-step]').forEach(function (tr) {
      var r = ticks[tr.dataset.step]; total++;
      if (r === 'pass') pass++; if (r === 'fail') fail++;
      tr.querySelectorAll('.tick').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.r === r)); });
    });
    document.querySelectorAll('details[data-sec]').forEach(function (d) {
      var rows = d.querySelectorAll('tr[data-step]'), p = 0, f = 0;
      rows.forEach(function (tr) { var r = ticks[tr.dataset.step]; if (r === 'pass') p++; if (r === 'fail') f++; });
      d.querySelector('.sec-count').textContent = p + ' pass, ' + f + ' fail, ' + (rows.length - p - f) + ' to do';
    });
    var t = document.getElementById('tally');
    if (t) t.innerHTML = '<span class="p">' + pass + ' passed</span><span class="f">' + fail + ' failed</span><span>' + (total - pass - fail) + ' still to test</span>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.tick') : null;
    if (!b) return;
    var id = b.closest('tr').dataset.step;
    if (ticks[id] === b.dataset.r) delete ticks[id]; else ticks[id] = b.dataset.r;
    save(); paint();
  });
  var reset = document.getElementById('reset-ticks');
  if (reset) reset.addEventListener('click', function () { ticks = {}; save(); paint(); });
  paint();
})();
"""

p = progress
ask = "".join(f"<li>{esc(a)}</li>" for a in p["decisions"])
nxt = "".join(f"<li>{esc(a)}</li>" for a in p["next"])
done = "".join(f"<li>{esc(a)}</li>" for a in p["done_this_update"])
risks = "".join(f'<tr><td>{esc(r["risk"])}</td><td>{esc(r["action"])}</td></tr>' for r in p["risks"])
log = "".join(f'<tr><td class="nowrap">{esc(c["date"])}</td><td>{esc(c["text"])}</td></tr>' for c in p["changelog"][:12])
safe = "".join(f"<li>{esc(r)}</li>" for r in overview["rules"])
health = "".join(f"<li>{esc(h)}</li>" for h in p["live_health"])
done_live = sum(1 for m in content["new_modules"] if m["status"] == "live")

page = f"""<title>Intersmart Portal Live Report</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>{CSS}</style>

<div class="hero full"><div class="in">
  <p class="eyebrow">Intersmart Employee Portal &middot; Internal Software Plan &middot; updated {esc(p["updated"])}</p>
  <h1>One connected workflow, from first lead to delivered project</h1>
  <p class="sub">{esc(overview["tagline"])}</p>
</div></div>
<div class="in"><div class="kpis">
  <div class="kpi"><b>{p["overall_percent"]}%</b><span>of the 27-week plan complete</span></div>
  <div class="kpi"><b>{covered_pct}%</b><span>of the manager's sheet is live ({count["live"] + count["existing"]} of {total} lines)</span></div>
  <div class="kpi"><b>{count["built"]}</b><span>lines built, release pending</span></div>
  <div class="kpi"><b>{count["decision"]}</b><span>lines waiting for the manager</span></div>
  <div class="kpi"><b>{tests_now}</b><span>automated tests guarding it</span></div>
</div></div>

<nav class="chips full" aria-label="Report sections"><div class="in">
  <a href="#summary">Summary</a><a href="#before">Already had</a><a href="#new">New from the sheet</a><a href="#coverage">Sheet coverage</a>
  <a href="#workflows">Workflows</a><a href="#tech">Technology</a><a href="#plan">Plan</a><a href="#decisions">Decisions</a><a href="#tests">Test it</a>
</div></nav>

<section id="summary"><div class="in">
  <h2>Where we are</h2>
  <p class="kicker">{esc(p["headline"])}</p>
  <div class="cover">
    {donut()}
    <div><h3>Every line of the manager's sheet, by status</h3>{legend()}<p class="muted small">{total} lines across 8 roles. "Already had" means the portal did it before this plan started.</p></div>
  </div>
</div></section>

<section id="before"><div class="in">
  <h2>What the portal already had</h2>
  <p class="kicker">Nothing below was changed. It keeps working exactly as before while the new modules grow around it.</p>
  <div class="grid">{existing_html()}</div>
</div></section>

<section id="new" class="band full"><div class="in">
  <h2>What the sheet added</h2>
  <p class="kicker">{done_live} new areas are live for their own departments. Two more are built and tested, waiting for a final check before release.</p>
  <div class="grid">{new_html()}</div>
</div></section>

<section id="coverage"><div class="in">
  <h2>The sheet, role by role</h2>
  <p class="kicker">Green and blue are done. Amber is built and about to ship. Grey is planned. Orange waits for an answer from the manager. Open a role to see every line.</p>
  <div class="chartbox">{role_bars()}</div>
  <div style="height:12px"></div>{coverage_details()}
</div></section>

<section id="workflows" class="band full"><div class="in">
  <h2>How the work flows</h2>
  <p class="kicker">The three flows that matter most. Every arrow is an automatic hand-over with a notification.</p>
  {workflows_html()}
</div></section>

<section id="tech"><div class="in">
  <h2>What it is built on</h2>
  <p class="kicker">New modules sit on the same foundation as the existing portal. Each one has an on/off switch, so it can be hidden instantly if needed.</p>
  <div class="two">
    <div class="stackdiag">{tech_html()}</div>
    <div><h3>How we keep it safe</h3><ul class="plain">{safe}</ul><h3 style="margin-top:18px">Live system today</h3><ul class="plain">{health}</ul></div>
  </div>
</div></section>

<section id="plan" class="band full"><div class="in">
  <h2>The plan and our progress</h2>
  <p class="kicker">Eight phases, about 27 weeks. Each phase is released on its own once it has passed its tests.</p>
  {phase_bars()}
  <div class="two" style="margin-top:22px">
    <div><h3>Automated tests over time</h3><div class="chartbox">{tests_chart()}</div><p class="muted small">Plus a browser test that clicks through the real screens as each role.</p></div>
    <div><h3>Capacity</h3><p>{esc(p["capacity_answer"])}</p><h3 style="margin-top:14px">Done in this update</h3><ul class="plain">{done}</ul></div>
  </div>
  <h3 style="margin-top:22px">Phase detail</h3>{plan_tables()}
  <div class="two" style="margin-top:12px">
    <div><h3>What happens next</h3><ul class="plain">{nxt}</ul></div>
    <div><h3>Open risks</h3><div class="card scroll"><table><thead><tr><th>Risk</th><th>What we are doing</th></tr></thead><tbody>{risks}</tbody></table></div></div>
  </div>
  <h3 style="margin-top:22px">Change log</h3><div class="card scroll"><table><thead><tr><th>Date</th><th>What changed</th></tr></thead><tbody>{log}</tbody></table></div>
</div></section>

<section id="decisions"><div class="in">
  <h2>What we need from the manager</h2>
  <p class="kicker">These answers unblock the orange lines above.</p>
  <ul class="plain asks">{ask}</ul>
</div></section>

<section id="tests" class="band full"><div class="in">
  <h2>Test it yourself</h2>
  <p class="kicker">A step-by-step script for the Sales, Accounts, Project Office and UI screens. A step passes only if what you see matches the last column.</p>
  {tests_html()}
</div></section>
<div class="in"><footer>Built with Laravel, MySQL, Next.js and React. This page is generated from the project's progress files and refreshed after every piece of work.</footer></div>
<script>{JS}</script>
"""
open(OUT, "w", encoding="utf-8").write(page)
print("wrote", OUT, f"({len(page) // 1024} KB); sheet lines {total}: " + ", ".join(f"{k} {count[k]}" for k in ORDER))
