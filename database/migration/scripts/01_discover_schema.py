#!/usr/bin/env python3
"""
Phase 1 — Supabase Schema Discovery
READ-ONLY. No modifications to source database.
Outputs: SUPABASE_SCHEMA_REPORT.md + schema_meta.json
"""

import os, sys, json, textwrap
from datetime import datetime

# ── credentials from env ──────────────────────────────────────────────────────
DB_HOST = os.environ.get("MIGRATION_DB_HOST", "aws-1-ap-northeast-1.pooler.supabase.com")
DB_PORT = int(os.environ.get("MIGRATION_DB_PORT", "5432"))
DB_NAME = os.environ.get("MIGRATION_DB_NAME", "postgres")
DB_USER = os.environ.get("MIGRATION_DB_USER", "postgres.shczwbwsrnrygmmvyeue")
DB_PASS = os.environ.get("MIGRATION_DB_PASS", "")

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
REPORT_FILE = os.path.join(SCRIPT_DIR, "..", "SUPABASE_SCHEMA_REPORT.md")
META_FILE   = os.path.join(SCRIPT_DIR, "schema_meta.json")

# ── install psycopg2 if needed ────────────────────────────────────────────────
try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("psycopg2 not found. Installing via pip...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "--quiet"])
    import psycopg2
    import psycopg2.extras

# ── connect ───────────────────────────────────────────────────────────────────
print("Connecting to Supabase (read-only) ...")
try:
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS,
        sslmode="require",
        options="-c default_transaction_read_only=on"
    )
    conn.set_session(readonly=True)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    print("Connected.")
except Exception as e:
    sys.exit(f"Connection failed: {e}")

def query(sql, params=None):
    cur.execute(sql, params or [])
    return cur.fetchall()

# ── 1. tables ─────────────────────────────────────────────────────────────────
print("Fetching tables ...")
tables = query("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")
table_names = [r["table_name"] for r in tables]

row_counts = {}
for tn in table_names:
    try:
        r = query(f'SELECT COUNT(*) AS cnt FROM public."{tn}"')
        row_counts[tn] = int(r[0]["cnt"])
    except Exception as ex:
        conn.rollback()
        row_counts[tn] = f"ERROR: {ex}"
print(f"{len(table_names)} tables found.")

# ── 2. columns ────────────────────────────────────────────────────────────────
print("Fetching columns ...")
cols_raw = query("""
    SELECT table_name, column_name, ordinal_position, data_type, udt_name,
           character_maximum_length, numeric_precision, numeric_scale,
           is_nullable, column_default, is_identity, identity_generation
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
""")
cols_by_table = {}
for c in cols_raw:
    cols_by_table.setdefault(c["table_name"], []).append(dict(c))

# ── 3. primary keys ───────────────────────────────────────────────────────────
print("Fetching primary keys ...")
pks_raw = query("""
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position
""")
pks_by_table = {}
for pk in pks_raw:
    pks_by_table.setdefault(pk["table_name"], []).append(pk["column_name"])

# ── 4. foreign keys ───────────────────────────────────────────────────────────
print("Fetching foreign keys ...")
fks_raw = query("""
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table,
           ccu.column_name AS foreign_column, tc.constraint_name,
           rc.update_rule, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name
""")
fks_by_table = {}
for fk in fks_raw:
    fks_by_table.setdefault(fk["table_name"], []).append(dict(fk))

# ── 5. unique constraints ──────────────────────────────────────────────────────
print("Fetching unique constraints ...")
uqs_raw = query("""
    SELECT tc.table_name, tc.constraint_name,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name
""")
uqs_by_table = {}
for uq in uqs_raw:
    uqs_by_table.setdefault(uq["table_name"], []).append(dict(uq))

# ── 6. indexes ────────────────────────────────────────────────────────────────
print("Fetching indexes ...")
idxs_raw = query("""
    SELECT t.relname AS table_name, i.relname AS index_name,
           ix.indisunique AS is_unique, ix.indisprimary AS is_primary,
           array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') AS columns,
           pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i  ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relkind = 'r'
    GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary, ix.indexrelid
    ORDER BY t.relname, i.relname
""")
idxs_by_table = {}
for idx in idxs_raw:
    idxs_by_table.setdefault(idx["table_name"], []).append(dict(idx))

