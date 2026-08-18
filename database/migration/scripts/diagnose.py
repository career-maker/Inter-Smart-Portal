"""
Re-export cache and sessions tables with better escaping
and check their structure
"""
import os, sys, json, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DB_HOST = "aws-1-ap-northeast-1.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = os.environ.get("MIGRATION_DB_USER", "postgres.shczwbwsrnrygmmvyeue")
DB_PASS = os.environ.get("MIGRATION_DB_PASS", "")

import psycopg2, psycopg2.extras

conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
    user=DB_USER, password=DB_PASS, sslmode="require",
    options="-c default_transaction_read_only=on"
)
conn.set_session(readonly=True)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

for tn in ['cache', 'sessions']:
    cur.execute(f'SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=%s ORDER BY ordinal_position', (tn,))
    cols = cur.fetchall()
    print(f"\n=== {tn} columns ===")
    for c in cols:
        print(f"  {c['column_name']}: {c['data_type']} ({c['udt_name']})")

    cur.execute(f'SELECT COUNT(*) FROM public."{tn}"')
    count = cur.fetchone()["count"]
    print(f"  Row count: {count}")

    cur.execute(f'SELECT * FROM public."{tn}" LIMIT 1')
    row = cur.fetchone()
    if row:
        for k, v in dict(row).items():
            val_repr = repr(str(v))[:120] if v else "NULL"
            print(f"  {k}: {val_repr}")

cur.close()
conn.close()
