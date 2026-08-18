#!/usr/bin/env python3
"""
Phase 3-7 — PostgreSQL → MySQL Conversion + Data Export
READ-ONLY access to Supabase. Generates MySQL dump + compatibility docs.
"""

import os, sys, json, re
from datetime import datetime, timezone

DB_HOST = os.environ.get("MIGRATION_DB_HOST", "aws-1-ap-northeast-1.pooler.supabase.com")
DB_PORT = int(os.environ.get("MIGRATION_DB_PORT", "5432"))
DB_NAME = os.environ.get("MIGRATION_DB_NAME", "postgres")
DB_USER = os.environ.get("MIGRATION_DB_USER", "postgres.shczwbwsrnrygmmvyeue")
DB_PASS = os.environ.get("MIGRATION_DB_PASS", "")

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
META_FILE    = os.path.join(SCRIPT_DIR, "schema_meta.json")
OUT_FILE     = os.path.join(SCRIPT_DIR, "..", "mysql", "inter-smart-employee-portal-mysql.sql")
COMPAT_FILE  = os.path.join(SCRIPT_DIR, "..", "POSTGRES_TO_MYSQL_COMPATIBILITY.md")
PGONLY_FILE  = os.path.join(SCRIPT_DIR, "..", "POSTGRES_ONLY_FEATURES.md")

if not os.path.exists(META_FILE):
    sys.exit("ERROR: schema_meta.json not found. Run 01_discover_schema.py first.")

with open(META_FILE, encoding="utf-8") as f:
    meta = json.load(f)

try:
    import psycopg2, psycopg2.extras
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "--quiet"])
    import psycopg2, psycopg2.extras

print("Connecting to Supabase (read-only) ...")
conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
    user=DB_USER, password=DB_PASS, sslmode="require",
    options="-c default_transaction_read_only=on"
)
conn.set_session(readonly=True)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
print("Connected.")

# ── Type mapping ──────────────────────────────────────────────────────────────
def pg_to_mysql(col, enums):
    udt   = (col.get("udt_name") or "").lower()
    dt    = (col.get("data_type") or "").lower()
    maxl  = col.get("character_maximum_length")
    prec  = col.get("numeric_precision")
    scale = col.get("numeric_scale")

    if udt == "uuid":                        return "CHAR(36)"
    if udt in ("int8", "bigint", "bigserial"): return "BIGINT"
    if udt in ("int4", "integer", "serial", "int"): return "INT"
    if udt in ("int2", "smallint"):          return "SMALLINT"
    if udt in ("numeric", "decimal"):
        if prec is not None and scale is not None: return f"DECIMAL({prec},{scale})"
        return "DECIMAL(15,4)"
    if udt in ("float4", "real"):            return "FLOAT"
    if udt in ("float8",):                   return "DOUBLE"
    if udt in ("bool",) or dt == "boolean":  return "TINYINT(1)"
    if udt == "date" or dt == "date":        return "DATE"
    if udt in ("timestamp", "timestamptz") or dt.startswith("timestamp"): return "DATETIME(6)"
    if udt in ("time", "timetz"):            return "TIME"
    if udt in ("json", "jsonb"):             return "JSON"
    if udt in ("text", "tsvector", "tsquery", "citext"): return "LONGTEXT"
    if udt in ("varchar", "character varying"):
        return f"VARCHAR({maxl})" if maxl else "TEXT"
    if udt == "bpchar":
        return f"CHAR({maxl})" if maxl else "CHAR(1)"
    if udt.startswith("_"):                  return "LONGTEXT COMMENT 'PG array as JSON'"
    if udt == "bytea":                       return "LONGBLOB"
    if udt in ("inet", "cidr", "macaddr"):   return "VARCHAR(50)"
    if udt == "interval":                    return "VARCHAR(100)"
    if udt in enums:
        vals = ", ".join(f"'{v}'" for v in enums[udt])
        return f"ENUM({vals})"
    return "TEXT"