# ── 7. sequences ──────────────────────────────────────────────────────────────
print("Fetching sequences ...")
sequences = [dict(r) for r in query("""
    SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment
    FROM information_schema.sequences WHERE sequence_schema = 'public' ORDER BY sequence_name
""")]

# ── 8. views ──────────────────────────────────────────────────────────────────
print("Fetching views ...")
views = [dict(r) for r in query("""
    SELECT table_name AS view_name, view_definition
    FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name
""")]

# ── 9. triggers ───────────────────────────────────────────────────────────────
print("Fetching triggers ...")
triggers = [dict(r) for r in query("""
    SELECT trigger_name, event_object_table AS table_name,
           event_manipulation, action_timing, action_statement
    FROM information_schema.triggers WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
""")]

# ── 10. RLS policies ──────────────────────────────────────────────────────────
print("Fetching RLS policies ...")
policies_raw = [dict(r) for r in query("""
    SELECT schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
""")]
policies_by_table = {}
for pol in policies_raw:
    policies_by_table.setdefault(pol["tablename"], []).append(pol)

# ── 11. enum types ────────────────────────────────────────────────────────────
print("Fetching enum types ...")
enums_raw = query("""
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value, e.enumsortorder AS sort_order
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
""")
enums_by_name = {}
for ev in enums_raw:
    enums_by_name.setdefault(ev["enum_name"], []).append(ev["enum_value"])

# ── 12. functions ─────────────────────────────────────────────────────────────
print("Fetching functions ...")
functions = [dict(r) for r in query("""
    SELECT routine_name, routine_type, data_type AS return_type
    FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name
""")]

cur.close()
conn.close()

# ── generate markdown report ──────────────────────────────────────────────────
print("Generating report ...")
now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
total_rows = sum(v for v in row_counts.values() if isinstance(v, int))

lines = []
lines.append(f"# Supabase Schema Report — Inter Smart Employee Portal\n")
lines.append(f"> **Generated**: {now_str}  ")
lines.append(f"> **Source**: Supabase PostgreSQL (READ-ONLY)  ")
lines.append(f"> **Tables found**: {len(table_names)}  ")
lines.append(f"> **Total rows**: {total_rows:,}  \n")
lines.append("---\n")

lines.append("## Table Summary\n")
lines.append("| Table | Row Count |")
lines.append("|---|---|")
for tn in table_names:
    cnt = row_counts.get(tn, "?")
    lines.append(f"| `{tn}` | {cnt:,} |" if isinstance(cnt, int) else f"| `{tn}` | {cnt} |")
lines.append("\n---\n")

lines.append("## Table Details\n")
for tn in table_names:
    cnt = row_counts.get(tn, "?")
    cnt_str = f"{cnt:,}" if isinstance(cnt, int) else str(cnt)
    lines.append(f"### `{tn}`\n")
    lines.append(f"**Row count**: {cnt_str}\n")

    # Columns
    lines.append("#### Columns\n")
    lines.append("| # | Column | PG Type | Nullable | Default | Identity | PK |")
    lines.append("|---|---|---|---|---|---|---|")
    pk_cols = pks_by_table.get(tn, [])
    for col in cols_by_table.get(tn, []):
        udt   = col.get("udt_name") or col.get("data_type", "")
        maxl  = col.get("character_maximum_length")
        prec  = col.get("numeric_precision")
        scale = col.get("numeric_scale")
        if maxl:  udt += f"({maxl})"
        elif prec is not None and scale is not None: udt += f"({prec},{scale})"
        is_pk   = "✓" if col["column_name"] in pk_cols else ""
        is_id   = f"YES ({col['identity_generation']})" if col.get("is_identity") == "YES" else ""
        default = f"`{col['column_default']}`" if col.get("column_default") else ""
        lines.append(f"| {col['ordinal_position']} | `{col['column_name']}` | `{udt}` | {col['is_nullable']} | {default} | {is_id} | {is_pk} |")
    lines.append("")

    if pk_cols:
        lines.append(f"**Primary Key**: `{', '.join(pk_cols)}`\n")

    # FKs
    if tn in fks_by_table:
        lines.append("#### Foreign Keys\n")
        lines.append("| Constraint | Column | → Table | → Column | On Update | On Delete |")
        lines.append("|---|---|---|---|---|---|")
        for fk in fks_by_table[tn]:
            lines.append(f"| `{fk['constraint_name']}` | `{fk['column_name']}` | `{fk['foreign_table']}` | `{fk['foreign_column']}` | {fk['update_rule']} | {fk['delete_rule']} |")
        lines.append("")

    # Unique
    if tn in uqs_by_table:
        lines.append("#### Unique Constraints\n")
        for uq in uqs_by_table[tn]:
            lines.append(f"- `{uq['constraint_name']}`: `{uq['columns']}`")
        lines.append("")

    # Indexes
    if tn in idxs_by_table:
        lines.append("#### Indexes\n")
        lines.append("| Index | Unique | Primary | Columns |")
        lines.append("|---|---|---|---|")
        for idx in idxs_by_table[tn]:
            u = "✓" if idx["is_unique"] else ""
            p = "✓" if idx["is_primary"] else ""
            lines.append(f"| `{idx['index_name']}` | {u} | {p} | `{idx['columns']}` |")
        lines.append("")

    # RLS
    if tn in policies_by_table:
        lines.append("#### RLS Policies (PostgreSQL-only — NOT transferable to MySQL)\n")
        for pol in policies_by_table[tn]:
            lines.append(f"- **{pol['policyname']}** ({pol['cmd']}, {pol['permissive']})")
        lines.append("")

    lines.append("---\n")

