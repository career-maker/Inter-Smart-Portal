"""Build 'Live Report.html': ONE page that combines the System Overview, the Progress Report and the Test Workflows.

Data comes from overview.json, progress.json and test_workflows.json (the same files the PDFs use).
After every piece of work: update those JSON files, run this script, then republish the page with the Artifact tool
(same file path, so the link stays the same). The PDFs no longer need regenerating each time.

Usage:  python docs/roadmap/make_live_report.py
"""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Live Report.html")


def load(name):
    return json.load(open(os.path.join(HERE, name), encoding="utf-8"))


overview, progress, tests = load("overview.json"), load("progress.json"), load("test_workflows.json")
esc = lambda s: html.escape(str(s), quote=True)

STATUS_CLASS = {
    "live": "s-live", "building": "s-build", "planned": "s-plan",
    "Done": "s-live", "In progress": "s-build", "Not started": "s-plan",
    "Needs approval": "s-block", "Waiting for staging": "s-build", "Waiting for Phase 2": "s-plan",
    "Waiting for Phase 3": "s-plan", "Waiting for Phase 4": "s-plan",
}
STATUS_LABEL = {"live": "Live", "building": "Building", "planned": "Planned"}


def pill(status):
    return f'<span class="pill {STATUS_CLASS.get(status, "s-plan")}">{esc(STATUS_LABEL.get(status, status))}</span>'


# ------------------------------------------------------------------ overview
def overview_html():
    steps = "".join(
        f'<li class="step {STATUS_CLASS[f["status"]]}"><div class="step-head"><h3>{esc(f["who"])}</h3>{pill(f["status"])}</div><p>{esc(f["what"])}</p></li>'
        for f in overview["flow"])
    rules = "".join(f"<li>{esc(r)}</li>" for r in overview["rules"])
    nums = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in overview["numbers"])
    asks = "".join(f"<li>{esc(a)}</li>" for a in overview["needs_from_manager"])
    return f"""
<section class="lead"><p>{esc(overview["tagline"])}</p></section>
<h2>The journey of one project</h2>
<p class="muted">Each step hands the project to the next team automatically and tells them.</p>
<ol class="journey">{steps}</ol>
<div class="two">
  <div><h2>How we keep it safe</h2><ul class="plain">{rules}</ul></div>
  <div><h2>In numbers</h2><dl class="facts">{nums}</dl></div>
</div>
<h2>What we need from the manager</h2><ul class="plain asks">{asks}</ul>"""


# ------------------------------------------------------------------ progress
def tasks_table(tasks):
    rows = "".join(
        f'<tr><td>{esc(t["task"])}</td><td>{pill(t["status"])}</td><td>{esc(t["note"])}</td></tr>' for t in tasks)
    return f'<div class="scroll"><table><thead><tr><th>Task</th><th>Status</th><th>Note</th></tr></thead><tbody>{rows}</tbody></table></div>'