def pg_default_to_mysql(default, mysql_type):
    if not default:
        return ""
    if "nextval(" in default or "identity" in default.lower():
        return ""
    if re.match(r"^now\(\)|CURRENT_TIMESTAMP", default, re.IGNORECASE):
        return "CURRENT_TIMESTAMP(6)"
    if default.lower() == "true":  return "1"
    if default.lower() == "false": return "0"
    if "uuid_generate" in default or "gen_random_uuid" in default:
        return ""
    # Strip PG cast: 'value'::type
    m = re.match(r"^'(.*)'::.*$", default, re.DOTALL)
    if m:
        return f"'{m.group(1)}'"
    if re.match(r"^-?\d+(\.\d+)?$", default):
        return default
    if default.lower() == "null":
        return "NULL"
    if default.startswith("'[") or default.startswith("'{"):
        return ""
    return ""

def is_auto_increment(col):
    udt = (col.get("udt_name") or "").lower()
    default = col.get("column_default") or ""
    if udt in ("serial", "bigserial", "smallserial"):
        return True
    if "nextval(" in default:
        return True
    if col.get("is_identity") == "YES":
        return True
    return False

# ── Topological sort ──────────────────────────────────────────────────────────
def topological_sort(table_names, fks_by_table):
    deps = {t: [] for t in table_names}
    name_set = set(table_names)
    for table, fks in fks_by_table.items():
        for fk in fks:
            ref = fk.get("foreign_table", "")
            if ref != table and ref in name_set:
                deps.setdefault(table, []).append(ref)
    visited = set()
    result = []
    def visit(t):
        if t in visited: return
        visited.add(t)
        for dep in deps.get(t, []):
            visit(dep)
        result.append(t)
    for t in table_names:
        visit(t)
    return result

table_names = [t["table_name"] for t in meta["tables"]]
ordered = topological_sort(table_names, meta.get("fks", {}))
enums   = meta.get("enums", {})

# ── Build type map ────────────────────────────────────────────────────────────
mysql_type_map = {}
for tn, cols in meta.get("columns", {}).items():
    mysql_type_map[tn] = {}
    for col in cols:
        mysql_type_map[tn][col["column_name"]] = pg_to_mysql(col, enums)

# ── Escape value ──────────────────────────────────────────────────────────────
def escape_value(val, mysql_type):
    if val is None:
        return "NULL"
    mtype = mysql_type.lower()

    if mtype.startswith("tinyint(1)"):
        return "1" if str(val).lower() in ("t", "true", "1", "yes") else "0"

    if re.match(r"^(int|bigint|smallint|decimal|float|double)", mtype):
        try:
            float(str(val))
            return str(val)
        except:
            pass

    if mtype.startswith("json"):
        try:
            if isinstance(val, str):
                parsed = json.loads(val)
                val = json.dumps(parsed, ensure_ascii=False)
            else:
                val = json.dumps(val, ensure_ascii=False)
        except:
            val = str(val)
        return "'" + val.replace("\\", "\\\\").replace("'", "\\'") + "'"

    if mtype.startswith("datetime"):
        val = str(val)
        val = re.sub(r'\+\d{2}:\d{2}$|[\+\-]\d{4}$| UTC$', '', val).strip()
        # PostgreSQL timestamptz comes as Python datetime with tzinfo
        return "'" + val.replace("'", "\\'") + "'"

    if "pg array" in mtype or "array" in mtype:
        # Convert PG array literal {a,b,c} → JSON ["a","b","c"]
        val = str(val)
        if val.startswith("{") and val.endswith("}"):
            inner = val[1:-1]
            import csv, io
            items = next(csv.reader(io.StringIO(inner)))
            val = json.dumps(items, ensure_ascii=False)
        return "'" + val.replace("\\", "\\\\").replace("'", "\\'") + "'"

    # Default: string escape
    val = str(val)
    val = val.replace("\\", "\\\\")
    val = val.replace("'", "\\'")
    val = val.replace("\n", "\\n")
    val = val.replace("\r", "\\r")
    val = val.replace("\x00", "\\0")
    return f"'{val}'"

