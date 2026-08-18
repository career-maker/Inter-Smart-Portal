<?php
/**
 * Phase 1 — Supabase Schema Discovery
 * READ-ONLY. No writes. No schema changes. No data modifications.
 * Credentials loaded from environment variables — never printed.
 */

// ── credentials (loaded from env vars set by the caller batch/shell, never echoed) ──────────
$host = getenv('MIGRATION_DB_HOST') ?: 'aws-1-ap-northeast-1.pooler.supabase.com';
$port = getenv('MIGRATION_DB_PORT') ?: '5432';
$db   = getenv('MIGRATION_DB_NAME') ?: 'postgres';
$user = getenv('MIGRATION_DB_USER') ?: 'postgres.shczwbwsrnrygmmvyeue';
$pass = getenv('MIGRATION_DB_PASS') ?: '';

$outputDir  = __DIR__ . '/../';
$reportFile = $outputDir . 'SUPABASE_SCHEMA_REPORT.md';

// ── connect ──────────────────────────────────────────────────────────────────────────────────
echo "Connecting to Supabase (read-only) ...\n";
try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$db};sslmode=require";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE    => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT    => 30,
    ]);
    // Enforce read-only via SET SESSION
    $pdo->exec("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    echo "Connected.\n";
} catch (Exception $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────
function query(PDO $pdo, string $sql, array $params = []): array {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// ── 1. all tables + row counts ────────────────────────────────────────────────────────────────
echo "Fetching tables ...\n";
$tables = query($pdo, "
    SELECT
        t.table_name,
        obj_description((quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))::regclass::oid, 'pg_class') AS table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type   = 'BASE TABLE'
    ORDER BY t.table_name
");

$tableRowCounts = [];
foreach ($tables as $t) {
    $tn = $t['table_name'];
    try {
        $cnt = query($pdo, "SELECT COUNT(*) AS cnt FROM public.\"$tn\"");
        $tableRowCounts[$tn] = (int)($cnt[0]['cnt'] ?? 0);
    } catch (Exception $e) {
        $tableRowCounts[$tn] = 'ERROR: ' . $e->getMessage();
    }
}
echo count($tables) . " tables found.\n";

// ── 2. columns ────────────────────────────────────────────────────────────────────────────────
echo "Fetching columns ...\n";
$columns = query($pdo, "
    SELECT
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        c.udt_name,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        c.is_identity,
        c.identity_generation
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
");

$colsByTable = [];
foreach ($columns as $col) {
    $colsByTable[$col['table_name']][] = $col;
}

// ── 3. primary keys ───────────────────────────────────────────────────────────────────────────
echo "Fetching primary keys ...\n";
$pks = query($pdo, "
    SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema    = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position
");
$pksByTable = [];
foreach ($pks as $pk) {
    $pksByTable[$pk['table_name']][] = $pk['column_name'];
}

// ── 4. foreign keys ───────────────────────────────────────────────────────────────────────────
echo "Fetching foreign keys ...\n";
$fks = query($pdo, "
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name  AS foreign_table,
        ccu.column_name AS foreign_column,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema    = tc.table_schema
    JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
    ORDER BY tc.table_name
");
$fksByTable = [];
foreach ($fks as $fk) {
    $fksByTable[$fk['table_name']][] = $fk;
}

// ── 5. unique constraints ─────────────────────────────────────────────────────────────────────
echo "Fetching unique constraints ...\n";
$uqs = query($pdo, "
    SELECT
        tc.table_name,
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema    = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name
");
$uqsByTable = [];
foreach ($uqs as $uq) {
    $uqsByTable[$uq['table_name']][] = $uq;
}

// ── 6. indexes ────────────────────────────────────────────────────────────────────────────────
echo "Fetching indexes ...\n";
$idxs = query($pdo, "
    SELECT
        t.relname   AS table_name,
        i.relname   AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') AS columns,
        pg_get_indexdef(ix.indexrelid) AS index_def
    FROM pg_class t
    JOIN pg_index  ix ON t.oid       = ix.indrelid
    JOIN pg_class  i  ON i.oid       = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid      = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relkind = 'r'
    GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary, ix.indexrelid
    ORDER BY t.relname, i.relname
");
$idxsByTable = [];
foreach ($idxs as $idx) {
    $idxsByTable[$idx['table_name']][] = $idx;
}

// ── 7. sequences ─────────────────────────────────────────────────────────────────────────────
echo "Fetching sequences ...\n";
$seqs = query($pdo, "
    SELECT
        s.sequence_name,
        s.data_type,
        s.start_value,
        s.minimum_value,
        s.maximum_value,
        s.increment
    FROM information_schema.sequences s
    WHERE s.sequence_schema = 'public'
    ORDER BY s.sequence_name
");

// ── 8. views ──────────────────────────────────────────────────────────────────────────────────
echo "Fetching views ...\n";
$views = query($pdo, "
    SELECT table_name AS view_name,
           view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
");

// ── 9. triggers ───────────────────────────────────────────────────────────────────────────────
echo "Fetching triggers ...\n";
$triggers = query($pdo, "
    SELECT
        trigger_name,
        event_object_table AS table_name,
        event_manipulation,
        action_timing,
        action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
");

// ── 10. RLS policies ─────────────────────────────────────────────────────────────────────────
echo "Fetching RLS policies ...\n";
$policies = query($pdo, "
    SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
");
$policiesByTable = [];
foreach ($policies as $pol) {
    $policiesByTable[$pol['tablename']][] = $pol;
}

// ── 11. enum types ────────────────────────────────────────────────────────────────────────────
echo "Fetching enum types ...\n";
$enums = query($pdo, "
    SELECT
        t.typname AS enum_name,
        e.enumlabel AS enum_value,
        e.enumsortorder AS sort_order
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
");
$enumsByName = [];
foreach ($enums as $ev) {
    $enumsByName[$ev['enum_name']][] = $ev['enum_value'];
}

// ── 12. functions/procedures ──────────────────────────────────────────────────────────────────
echo "Fetching functions ...\n";
$functions = query($pdo, "
    SELECT
        routine_name,
        routine_type,
        data_type AS return_type,
        routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name
");

// ── generate report ───────────────────────────────────────────────────────────────────────────
echo "Generating report ...\n";

$totalRows = array_sum(array_filter($tableRowCounts, 'is_int'));

ob_start();

$now = date('Y-m-d H:i:s T');
echo "# Supabase Schema Report — Inter Smart Employee Portal\n\n";
echo "> **Generated**: $now  \n";
echo "> **Source**: Supabase PostgreSQL (READ-ONLY, no data was modified)  \n";
echo "> **Tables found**: " . count($tables) . "  \n";
echo "> **Total rows**: " . number_format($totalRows) . "  \n\n";
echo "---\n\n";

// Summary table
echo "## Table Summary\n\n";
echo "| Table | Row Count |\n";
echo "|---|---|\n";
foreach ($tables as $t) {
    $tn  = $t['table_name'];
    $cnt = isset($tableRowCounts[$tn]) ? $tableRowCounts[$tn] : '?';
    echo "| `$tn` | " . (is_int($cnt) ? number_format($cnt) : $cnt) . " |\n";
}
echo "\n---\n\n";

// Per-table details
echo "## Table Details\n\n";
foreach ($tables as $t) {
    $tn  = $t['table_name'];
    $cnt = $tableRowCounts[$tn] ?? '?';
    echo "### `$tn`\n\n";
    echo "**Row count**: " . (is_int($cnt) ? number_format($cnt) : $cnt) . "\n\n";

    // Columns
    echo "#### Columns\n\n";
    echo "| # | Column | PG Type | Nullable | Default | Identity | PK |\n";
    echo "|---|---|---|---|---|---|---|\n";
    $pkCols = $pksByTable[$tn] ?? [];
    foreach ($colsByTable[$tn] ?? [] as $col) {
        $pgType = $col['udt_name'] ?: $col['data_type'];
        if ($col['character_maximum_length']) $pgType .= "({$col['character_maximum_length']})";
        elseif ($col['numeric_precision'] && $col['numeric_scale'] !== null)
            $pgType .= "({$col['numeric_precision']},{$col['numeric_scale']})";
        $isPk  = in_array($col['column_name'], $pkCols) ? '✓' : '';
        $isId  = $col['is_identity'] === 'YES' ? 'YES (' . $col['identity_generation'] . ')' : '';
        echo "| {$col['ordinal_position']} | `{$col['column_name']}` | `{$pgType}` | {$col['is_nullable']} | " .
             ($col['column_default'] ? '`' . str_replace('|','\\|',$col['column_default']) . '`' : '') .
             " | $isId | $isPk |\n";
    }
    echo "\n";

    // PK
    if (!empty($pkCols)) {
        echo "**Primary Key**: `" . implode(', ', $pkCols) . "`\n\n";
    }

    // FKs
    if (!empty($fksByTable[$tn])) {
        echo "#### Foreign Keys\n\n";
        echo "| Constraint | Column | → Table | → Column | On Update | On Delete |\n";
        echo "|---|---|---|---|---|---|\n";
        foreach ($fksByTable[$tn] as $fk) {
            echo "| `{$fk['constraint_name']}` | `{$fk['column_name']}` | `{$fk['foreign_table']}` | `{$fk['foreign_column']}` | {$fk['update_rule']} | {$fk['delete_rule']} |\n";
        }
        echo "\n";
    }

    // Unique
    if (!empty($uqsByTable[$tn])) {
        echo "#### Unique Constraints\n\n";
        foreach ($uqsByTable[$tn] as $uq) {
            echo "- `{$uq['constraint_name']}`: `{$uq['columns']}`\n";
        }
        echo "\n";
    }

    // Indexes
    if (!empty($idxsByTable[$tn])) {
        echo "#### Indexes\n\n";
        echo "| Index | Unique | Primary | Columns |\n";
        echo "|---|---|---|---|\n";
        foreach ($idxsByTable[$tn] as $idx) {
            $u = $idx['is_unique'] ? '✓' : '';
            $p = $idx['is_primary'] ? '✓' : '';
            echo "| `{$idx['index_name']}` | $u | $p | `{$idx['columns']}` |\n";
        }
        echo "\n";
    }

    // RLS
    if (!empty($policiesByTable[$tn])) {
        echo "#### RLS Policies (PostgreSQL-only — NOT transferable to MySQL)\n\n";
        foreach ($policiesByTable[$tn] as $pol) {
            echo "- **{$pol['policyname']}** ({$pol['cmd']}, {$pol['permissive']})\n";
        }
        echo "\n";
    }

    echo "---\n\n";
}

// Sequences
if (!empty($seqs)) {
    echo "## Sequences\n\n";
    echo "| Sequence | Type | Start | Min | Max | Increment |\n";
    echo "|---|---|---|---|---|---|\n";
    foreach ($seqs as $seq) {
        echo "| `{$seq['sequence_name']}` | {$seq['data_type']} | {$seq['start_value']} | {$seq['minimum_value']} | {$seq['maximum_value']} | {$seq['increment']} |\n";
    }
    echo "\n---\n\n";
}

// Enum types
if (!empty($enumsByName)) {
    echo "## Enum Types\n\n";
    foreach ($enumsByName as $name => $vals) {
        echo "- **`$name`**: " . implode(', ', array_map(fn($v) => "`$v`", $vals)) . "\n";
    }
    echo "\n---\n\n";
}

// Views
if (!empty($views)) {
    echo "## Views\n\n";
    foreach ($views as $v) {
        echo "### `{$v['view_name']}`\n\n";
        echo "```sql\n{$v['view_definition']}\n```\n\n";
    }
    echo "---\n\n";
}

// Triggers
if (!empty($triggers)) {
    echo "## Triggers\n\n";
    echo "| Table | Trigger | Event | Timing | Action |\n";
    echo "|---|---|---|---|---|\n";
    foreach ($triggers as $tr) {
        echo "| `{$tr['table_name']}` | `{$tr['trigger_name']}` | {$tr['event_manipulation']} | {$tr['action_timing']} | " .
             str_replace(["\n","  "], ' ', substr($tr['action_statement'], 0, 80)) . " |\n";
    }
    echo "\n---\n\n";
}

// Functions
if (!empty($functions)) {
    echo "## Functions / Procedures\n\n";
    echo "| Name | Type | Returns |\n";
    echo "|---|---|---|\n";
    foreach ($functions as $fn) {
        echo "| `{$fn['routine_name']}` | {$fn['routine_type']} | {$fn['return_type']} |\n";
    }
    echo "\n---\n\n";
}

$report = ob_get_clean();
file_put_contents($reportFile, $report);
echo "Report written to: $reportFile\n";

// Also export raw data as JSON for later use by conversion script
$meta = [
    'tables'      => $tables,
    'rowCounts'   => $tableRowCounts,
    'columns'     => $colsByTable,
    'pks'         => $pksByTable,
    'fks'         => $fksByTable,
    'uqs'         => $uqsByTable,
    'indexes'     => $idxsByTable,
    'sequences'   => $seqs,
    'views'       => $views,
    'triggers'    => $triggers,
    'policies'    => $policiesByTable,
    'enums'       => $enumsByName,
    'functions'   => $functions,
    'totalRows'   => $totalRows,
    'tableCount'  => count($tables),
];
file_put_contents(__DIR__ . '/schema_meta.json', json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Schema metadata saved to scripts/schema_meta.json\n";
echo "Done. Tables: " . count($tables) . ", Total rows: " . number_format($totalRows) . "\n";