def progress_html():
    p = progress
    phases = "".join(
        f'<tr><td class="num">{esc(x["n"])}</td><td><strong>{esc(x["name"])}</strong><br><span class="muted">{esc(x["delivers"])}</span></td>'
        f'<td class="num">{esc(x["weeks"])} wk</td><td>{pill(x["status"])}</td>'
        f'<td><div class="bar" role="img" aria-label="{x["percent"]} percent"><i style="width:{x["percent"]}%"></i></div><span class="num small">{x["percent"]}%</span></td></tr>'
        for x in p["phases"])
    details = ""
    for n in range(0, 8):
        key = "phase0_tasks" if n == 0 else f"phase{n}_tasks"
        if p.get(key):
            name = next((x["name"] for x in p["phases"] if x["n"] == str(n)), "")
            intro = p.get(f"phase{n}_intro", "")
            details += f'<details class="acc"{" open" if n in (0, 4) else ""}><summary>Phase {n}: {esc(name)} <span class="muted small">({len(p[key])} items)</span></summary>' \
                       f'{f"<p class=muted>{esc(intro)}</p>" if intro else ""}{tasks_table(p[key])}</details>'
    li = lambda items: "".join(f"<li>{esc(i)}</li>" for i in items)
    risks = "".join(f'<tr><td>{esc(r["risk"])}</td><td>{esc(r["action"])}</td></tr>' for r in p["risks"])
    log = "".join(f'<tr><td class="nowrap">{esc(c["date"])}</td><td>{esc(c["text"])}</td></tr>' for c in p["changelog"])
    health = li(p["live_health"])
    return f"""
<section class="lead"><p>{esc(p["headline"])}</p></section>
<div class="overall"><div><span class="big num">{p["overall_percent"]}%</span><span class="muted"> of the plan complete (about 27 weeks in total)</span></div>
<div class="bar wide" role="img" aria-label="{p["overall_percent"]} percent overall"><i style="width:{p["overall_percent"]}%"></i></div></div>
<h2>Is the live system safe?</h2><ul class="plain">{health}</ul>
<h2>The 8 phases</h2>
<div class="scroll"><table class="phases"><thead><tr><th>#</th><th>Phase and what it delivers</th><th>Time</th><th>Status</th><th>Progress</th></tr></thead><tbody>{phases}</tbody></table></div>
<h2>Phase by phase</h2>{details}
<div class="two">
  <div><h2>Done in this update</h2><ul class="plain">{li(p["done_this_update"])}</ul></div>
  <div><h2>What happens next</h2><ul class="plain">{li(p["next"])}</ul></div>
</div>
<h2>Can the system handle 100+ users at once?</h2><p class="prose">{esc(p["capacity_answer"])}</p>
<h2>Open risks</h2><div class="scroll"><table><thead><tr><th>Risk</th><th>What we are doing</th></tr></thead><tbody>{risks}</tbody></table></div>
<h2>Decisions needed from the manager</h2><ul class="plain asks">{li(p["decisions"])}</ul>
<h2>Change log</h2><div class="scroll"><table><thead><tr><th>Date</th><th>What changed</th></tr></thead><tbody>{log}</tbody></table></div>"""


# ------------------------------------------------------------------ test workflows
def tests_html():
    t = tests
    before = "".join(f"<li>{esc(b)}</li>" for b in t["before_you_start"])
    secs = ""
    for s in t["sections"]:
        badge = {"new": '<span class="pill s-live">New</span>', "changed": '<span class="pill s-build">Changed</span>'}.get(s.get("status"), "")
        rows = ""
        for i, st in enumerate(s["steps"], 1):
            sid = f'{s["id"]}{i}'
            rows += (f'<tr data-step="{sid}"><td class="num">{sid}</td><td>{esc(st["who"])}</td><td>{esc(st["where"])}</td><td>{esc(st["do"])}</td><td>{esc(st["expect"])}</td>'
                     f'<td class="mark"><button type="button" class="tick pass" data-r="pass" aria-label="Pass {sid}">Pass</button>'
                     f'<button type="button" class="tick fail" data-r="fail" aria-label="Fail {sid}">Fail</button></td></tr>')
        intro = f'<p class="muted">{esc(s["intro"])}</p>' if s.get("intro") else ""
        secs += (f'<details class="acc" data-sec="{esc(s["id"])}"{" open" if s["id"] == "A" else ""}><summary>{esc(s["title"])} {badge} <span class="sec-count muted small"></span></summary>{intro}'
                 f'<div class="scroll"><table class="steps"><thead><tr><th>#</th><th>Who</th><th>Where</th><th>Do this</th><th>You should see</th><th>Result</th></tr></thead><tbody>{rows}</tbody></table></div></details>')
    log = "".join(f'<tr><td class="nowrap">{esc(c["date"])}</td><td>{esc(c["text"])}</td></tr>' for c in t["changelog"])
    return f"""
<section class="lead"><p>Tick Pass or Fail for each step as you test. Your ticks are kept in this browser only, so they are not shared with anyone else. A step passes only if what you see matches the last column.</p>
<p class="muted">Covers: {esc(t["covers"])}. Version {esc(t["version"])}, updated {esc(t["updated"])}.</p></section>
<div class="tally" id="tally" aria-live="polite"></div>
<h2>Before you start</h2><ul class="plain">{before}</ul>
<h2>The steps</h2>{secs}
<p><button type="button" class="ghost" id="reset-ticks">Clear all my ticks</button></p>
<h2>Reporting a problem</h2><ul class="plain"><li>The step number (for example B3) and your name.</li><li>The page you were on and what you clicked.</li><li>What you expected and what actually happened, with a screenshot if you can.</li></ul>
<h2>What changed in this version</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Change</th></tr></thead><tbody>{log}</tbody></table></div>"""