# ── Build SQL ─────────────────────────────────────────────────────────────────
print("Building CREATE TABLE statements ...")
now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

parts = []
parts.append(f"""-- ============================================================
-- Inter Smart Employee Portal — MySQL Migration Dump
-- Generated: {now_str}
-- Source: Supabase PostgreSQL (READ-ONLY)
-- Target: MySQL 8.0 / MariaDB 10.6+
-- WARNING: BACK UP YOUR EXISTING cPanel DATABASE BEFORE IMPORTING!
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';
SET time_zone = '+00:00';
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET FOREIGN_KEY_CHECKS = 0;
""")

for tn in ordered:
    cols = meta["columns"].get(tn, [])
    if not cols:
        print(f"  WARNING: No columns for {tn} — skipping.")
        continue

    pk_cols = meta["pks"].get(tn, [])
    uqs     = meta["uqs"].get(tn, [])
    idxs    = meta["indexes"].get(tn, [])

    col_defs = []
    for col in cols:
        mtype    = mysql_type_map[tn][col["column_name"]]
        nullable = "NULL" if col["is_nullable"] == "YES" else "NOT NULL"
        auto_inc = " AUTO_INCREMENT" if is_auto_increment(col) else ""
        default  = pg_default_to_mysql(col.get("column_default") or "", mtype)

        default_str = ""
        if default:
            if default in ("NULL", "CURRENT_TIMESTAMP(6)"):
                default_str = f" DEFAULT {default}"
            else:
                default_str = f" DEFAULT {default}"

        col_defs.append(f"  `{col['column_name']}` {mtype} {nullable}{auto_inc}{default_str}")

    if pk_cols:
        pk_list = "`, `".join(pk_cols)
        col_defs.append(f"  PRIMARY KEY (`{pk_list}`)")

    for uq in uqs:
        uq_cols = [c.strip() for c in uq["columns"].split(",")]
        if uq_cols == pk_cols:
            continue
        uq_list = "`, `".join(uq_cols)
        cname   = uq["constraint_name"][:64]
        col_defs.append(f"  UNIQUE KEY `{cname}` (`{uq_list}`)")

    for idx in idxs:
        if idx["is_primary"] or idx["is_unique"]:
            continue
        idx_cols = [c.strip() for c in idx["columns"].split(",") if c.strip()]
        if not idx_cols:
            continue
        idx_list = "`, `".join(idx_cols)
        idx_name = idx["index_name"][:64]
        col_defs.append(f"  KEY `{idx_name}` (`{idx_list}`)")

    cols_sql = ",\n".join(col_defs)
    parts.append(f"-- Table: `{tn}`\nCREATE TABLE IF NOT EXISTS `{tn}` (\n{cols_sql}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n")

# FK ALTERs
fk_alters = []
for tn in ordered:
    for fk in meta.get("fks", {}).get(tn, []):
        cname  = fk["constraint_name"][:64]
        col    = fk["column_name"]
        ref_t  = fk["foreign_table"]
        ref_c  = fk["foreign_column"]
        on_upd = (fk.get("update_rule") or "RESTRICT").upper()
        on_del = (fk.get("delete_rule")  or "RESTRICT").upper()
        allowed = {"RESTRICT", "CASCADE", "SET NULL", "NO ACTION"}
        on_upd = on_upd if on_upd in allowed else "RESTRICT"
        on_del = on_del if on_del in allowed else "RESTRICT"
        fk_alters.append(
            f"ALTER TABLE `{tn}` ADD CONSTRAINT `{cname}` "
            f"FOREIGN KEY (`{col}`) REFERENCES `{ref_t}` (`{ref_c}`) "
            f"ON UPDATE {on_upd} ON DELETE {on_del};"
        )