# Sequences
if sequences:
    lines.append("## Sequences\n")
    lines.append("| Sequence | Type | Start | Min | Max | Increment |")
    lines.append("|---|---|---|---|---|---|")
    for seq in sequences:
        lines.append(f"| `{seq['sequence_name']}` | {seq['data_type']} | {seq['start_value']} | {seq['minimum_value']} | {seq['maximum_value']} | {seq['increment']} |")
    lines.append("\n---\n")

if enums_by_name:
    lines.append("## Enum Types\n")
    for name, vals in enums_by_name.items():
        lines.append(f"- **`{name}`**: {', '.join(f'`{v}`' for v in vals)}")
    lines.append("\n---\n")

if views:
    lines.append("## Views\n")
    for v in views:
        lines.append(f"### `{v['view_name']}`\n\n```sql\n{v['view_definition']}\n```\n")
    lines.append("---\n")

if triggers:
    lines.append("## Triggers\n")
    lines.append("| Table | Trigger | Event | Timing | Action |")
    lines.append("|---|---|---|---|---|")
    for tr in triggers:
        action = tr['action_statement'].replace('\n', ' ')[:80]
        lines.append(f"| `{tr['table_name']}` | `{tr['trigger_name']}` | {tr['event_manipulation']} | {tr['action_timing']} | {action} |")
    lines.append("\n---\n")

if functions:
    lines.append("## Functions / Procedures\n")
    lines.append("| Name | Type | Returns |")
    lines.append("|---|---|---|")
    for fn in functions:
        lines.append(f"| `{fn['routine_name']}` | {fn['routine_type']} | {fn['return_type']} |")
    lines.append("")

report_text = "\n".join(lines)
with open(REPORT_FILE, "w", encoding="utf-8") as f:
    f.write(report_text)
print(f"Report written to: {REPORT_FILE}")

# ── save meta JSON ─────────────────────────────────────────────────────────────
meta = {
    "tables":       [{"table_name": tn} for tn in table_names],
    "rowCounts":    row_counts,
    "columns":      cols_by_table,
    "pks":          pks_by_table,
    "fks":          fks_by_table,
    "uqs":          uqs_by_table,
    "indexes":      idxs_by_table,
    "sequences":    sequences,
    "views":        views,
    "triggers":     triggers,
    "policies":     policies_by_table,
    "enums":        enums_by_name,
    "functions":    functions,
    "totalRows":    total_rows,
    "tableCount":   len(table_names),
    "generatedAt":  now_str,
}
with open(META_FILE, "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2, default=str)
print(f"Schema metadata saved: {META_FILE}")
print(f"Done. Tables: {len(table_names)}, Total rows: {total_rows:,}")