CSS = """
/* Layout: a sticky header with three tabs over a single reading column; tables scroll sideways inside their own box. */
:root {
  --bg: #f4f7f6; --surface: #ffffff; --ink: #14231f; --muted: #5a6b66; --line: #d9e2df;
  --accent: #0f766e; --accent-ink: #ffffff; --live: #15803d; --live-bg: #dcf3e4; --build: #a05a00; --build-bg: #fdecc8;
  --plan: #4f5f6b; --plan-bg: #e6ebee; --block: #b42318; --block-bg: #fde4e1; --head-bg: #ecf1ef;
  --f-head: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif; --f-body: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; --f-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e1715; --surface: #15211e; --ink: #e5eeeb; --muted: #9db0aa; --line: #263733;
  --accent: #3dc4b4; --accent-ink: #06201c; --live: #5fd68a; --live-bg: #16392a; --build: #f0b45a; --build-bg: #3d2d10;
  --plan: #a9b8c2; --plan-bg: #24323a; --block: #ff8f84; --block-bg: #43201c; --head-bg: #1b2a27; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #0e1715; --surface: #15211e; --ink: #e5eeeb; --muted: #9db0aa; --line: #263733;
  --accent: #3dc4b4; --accent-ink: #06201c; --live: #5fd68a; --live-bg: #16392a; --build: #f0b45a; --build-bg: #3d2d10;
  --plan: #a9b8c2; --plan-bg: #24323a; --block: #ff8f84; --block-bg: #43201c; --head-bg: #1b2a27; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 15px; line-height: 1.55; padding-block: 0 56px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.wrap { max-width: 1060px; margin: 0 auto; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--surface); }
header { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 9; background: var(--surface); border-bottom: 1px solid var(--line);
  margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding-inline: max(16px, env(safe-area-inset-left, 0px)); }
.bar-top { max-width: 1060px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 20px; padding-top: 14px; }
h1 { font-family: var(--f-head); font-size: 1.45rem; margin: 0; letter-spacing: -0.01em; text-wrap: balance; }
.stamp { font-family: var(--f-mono); font-size: 12px; color: var(--muted); }
nav { max-width: 1060px; margin: 0 auto; display: flex; gap: 4px; overflow-x: auto; }
nav button { font: inherit; font-weight: 600; background: none; border: 0; border-bottom: 3px solid transparent; color: var(--muted); padding: 10px 14px; cursor: pointer; white-space: nowrap; }
nav button[aria-selected="true"] { color: var(--accent); border-bottom-color: var(--accent); }
nav button:hover { color: var(--ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
main { padding-top: 22px; display: grid; gap: 4px; }
h2 { font-family: var(--f-head); font-size: 1.15rem; margin: 26px 0 6px; text-wrap: balance; }
h3 { font-family: var(--f-head); font-size: 1rem; margin: 0; }
p { margin: 0 0 10px; max-width: 72ch; } .muted { color: var(--muted); } .small { font-size: 12.5px; } .num { font-family: var(--f-mono); font-variant-numeric: tabular-nums; }
.lead { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; }
.lead p { font-size: 1.05rem; margin: 0 0 6px; } .lead p:last-child { margin: 0; }
ul.plain { margin: 0; padding-left: 20px; display: grid; gap: 6px; max-width: 78ch; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0 32px; } .two > div { min-width: 0; }
.pill { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
.s-live { background: var(--live-bg); color: var(--live); } .s-build { background: var(--build-bg); color: var(--build); }
.s-plan { background: var(--plan-bg); color: var(--plan); } .s-block { background: var(--block-bg); color: var(--block); }
.journey { list-style: none; margin: 8px 0 0; padding: 0 0 0 22px; border-left: 3px solid var(--line); display: grid; gap: 10px; }
.step { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; }
.step::before { content: ""; position: absolute; left: -31px; top: 16px; width: 15px; height: 15px; border-radius: 50%; border: 3px solid var(--bg); background: var(--plan); }
.step.s-live::before { background: var(--live); } .step.s-build::before { background: var(--build); }
.step-head { display: flex; flex-wrap: wrap; gap: 4px 12px; justify-content: space-between; align-items: center; } .step p { margin: 4px 0 0; }
.facts { margin: 0; display: grid; gap: 8px; } .facts div { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; }
.facts dt { font-size: 12px; color: var(--muted); } .facts dd { margin: 0; font-weight: 600; }
.overall { margin: 14px 0 0; display: grid; gap: 8px; } .big { font-size: 2rem; font-weight: 600; color: var(--accent); }
.bar { height: 9px; background: var(--plan-bg); border-radius: 99px; overflow: hidden; min-width: 90px; } .bar i { display: block; height: 100%; background: var(--accent); border-radius: 99px; }
.bar.wide { height: 12px; } td .bar { margin-bottom: 3px; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); margin: 8px 0 12px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 9px 12px; vertical-align: top; border-bottom: 1px solid var(--line); } tr:last-child td { border-bottom: 0; }
th { background: var(--head-bg); font-size: 11.5px; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); font-weight: 600; white-space: nowrap; }
.nowrap { white-space: nowrap; } .phases td:nth-child(2) { min-width: 260px; } .steps td:nth-child(4), .steps td:nth-child(5) { min-width: 220px; }
.acc { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 0 14px; margin: 8px 0; }
.acc > summary { cursor: pointer; font-family: var(--f-head); font-weight: 600; padding: 12px 0; list-style-position: outside; } .acc[open] > summary { border-bottom: 1px solid var(--line); margin-bottom: 8px; }
.acc .scroll { border: 0; background: none; margin-top: 4px; }
.tally { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 0; } .tally span { font-family: var(--f-mono); font-size: 13px; padding: 4px 12px; border-radius: 99px; background: var(--plan-bg); color: var(--plan); }
.tally .p { background: var(--live-bg); color: var(--live); } .tally .f { background: var(--block-bg); color: var(--block); }
.mark { white-space: nowrap; } .tick { font: inherit; font-size: 12px; font-weight: 700; padding: 4px 10px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); cursor: pointer; }
.tick.pass { border-radius: 6px 0 0 6px; } .tick.fail { border-radius: 0 6px 6px 0; border-left: 0; }
.tick.pass[aria-pressed="true"] { background: var(--live-bg); color: var(--live); border-color: var(--live); }
.tick.fail[aria-pressed="true"] { background: var(--block-bg); color: var(--block); border-color: var(--block); }
.ghost { font: inherit; background: none; border: 1px solid var(--line); color: var(--muted); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.panel[hidden] { display: none; }
@media (max-width: 560px) { h1 { font-size: 1.2rem; } .journey { padding-left: 16px; } .step::before { left: -25px; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
"""