if fk_alters:
    parts.append("\n-- Foreign Key Constraints\n" + "\n".join(fk_alters) + "\n")

print("CREATE TABLE statements built.")

# ── Data export ────────────────────────────────────────────────────────────────
print("Exporting data ...")
BATCH = 500

for tn in ordered:
    cols = meta["columns"].get(tn, [])
    if not cols:
        continue
    row_count = meta["rowCounts"].get(tn, 0)
    if not isinstance(row_count, int) or row_count == 0:
        parts.append(f"\n-- Table `{tn}` has no rows.\n")
        continue

    print(f"  Exporting {tn} ({row_count:,} rows) ...")
    col_names = [c["column_name"] for c in cols]
    col_list  = "`, `".join(col_names)

    parts.append(f"\n-- Data for table `{tn}` ({row_count:,} rows)")
    parts.append(f"LOCK TABLES `{tn}` WRITE;")

    offset = 0
    while True:
        try:
            cur.execute(f'SELECT * FROM public."{tn}" ORDER BY 1 LIMIT %s OFFSET %s', (BATCH, offset))
        except Exception as e:
            conn.rollback()
            parts.append(f"-- ERROR exporting {tn} at offset {offset}: {e}")
            print(f"    ERROR at offset {offset}: {e}")
            break
        rows = cur.fetchall()
        if not rows:
            break

        insert_rows = []
        for row in rows:
            row = dict(row)
            vals = []
            for cn in col_names:
                mtype = mysql_type_map.get(tn, {}).get(cn, "TEXT")
                vals.append(escape_value(row.get(cn), mtype))
            insert_rows.append("(" + ", ".join(vals) + ")")

        parts.append(f"INSERT INTO `{tn}` (`{col_list}`) VALUES\n" + ",\n".join(insert_rows) + ";")
        offset += BATCH
        if len(rows) < BATCH:
            break

    parts.append("UNLOCK TABLES;")

parts.append("\nSET FOREIGN_KEY_CHECKS = 1;\n\n-- Migration dump complete.\n")

cur.close()
conn.close()

# ── Write MySQL file ───────────────────────────────────────────────────────────
print("Writing MySQL dump file ...")
os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(parts))

size_kb = os.path.getsize(OUT_FILE) / 1024
print(f"MySQL dump written: {OUT_FILE} ({size_kb:.1f} KB)")

# ── Compatibility report ───────────────────────────────────────────────────────
compat_text = f"""# PostgreSQL → MySQL Compatibility Notes

> Generated: {now_str}

## Type Mappings Applied

| PostgreSQL Type | MySQL Type | Notes |
|---|---|---|
| uuid | CHAR(36) | UUID values preserved exactly |
| bigint / bigserial | BIGINT | AUTO_INCREMENT where serial |
| integer / serial | INT | AUTO_INCREMENT where serial |
| smallint | SMALLINT | |
| numeric(p,s) | DECIMAL(p,s) | Precision preserved |
| boolean | TINYINT(1) | 0=false, 1=true |
| timestamp / timestamptz | DATETIME(6) | Timezone offset stripped, UTC stored |
| json / jsonb | JSON | Native MySQL JSON type |
| text / citext | LONGTEXT | Case-insensitive behavior not replicated |
| varchar(n) | VARCHAR(n) | |
| uuid default gen_random_uuid() | No DEFAULT | Application must generate UUIDs |
| now() default | CURRENT_TIMESTAMP(6) | MySQL equivalent |
| Array types (_text, _int4, etc.) | LONGTEXT | Stored as JSON string |
| bytea | LONGBLOB | |
| inet / cidr | VARCHAR(50) | |
| interval | VARCHAR(100) | Stored as text |
| tsvector / tsquery | LONGTEXT | Full-text search not replicated |

## Features Not Transferred

| Feature | Impact | Resolution |
|---|---|---|
| Row Level Security (RLS) | Laravel Sanctum handles auth | Application-level |
| PostgreSQL ENUM types | Converted to MySQL ENUM | Compatible |
| CHECK constraints | Limited in MySQL < 8.0.16 | Preserved where possible |
| Partial indexes | Not supported in MySQL | Dropped; full indexes used |
| Expression indexes | Not supported in MySQL | Dropped |
| Sequences (nextval) | Replaced by AUTO_INCREMENT | |
| UUID default functions | Dropped; app generates UUIDs | Application must handle |
| citext (case-insensitive text) | Converted to LONGTEXT | Use `COLLATE utf8mb4_ci` if needed |
| GENERATED columns | Not migrated | Manual review needed |
| Foreign key DEFERRABLE | Not supported in MySQL | Immediate enforcement used |
| pg_trgm (fuzzy search) | Not supported in MySQL | Use FULLTEXT if needed |
"""
with open(COMPAT_FILE, "w", encoding="utf-8") as f:
    f.write(compat_text)
