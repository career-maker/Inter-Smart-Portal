# Roadmap folder: start here

Everything needed to continue the "Internal Software Plan" work in a fresh session.

| File | What it is |
|---|---|
| `CHECKPOINT.md` | **Start here.** Current state, ordered next steps, standing rules, how to deploy and test, gotchas |
| `PROGRESS.md` | **Read first.** Current status, what was done, what is next, rules |
| `SERVER.md` | Live server layout and how to check it safely (no password stored) |
| `EXECUTION_PLAN.md` | Build order and the rules that keep existing modules safe |
| `SOFTWARE_PLAN.md` | Have vs build, per role; phases; open decisions |
| `SOURCE_SHEET.md` / `SOURCE_Internal_software_plan.xlsx` | The manager's original sheet |
| `*.pdf` | Manager-facing PDFs (Implementation Roadmap, Execution Plan) |

Also read the repo `CLAUDE.md` (Backend/Database sections were corrected on 2026-10-23).

| `Progress Report.pdf`, `progress.json`, `make_progress_pdf.py` | Manager-facing live progress PDF. Edit the JSON, run the script, share the PDF |
| `Test Workflows.pdf`, `test_workflows.json`, `make_test_pdf.py` | Tick-box test script for the testers. Edit the JSON, run the script, share the PDF |
| `System Overview.pdf`, `overview.json`, `make_overview_pdf.py` | Plain-English picture of the whole workflow for the manager. Edit the JSON, run the script |
| `dev-env/php.ini.template` | PHP settings for running tests and the local stack |
| `Live Report.html`, `make_live_report.py` | One page combining overview, progress and test workflows. Published as an Artifact; update it after every unit of work |
