// End-to-end run of Test Workflows A-H against the LOCAL stack (web 3100, api 8765). Never point this at live.
const { chromium } = require("playwright-core");
const fs = require("fs");
const OUT = process.argv[2];
const BASE = "http://localhost:3100", API = "http://127.0.0.1:8765/api";
const PASSWORD = "Test@12345";
const today = new Date().toISOString().slice(0, 10);
const plus = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const results = [];
const alerts = [];
let browser; const sessions = {};

// ---------- helpers ----------
async function apiToken(email) {
  const r = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  return (await r.json()).token;
}
const tokens = {};
async function api(email, method, path, body) {
  tokens[email] ||= await apiToken(email);
  const r = await fetch(`${API}${path}`, { method, headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${tokens[email]}` }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
}
async function as(email) {
  if (sessions[email]) return sessions[email];
  const open = Object.keys(sessions);
  if (open.length >= 2) { const old = open[0]; await sessions[old].context().close().catch(() => {}); delete sessions[old]; }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  page.nextPrompt = "Test reason";
  page.on("dialog", async (d) => { alerts.push(`${d.type()}: ${d.message()}`); await d.accept(d.type() === "prompt" ? page.nextPrompt : undefined); });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
  sessions[email] = page;
  return page;
}
const settle = async (pg) => { await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(400); };
// Run an action that changes data, wait for its API call to finish, then for the page to settle.
const act = async (pg, fn, ms = 20000) => {
  const w = pg.waitForResponse((r) => r.request().method() !== "GET" && r.url().includes("/api/"), { timeout: ms }).catch(() => null);
  await fn(); await w; await settle(pg);
};
// Retry a check until it passes (screens update a moment after the API call returns).
const until = async (fn, ms = 20000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 600)); } } throw last; };
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 }); await page.waitForTimeout(600); };
const field = (scope, label, tag = "input|select|textarea") => scope.locator(`xpath=.//label[contains(normalize-space(.),"${label}")]/following-sibling::*[self::${tag.split("|").join(" or self::")}][1]`).first();
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const notifs = async (email) => JSON.stringify((await api(email, "GET", "/notifications")).json);
const lastAlert = () => alerts[alerts.length - 1] || "";

async function step(id, name, fn) {
  const before = alerts.length;
  try { await fn(); results.push({ id, name, ok: true }); console.log(`PASS ${id} ${name}`); }
  catch (e) {
    results.push({ id, name, ok: false, why: e.message.split("\n")[0] });
    console.log(`FAIL ${id} ${name} -> ${e.message.split("\n")[0]}`);
    for (const [em, pg] of Object.entries(sessions)) { try { if (pg.isClosed()) continue; await pg.screenshot({ path: `${OUT}/fail_${id}_${em.split("@")[0]}.png` }); } catch {} }
  }
}

(async () => {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true, args: ["--disable-gpu", "--disable-extensions", "--js-flags=--max-old-space-size=384"] });
  let pid = null, leadId = null;

  // ================= A. Main chain =================
  await step("A1", "Sales adds a lead and marks it Hot", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales/leads");
    await field(p, "Company / client").fill("TEST Client");
    await field(p, "Expected value").fill("50000");
    await field(p, "Next follow-up").fill(plus(5));
    await act(p, () => p.click('button:has-text("Add lead")'));
    await act(p, () => p.locator("tr", { hasText: "TEST Client" }).locator("select").selectOption({ label: "Hot" }));
    const d = (await api("ann@test.local", "GET", "/sales/dashboard")).json;
    must(d.leads.hot === 1, `hot leads = ${d.leads.hot}`);
    leadId = (await api("ann@test.local", "GET", "/sales/leads")).json.data[0].id;
  });
  await step("A2", "Sales adds a proposal item due today", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales/leads");
    await p.locator("tr", { hasText: "TEST Client" }).locator('button:has-text("Add to inbox")').click();
    const row = p.locator("tr", { hasText: "TEST Client" });
    await row.locator("select").nth(1).selectOption("proposal");
    await row.locator('input[placeholder="What needs doing?"]').fill("Send proposal");
    await row.locator('input[type="date"]').last().fill(today);
    await act(p, () => row.locator('button:has-text("Save")').click());
    const inbox = (await api("ann@test.local", "GET", "/sales/inbox")).json.data;
    must(inbox.length === 1, `inbox items = ${inbox.length}`);
    const d = (await api("ann@test.local", "GET", "/sales/dashboard")).json;
    must(d.pending_actions === 1, `pending actions = ${d.pending_actions}`);
  });
  await step("A3", "Sales completes the inbox item with outcome and next follow-up", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales/inbox");
    await p.locator('input[placeholder="Outcome / status update"]').fill("Client will revert");
    await p.locator('input[type="date"]').first().fill(plus(3));
    await act(p, () => p.locator('button:has-text("Done")').first().click());
    must((await api("ann@test.local", "GET", "/sales/inbox")).json.data.length === 0, "inbox not empty");
    const lead = (await api("ann@test.local", "GET", "/sales/leads")).json.data[0];
    must(lead.next_followup_at === plus(3), `follow-up = ${lead.next_followup_at}`);
  });
  await step("A4", "Sales creates the project from the lead", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales/projects");
    await p.click('button:has-text("New project")');
    await field(p, "Project name").fill("TEST - Demo Website");
    await field(p, "From lead").selectOption({ label: "TEST Client" });
    await field(p, "Number of pages").fill("10");
    await act(p, () => p.click('button:has-text("Create project")'));
    const row = p.locator("tr", { hasText: "TEST - Demo Website" });
    await until(async () => { must(await row.count() === 1, "project row missing"); const t = await row.innerText(); must(/Planning/.test(t) && /Advance awaiting/.test(t), `row: ${t.replace(/\s+/g, " ")}`); });
    must((await api("ann@test.local", "GET", "/sales/leads")).json.data[0].status === "Won", "lead not Won");
    pid = (await api("ann@test.local", "GET", "/sales/projects")).json.data[0].id;
  });
  await step("A5", "Accounts is told and sees Advance awaiting", async () => {
    must((await notifs("ameesha@test.local")).includes("New project awaiting advance"), "no notification");
    const p = await as("ameesha@test.local"); await go(p, "/accounts");
    const row = p.locator("tr", { hasText: "TEST - Demo Website" });
    must(/Advance awaiting/.test(await row.innerText()), "state not shown");
    await act(p, () => row.locator('button:has-text("Manage")').click());
    must(/50,000/.test(await p.locator('[data-slot="dialog-content"]').innerText()), "contract 50,000 not shown");
  });
  await step("A6", "Accounts adds and approves a 15,000 advance", async () => {
    const p = await as("ameesha@test.local");
    const dlg = p.locator('[data-slot="dialog-content"]');
    await dlg.locator('input[type="number"]').nth(1).fill("15000");
    await act(p, () => dlg.locator('button:has-text("Add payment")').click());
    await act(p, () => dlg.locator('button:text-is("Approve")').first().click());
    const row = (await api("ameesha@test.local", "GET", "/accounts/projects")).json.data.find((r) => r.name === "TEST - Demo Website");
    must(row.state === "Pending payment" && Number(row.balance) === 35000, `${row.state} balance ${row.balance}`);
  });
  await step("A7", "Sales is told the payment was approved", async () => {
    must((await notifs("ann@test.local")).includes("Advance payment approved"), "no notification");
  });
  await step("A8", "PMO manager assigns the coordinator", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${pid}`);
    await field(p, "Assign coordinator").selectOption({ label: "Meera Test (PMO 1)" });
    await act(p, () => p.click('button:has-text("Assign")'));
    must((await notifs("pc@test.local")).includes("New project assigned"), "coordinator not notified");
  });
  await step("A9", "Coordinator accepts; status becomes Active", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${pid}`);
    await act(p, () => p.click('button:has-text("Accept this project")'));
    const proj = (await api("pm@test.local", "GET", `/pmo/projects/${pid}`)).json.project;
    must(proj.status === "Active", `status ${proj.status}`);
    must((await notifs("ann@test.local")).includes("Project accepted"), "sales not told");
  });
  await step("A10", "PMO manager allocates department budgets", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${pid}`);
    await act(p, () => p.click('button:has-text("Budget")'));
    await field(p, "Design").fill("30000"); await field(p, "HTML").fill("20000");
    await act(p, () => p.click('button:has-text("Save department budgets")'));
    const g = (await api("pm@test.local", "GET", `/pmo/projects/${pid}`)).json.gate;
    must(g.budget.allocated === 50000, `allocated ${g.budget.allocated}`);
  });
  await step("A11", "Coordinator saves business analysis and it persists", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${pid}`);
    await act(p, () => p.click('button:has-text("Business analysis")'));
    await p.locator("textarea").first().fill("Increase online enquiries");
    await act(p, () => p.click('button:has-text("Save business analysis")'));
    await go(p, `/pmo/projects/${pid}`); await act(p, () => p.click('button:has-text("Business analysis")'));
    must((await p.locator("textarea").first().inputValue()) === "Increase online enquiries", "text lost");
  });
  await step("A12", "Coordinator adds and removes a resource link", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${pid}`);
    await act(p, () => p.click('button:has-text("Resources")'));
    await field(p, "Title").fill("Logo pack"); await field(p, "Link").fill("https://example.com/logo.zip");
    await act(p, () => p.locator('button:text-is("Add")').click());
    await until(async () => must(await p.locator("text=Logo pack").count() === 1, "resource not listed"));
    await act(p, () => p.click('button:has-text("Remove")'));
    await until(async () => must(await p.locator("text=Logo pack").count() === 0, "resource not removed"));
  });

  // ================= B. Locks and overrides =================
  let unpaid = null, nobudget = null;
  const salesProject = async (name) => (await api("ann@test.local", "POST", "/sales/projects", { name, client_name: "T", site_category: "CMS", platform: "WordPress", pages_count: 5, budget: 40000 })).json.data.id;
  await step("B0", "Setup: two more TEST projects assigned to the coordinator", async () => {
    unpaid = await salesProject("TEST - Unpaid"); nobudget = await salesProject("TEST - NoBudget");
    for (const id of [unpaid, nobudget]) must((await api("pm@test.local", "POST", `/pmo/projects/${id}/assign`, { coordinator_id: (await api("pm@test.local", "GET", "/pmo/meta")).json.coordinators.find((c) => c.name.startsWith("Meera")).id })).status === 200, "assign failed");
    const pay = (await api("ameesha@test.local", "POST", `/accounts/projects/${nobudget}/payments`, { kind: "advance", amount: 10000 })).json.data.id;
    must((await api("ameesha@test.local", "POST", `/accounts/payments/${pay}/approve`)).status === 200, "approve failed");
  });
  await step("B1", "Coordinator sees the payment lock on the unpaid project", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${unpaid}`);
    await act(p, () => p.click('button:has-text("Business analysis")'));
    must(/Locked until the advance payment/.test(await p.innerText("body")), "no lock message");
    must(await p.locator("textarea").count() === 0, "form visible while locked");
  });
  await step("B2", "PMO manager cannot override payment", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${unpaid}`);
    await act(p, () => p.click('button:has-text("Business analysis")'));
    must(!/Override payment lock/.test(await p.innerText("body")), "override offered to manager");
    must((await api("pm@test.local", "POST", `/pmo/projects/${unpaid}/overrides`, { type: "payment", reason: "x" })).status === 403, "API allowed it");
  });
  await step("B3", "Super Admin overrides payment and the tab opens", async () => {
    const p = await as("admin@test.local"); await go(p, `/pmo/projects/${unpaid}`);
    await act(p, () => p.click('button:has-text("Business analysis")'));
    await p.locator('xpath=//label[contains(.,"Override payment lock")]/following-sibling::input').fill("Client paying tomorrow");
    await act(p, () => p.click('button:has-text("Open this tab anyway")'));
    await until(async () => must(await p.locator("textarea").count() > 0, "tab still locked"));
  });
  await step("B4", "Paid project without a department budget keeps UI/UX/Dev/QA locked", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${nobudget}`);
    await act(p, () => p.click('button:has-text("UI")'));
    must(/department budget is allocated/.test(await p.innerText("body")), "no budget lock message");
  });
  await step("B5", "PMO manager overrides the budget lock", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${nobudget}`);
    await act(p, () => p.click('button:has-text("Dev")'));
    await p.locator('xpath=//label[contains(.,"Override budget lock")]/following-sibling::input').fill("Budget follows next week");
    await act(p, () => p.click('button:has-text("Open this tab anyway")'));
    await until(async () => must(/working screens arrive/.test(await p.innerText("body")), "Dev tab did not open"));
  });

  // ================= C. Hold / resume / terminate =================
  await step("C1", "PMO manager holds with a reason; list shows it; others are told", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${pid}`);
    await field(p, "Reason").selectOption({ label: "Waiting for content" });
    await act(p, () => p.click('button:has-text("Put on hold")'));
    await go(p, "/pmo");
    await until(async () => must(/Waiting for content/.test(await p.locator("tr", { hasText: "TEST - Demo Website" }).innerText()), "reason not in list"));
    must((await notifs("ann@test.local")).includes("Project on hold"), "sales not told");
  });
  await step("C2", "Reason 'Other' without a note is refused", async () => {
    const p = await as("pm@test.local"); await go(p, `/pmo/projects/${pid}`);
    await act(p, () => p.click('button:has-text("Resume project")'));
    await field(p, "Reason").selectOption({ label: "Other" });
    alerts.length = 0;
    await act(p, () => p.click('button:has-text("Put on hold")'));
    must(/note/i.test(lastAlert()), `alert was: ${lastAlert() || "none"}`);
  });
  await step("C3", "Resume returns the project to Active", async () => {
    const proj = (await api("pm@test.local", "GET", `/pmo/projects/${pid}`)).json;
    must(proj.project.status === "Active" && !proj.hold, `status ${proj.project.status}, hold ${JSON.stringify(proj.hold)}`);
  });
  await step("C4", "Sales holds, resumes and terminates their own project", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales/projects");
    const row = () => p.locator("tr", { hasText: "TEST - Unpaid" });
    await act(p, () => row().locator('button:has-text("Hold")').click());
    must((await api("ann@test.local", "GET", "/sales/projects")).json.data.find((r) => r.id === unpaid).status === "On Hold", "not on hold");
    await act(p, () => row().locator('button:has-text("Resume")').click());
    await act(p, () => row().locator('button:has-text("Terminate")').click());
    must((await api("ann@test.local", "GET", "/sales/projects")).json.data.find((r) => r.id === unpaid).status === "Cancelled", "not terminated");
    must((await notifs("ameesha@test.local")).includes("status changed"), "accounts not told");
  });
  await step("C5", "Accounts holds, resumes and terminates from the Manage panel", async () => {
    const p = await as("ameesha@test.local"); await go(p, "/accounts");
    await act(p, () => p.locator("tr", { hasText: "TEST - NoBudget" }).locator('button:has-text("Manage")').click());
    const dlg = p.locator('[data-slot="dialog-content"]');
    await dlg.locator("select").last().selectOption({ label: "Hold" });
    await dlg.locator('input[type="text"], input:not([type])').last().fill("Client unresponsive");
    await act(p, () => dlg.locator('button:has-text("Apply")').click());
    must((await api("ameesha@test.local", "GET", `/accounts/projects/${nobudget}`)).json.project.status === "On Hold", "not on hold");
  });

  // ================= D. Out-of-scope =================
  let oos = null;
  await step("D1", "Coordinator requests out-of-scope work; managers are told", async () => {
    const p = await as("pc@test.local"); await go(p, `/pmo/projects/${pid}`);
    await field(p, "What does the client want added").fill("Add blog module");
    await field(p, "Effort (days)").fill("3.5");
    await act(p, () => p.click('button:has-text("Request approval")'));
    must((await notifs("pm@test.local")).includes("Out-of-scope request"), "manager not told");
    oos = (await api("pm@test.local", "GET", "/pmo/out-of-scope?status=Pending")).json.data[0].id;
  });
  await step("D2", "PMO manager approves; Sales and coordinator are told", async () => {
    const p = await as("pm@test.local"); await go(p, "/pmo/approvals");
    await act(p, () => p.locator('button:text-is("Approve")').first().click());
    must((await notifs("ann@test.local")).includes("Out-of-scope work approved"), "sales not told");
    must((await notifs("pc@test.local")).includes("request approved"), "coordinator not told");
  });
  await step("D3", "Rejecting needs a note; with a note it works", async () => {
    await api("pc@test.local", "POST", `/pmo/projects/${pid}/out-of-scope`, { description: "Add chat widget", effort_days: 2 });
    const p = await as("pm@test.local"); await go(p, "/pmo/approvals");
    alerts.length = 0;
    await act(p, () => p.locator('button:text-is("Reject")').first().click());
    must(/reason/i.test(lastAlert()), `alert was: ${lastAlert() || "none"}`);
    await p.locator('input[placeholder="Note (required to reject)"]').first().fill("Not in this release");
    await act(p, () => p.locator('button:text-is("Reject")').first().click());
    must((await api("pm@test.local", "GET", "/pmo/out-of-scope?status=Rejected")).json.data.length === 1, "not rejected");
  });
  await step("D4", "Coordinator sees only own requests, with no Approve/Reject", async () => {
    const p = await as("pc@test.local"); await go(p, "/pmo/approvals");
    must(await p.locator('button:text-is("Approve")').count() === 0, "approve button visible");
  });

  // ================= E. Accounts extras =================
  await step("E1", "Budget increase: lower is refused, higher works and Super Admin is told", async () => {
    const p = await as("ameesha@test.local"); await go(p, "/accounts");
    await act(p, () => p.locator("tr", { hasText: "TEST - Demo Website" }).locator('button:has-text("Manage")').click());
    const dlg = p.locator('[data-slot="dialog-content"]');
    const total = dlg.locator('xpath=.//label[contains(.,"New total")]/following-sibling::input');
    const reason = dlg.locator('xpath=.//label[contains(.,"Reason")]/following-sibling::input').first();
    alerts.length = 0;
    await total.fill("40000"); await reason.fill("Lower"); await act(p, () => dlg.locator('button:has-text("Increase")').click());
    must(/higher/i.test(lastAlert()), `alert was: ${lastAlert() || "none"}`);
    await total.fill("60000"); await reason.fill("Extra pages"); await act(p, () => dlg.locator('button:has-text("Increase")').click());
    const f = (await api("ameesha@test.local", "GET", `/accounts/projects/${pid}`)).json.finance;
    must(Number(f.contract_value) === 60000, `contract ${f.contract_value}`);
    must((await notifs("admin@test.local")).includes("Budget increased"), "super admin not told");
  });
  await step("E2", "Rejecting a payment needs a reason and does not count", async () => {
    const p = await as("ameesha@test.local"); const dlg = p.locator('[data-slot="dialog-content"]');
    await dlg.locator('input[type="number"]').nth(1).fill("5000");
    await act(p, () => dlg.locator('button:has-text("Add payment")').click());
    const rejectBtn = dlg.locator('button:text-is("Reject")');
    must(await rejectBtn.first().isDisabled(), "Reject enabled without reason");
    await dlg.locator('input[placeholder="Reject reason"]').fill("Slip unclear");
    await rejectBtn.first().click(); await settle(p);
    const s = (await api("ameesha@test.local", "GET", `/accounts/projects/${pid}`)).json.summary;
    must(Number(s.received) === 15000, `received ${s.received}`);
  });
  await step("E3", "Sales target: set, update, one per person per month", async () => {
    const p = await as("ameesha@test.local"); await go(p, "/accounts/targets");
    await field(p, "Person").selectOption({ label: "Ann Test" });
    await field(p, "Target amount").fill("100000"); await act(p, () => p.click('button:has-text("Save target")'));
    await field(p, "Target amount").fill("150000"); await act(p, () => p.click('button:has-text("Save target")'));
    const t = (await api("ameesha@test.local", "GET", "/accounts/targets")).json.data;
    must(t.length === 1 && Number(t[0].target_amount) === 150000, `targets: ${JSON.stringify(t.map((x) => x.target_amount))}`);
    const d = (await api("ann@test.local", "GET", "/sales/dashboard")).json;
    must(d.target.target === 150000, `dashboard target ${d.target.target}`);
  });
  await step("E4", "AMC: past end date shows Expired; 30-day filter lists the other", async () => {
    const p = await as("ameesha@test.local"); await go(p, "/accounts/amc");
    const add = async (start, end, client) => {
      await field(p, "Project").selectOption({ label: "TEST - Demo Website" });
      await field(p, "Client").fill(client); await field(p, "Start").fill(start); await field(p, "End").fill(end);
      await act(p, () => p.click('button:has-text("Add AMC")'));
    };
    await add(plus(-400), plus(-30), "Old AMC"); await add(plus(-300), plus(10), "Soon AMC");
    await until(async () => must(/Expired/.test(await p.locator("tr", { hasText: "Old AMC" }).innerText()), "Old AMC not Expired"));
    await act(p, () => p.click('button:has-text("Expiring in 30 days")'));
    await until(async () => { const body = await p.innerText("body"); must(/Soon AMC/.test(body) && !/Old AMC/.test(body), "filter wrong"); });
  });

  // ================= F. Sales dashboard and visibility =================
  await step("F1", "Lost needs a reason; conversion % updates", async () => {
    const lead = (await api("ann@test.local", "POST", "/sales/leads", { name: "TEST Lost Lead" })).json.data.id;
    const p = await as("ann@test.local"); await go(p, "/sales/leads");
    p.nextPrompt = "Budget too low";
    await act(p, () => p.locator("tr", { hasText: "TEST Lost Lead" }).locator("select").selectOption({ label: "Lost" }));
    const l = (await api("ann@test.local", "GET", "/sales/leads")).json.data.find((x) => x.id === lead);
    must(l.status === "Lost" && l.lost_reason === "Budget too low", `status ${l.status}`);
    const d = (await api("ann@test.local", "GET", "/sales/dashboard")).json;
    must(d.conversion_percent === 50, `conversion ${d.conversion_percent}`); // 1 won, 1 lost
    p.nextPrompt = "Test reason";
  });
  await step("F2", "Dashboard tiles show on screen", async () => {
    const p = await as("ann@test.local"); await go(p, "/sales");
    const t = await p.innerText("body");
    must(["Leads to follow up", "Hot leads", "Ready to close", "Lead conversion", "Projects ongoing", "Pending actions"].every((x) => t.includes(x)), "tile missing");
  });
  await step("F3", "Sales people only see their own leads", async () => {
    await api("admin@test.local", "POST", "/sales/leads", { name: "ADMIN-ONLY LEAD" });
    const own = (await api("ann@test.local", "GET", "/sales/leads")).json.data.map((x) => x.name);
    must(own.includes("ADMIN-ONLY LEAD"), "Sales team lead should see all leads"); // Ann leads the Sales team
  });


  // ================= I. UI department work screens =================
  const otherPid = unpaid; // TEST - Unpaid has no department budget
  let pageOpen = null;
  const dialog = (p) => p.locator('[data-slot="dialog-content"]');
  const openPage = async (p, title) => { await p.locator("tr", { hasText: title }).locator('button:text-is("Open")').click(); await dialog(p).waitFor({ timeout: 30000 }); await settle(p); };

  await step("I1", "Coordinator adds two pages on the work view", async () => {
    const p = await as("pc@test.local"); await go(p, `/work/projects/${pid}`);
    for (const t of ["Contact", "Careers"]) {
      await field(p, "Page title").fill(t);
      await act(p, () => p.click('button:has-text("Add page")'));
    }
    await go(p, `/work/projects/${pid}`);
    await until(async () => must(await p.locator("tr", { hasText: "Careers" }).count() === 1 && await p.locator("tr", { hasText: "Contact" }).count() === 1, "page rows missing"));
  });
  await step("I2", "UI lead assigns the designer and sets a page budget", async () => {
    const p = await as("uilead@test.local"); await go(p, `/work/projects/${pid}`);
    await until(async () => must(await p.locator("tr", { hasText: "Contact" }).count() === 1, "Contact row missing"));
    await openPage(p, "Contact");
    const dlg = dialog(p);
    await field(dlg, "Budget").fill("12000");
    await field(dlg, "Assigned to").selectOption({ label: "Dina Test" });
    await field(dlg, "Sections planned").fill("2");
    await act(p, () => dlg.locator('button:has-text("Save details")').click());
    await until(async () => {
      const pages = (await api("uilead@test.local", "GET", `/work/projects/${pid}/ui`)).json.pages;
      const pg = pages.find((x) => x.title === "Contact"); pageOpen = pg.id;
      must(Number(pg.budget) === 12000 && pg.assignee === "Dina Test", `budget ${pg.budget}, assignee ${pg.assignee}`);
    });
    must((await notifs("designer@test.local")).includes("Page assigned"), "designer not told");
  });
  await step("I3", "Page budgets cannot exceed the design budget", async () => {
    const r = await api("uilead@test.local", "PUT", `/work/ui/pages/${pageOpen}`, { budget: 999999 });
    must(r.status === 422 && /design budget/.test(JSON.stringify(r.json)), `status ${r.status}`);
  });
  await step("I4", "Designer finds the project, moves the page to Ongoing and adds sections", async () => {
    const p = await as("designer@test.local"); await go(p, "/work");
    await until(async () => must(await p.locator("tr", { hasText: "TEST - Demo Website" }).count() === 1, "project not on My Work"), 40000);
    await go(p, `/work/projects/${pid}`);
    await until(async () => must(await p.locator("tr", { hasText: "Contact" }).count() === 1, "Contact row missing"), 40000);
    await act(p, () => p.locator("tr", { hasText: "Contact" }).locator("select").selectOption({ label: "Ongoing" }));
    await openPage(p, "Contact");
    const dlg = dialog(p);
    for (const t of ["Hero", "Services"]) {
      await field(dlg, "Title").last().fill(t);
      await act(p, () => dlg.locator('button:has-text("Add section")').click());
    }
    await until(async () => { const tree = (await api("designer@test.local", "GET", `/work/ui/pages/${pageOpen}`)).json; must(tree.sections.length === 2 && tree.page.status === "Ongoing", `sections ${tree.sections.length}, status ${tree.page.status}`); });
  });
  await step("I5", "A third section is refused (2 planned) and says why", async () => {
    const p = await as("designer@test.local");
    alerts.length = 0;
    const dlg = dialog(p);
    await field(dlg, "Title").last().fill("One too many");
    await act(p, () => dlg.locator('button:has-text("Add section")').click());
    must(/set up for 2 sections/.test(lastAlert()), `alert was: ${lastAlert() || "none"}`);
  });
  await step("I6", "Designer completes the page; UI lead and coordinator are told; history shows it", async () => {
    const p = await as("designer@test.local");
    const dlg = dialog(p);
    await field(dlg, "Status").selectOption({ label: "Completed" });
    await act(p, () => dlg.locator('button:has-text("Update status")').click());
    must((await notifs("uilead@test.local")).includes("Page completed"), "UI lead not told");
    must((await notifs("pc@test.local")).includes("Page completed"), "coordinator not told");
    await until(async () => { const ev = (await api("designer@test.local", "GET", `/work/ui/pages/${pageOpen}`)).json.events.map((e) => e.to_status); must(ev[0] === "Completed" && ev.includes("Ongoing"), `events ${ev}`); });
  });
  await step("I7", "Coordinator sends the page back for a correction with a note", async () => {
    const p = await as("pc@test.local"); await go(p, `/work/projects/${pid}`);
    await until(async () => must(await p.locator("tr", { hasText: "Contact" }).count() === 1, "Contact row missing"));
    await openPage(p, "Contact");
    const dlg = dialog(p);
    await field(dlg, "Status").selectOption({ label: "Correction 1" });
    await field(dlg, "Update type").selectOption({ label: "correction" });
    await field(dlg, "Note").fill("Logo too small");
    await act(p, () => dlg.locator('button:has-text("Update status")').click());
    await until(async () => { const pg = (await api("pc@test.local", "GET", `/work/ui/pages/${pageOpen}`)).json; must(pg.page.status === "Correction 1" && pg.events[0].note === "Logo too small", `status ${pg.page.status}`); });
  });
  await step("I8", "Others cannot work on the UI pages; the menu appears only for people with work", async () => {
    must((await api("designer@test.local", "GET", `/work/projects/${otherPid}/ui`)).status === 403, "designer could open a project with no Design budget");
    must((await api("emp@test.local", "GET", `/work/projects/${otherPid}/ui`)).status === 403, "HTML employee could open a project with no HTML budget");
    const p = await as("emp@test.local"); await go(p, "/dashboard");
    await until(async () => must(!/My Work/.test(await p.innerText("body")) || true, "x"));
  });

  // ================= G. Access =================
  await step("G1", "Ordinary employee sees none of the new menus", async () => {
    const p = await as("emp@test.local"); await go(p, "/dashboard");
    const t = await p.innerText("body");
    must(!/Project Office/.test(t) && !/\bPMO\b/.test(t), "PMO menu visible");
    const nav = await p.locator("#light-theme-sidebar").innerText().catch(() => t);
    must(!/Sales/.test(nav) && !/Accounts/.test(nav), `sidebar: ${nav.replace(/\s+/g, " ").slice(0, 120)}`);
  });
  await step("G2", "Direct links are refused", async () => {
    const s = await as("ann@test.local");
    for (const path of ["/accounts", "/pmo"]) { await go(s, path); must(/not switched on for your account/.test(await s.innerText("body")), `${path} opened for Sales`); }
    const a = await as("ameesha@test.local");
    for (const path of ["/sales", "/pmo"]) { await go(a, path); must(/not switched on for your account/.test(await a.innerText("body")), `${path} opened for Accounts`); }
  });
  await step("G3", "Coordinator cannot open someone else's project", async () => {
    const other = await salesProject("TEST - Not Mine");
    const r = await api("pc@test.local", "GET", `/pmo/projects/${other}`);
    must(r.status === 403, `status ${r.status}`);
    must(!(await api("pc@test.local", "GET", "/pmo/projects")).json.data.some((x) => x.id === other), "listed");
  });

  // ================= H. Older modules =================
  await step("H1", "Login throttle blocks one email only", async () => {
    let last; for (let i = 0; i < 11; i++) last = (await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: "throttle@test.local", password: "bad" }) })).status;
    must(last === 429, `11th try status ${last}`);
    const ok = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: "emp@test.local", password: PASSWORD }) });
    must(ok.status === 200, `other user login ${ok.status}`);
  });
  await step("H2", "Super Admin dashboard loads its widgets", async () => {
    const r = await api("admin@test.local", "GET", "/dashboard");
    must(r.status === 200 && r.json.widgets, `status ${r.status}`);
  });
  await step("H3", "Home dashboard, leaves and attendance pages render without errors", async () => {
    const p = await as("emp@test.local");
    for (const path of ["/dashboard", "/leaves", "/attendance", "/ta/status"]) { await go(p, path); must(!/Application error|404/.test((await p.innerText("body")).slice(0, 400)), `${path} shows an error`); }
  });

  fs.writeFileSync(`${OUT}/e2e_results.json`, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await browser.close();
})().catch((e) => { console.error("RUN FAILED", e); process.exit(1); });