print("Compatibility report written.")

# ── PG-only features report ────────────────────────────────────────────────────
policy_count  = sum(len(v) for v in meta.get("policies", {}).values())
trigger_count = len(meta.get("triggers", []))
func_count    = len(meta.get("functions", []))
seq_count     = len(meta.get("sequences", []))
view_count    = len(meta.get("views", []))
enum_count    = len(meta.get("enums", {}))

pgonly_lines = [f"""# PostgreSQL-Only Features

> Generated: {now_str}

## Summary

| Feature | Count | MySQL Equivalent |
|---|---|---|
| RLS Policies | {policy_count} | None (Laravel Sanctum/middleware) |
| Triggers | {trigger_count} | Manual recreation or app-level |
| Functions/Procedures | {func_count} | MySQL stored procedures (manual) |
| Sequences | {seq_count} | AUTO_INCREMENT |
| Views | {view_count} | MySQL views (recreated if needed) |
| Enum Types | {enum_count} | MySQL ENUM |

## RLS Policies

All RLS policies control row-level access at the PostgreSQL level.
In Laravel, equivalent security is enforced through Sanctum tokens,
Policy classes, middleware, and route guards.

## Triggers
"""]

triggers = meta.get("triggers", [])
if triggers:
    for tr in triggers:
        pgonly_lines.append(f"- **`{tr['trigger_name']}`** on `{tr['table_name']}` ({tr['action_timing']} {tr['event_manipulation']})")
else:
    pgonly_lines.append("_No triggers found in public schema._")

pgonly_lines.append("\n## Functions / Procedures\n")
functions = meta.get("functions", [])
if functions:
    for fn in functions:
        pgonly_lines.append(f"- **`{fn['routine_name']}`** ({fn['routine_type']}): returns `{fn['return_type']}`")
else:
    pgonly_lines.append("_No custom functions found in public schema._")

pgonly_lines.append("\n## Sequences\n")
sequences = meta.get("sequences", [])
if sequences:
    for seq in sequences:
        pgonly_lines.append(f"- **`{seq['sequence_name']}`** (start: {seq['start_value']}, inc: {seq['increment']}) → replaced by AUTO_INCREMENT")
else:
    pgonly_lines.append("_No standalone sequences found._")

pgonly_lines.append("\n## Views\n")
views = meta.get("views", [])
if views:
    for v in views:
        pgonly_lines.append(f"- **`{v['view_name']}`** — Review and recreate in MySQL if needed.")
else:
    pgonly_lines.append("_No views found._")

with open(PGONLY_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(pgonly_lines))
print("PG-only features report written.")

print(f"\n=== Conversion Complete ===")
print(f"MySQL dump  : {OUT_FILE} ({size_kb:.1f} KB)")
print(f"Tables      : {len(ordered)}")
print(f"Total rows  : {meta.get('totalRows', 0):,}")