JS = """
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('nav button'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  function show(id) {
    if (!document.getElementById(id)) id = 'overview';
    tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    window.scrollTo(0, 0);
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });
  show((location.hash || '#overview').slice(1));

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
    ticks[id] = ticks[id] === b.dataset.r ? undefined : b.dataset.r;
    if (!ticks[id]) delete ticks[id];
    save(); paint();
  });
  var reset = document.getElementById('reset-ticks');
  if (reset) reset.addEventListener('click', function () { ticks = {}; save(); paint(); });
  paint();
})();
"""

page = f"""<title>Intersmart Portal Live Report</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>{CSS}</style>
<header>
  <div class="bar-top"><h1>Intersmart Portal: Internal Software Plan</h1><span class="stamp">Updated {esc(progress["updated"])} &middot; Tests v{esc(tests["version"])}</span></div>
  <nav role="tablist" aria-label="Report sections">
    <button type="button" role="tab" data-tab="overview" aria-selected="true">System overview</button>
    <button type="button" role="tab" data-tab="progress" aria-selected="false">Progress</button>
    <button type="button" role="tab" data-tab="tests" aria-selected="false">Test workflows</button>
  </nav>
</header>
<div class="wrap"><main>
  <div class="panel" id="overview">{overview_html()}</div>
  <div class="panel" id="progress" hidden>{progress_html()}</div>
  <div class="panel" id="tests" hidden>{tests_html()}</div>
</main></div>
<script>{JS}</script>
"""
open(OUT, "w", encoding="utf-8").write(page)
print("wrote", OUT, f"({len(page) // 1024} KB)")
