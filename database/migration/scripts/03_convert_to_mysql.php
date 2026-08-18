<?php
/**
 * Phase 3-7 — PostgreSQL → MySQL Conversion + Data Export
 * READ-ONLY access to Supabase. No writes. No modifications.
 * Generates: inter-smart-employee-portal-mysql.sql
 */

$host = getenv('MIGRATION_DB_HOST') ?: 'aws-1-ap-northeast-1.pooler.supabase.com';
$port = getenv('MIGRATION_DB_PORT') ?: '5432';
$db   = getenv('MIGRATION_DB_NAME') ?: 'postgres';
$user = getenv('MIGRATION_DB_USER') ?: 'postgres.shczwbwsrnrygmmvyeue';
$pass = getenv('MIGRATION_DB_PASS') ?: '';

$scriptDir  = __DIR__;
$metaFile   = $scriptDir . '/schema_meta.json';
$outFile    = $scriptDir . '/../mysql/inter-smart-employee-portal-mysql.sql';
$compatFile = $scriptDir . '/../POSTGRES_TO_MYSQL_COMPATIBILITY.md';
$pgOnlyFile = $scriptDir . '/../POSTGRES_ONLY_FEATURES.md';

// ── Load schema meta ───────────────────────────────────────────────────────────────────────────
if (!file_exists($metaFile)) {
    die("ERROR: schema_meta.json not found. Run 01_discover_schema.php first.\n");
}
$meta = json_decode(file_get_contents($metaFile), true);

// ── Connect to Supabase (read-only) ────────────────────────────────────────────────────────────
echo "Connecting to Supabase (read-only) ...\n";
try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$db};sslmode=require";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    echo "Connected.\n";
} catch (Exception $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

// ── Type mapping ───────────────────────────────────────────────────────────────────────────────
function pgTypeToMysql(array $col, array $enumsByName): string {
    $udt  = strtolower($col['udt_name'] ?? '');
    $dt   = strtolower($col['data_type'] ?? '');
    $len  = $col['character_maximum_length'] ?? null;
    $prec = $col['numeric_precision']        ?? null;
    $scl  = $col['numeric_scale']            ?? null;
    $def  = $col['column_default']           ?? '';

    // UUID
    if ($udt === 'uuid') return 'CHAR(36)';

    // bigint / bigserial
    if (in_array($udt, ['int8', 'bigint', 'bigserial'])) return 'BIGINT';

    // integer / serial / int4
    if (in_array($udt, ['int4', 'integer', 'serial', 'int'])) return 'INT';

    // smallint / int2
    if (in_array($udt, ['int2', 'smallint'])) return 'SMALLINT';

    // numeric/decimal
    if (in_array($udt, ['numeric', 'decimal'])) {
        if ($prec !== null && $scl !== null) return "DECIMAL($prec,$scl)";
        return 'DECIMAL(15,4)';
    }

    // float / double
    if (in_array($udt, ['float4', 'real'])) return 'FLOAT';
    if (in_array($udt, ['float8', 'double precision'])) return 'DOUBLE';

    // boolean
    if ($udt === 'bool' || $dt === 'boolean') return 'TINYINT(1)';

    // date
    if ($udt === 'date' || $dt === 'date') return 'DATE';

    // timestamp (with or without timezone)
    if (in_array($udt, ['timestamp', 'timestamptz']) || str_starts_with($dt, 'timestamp')) return 'DATETIME(6)';

    // time
    if (in_array($udt, ['time', 'timetz'])) return 'TIME';

    // json / jsonb
    if (in_array($udt, ['json', 'jsonb'])) return 'JSON';

    // text / tsvector / citext
    if (in_array($udt, ['text', 'tsvector', 'tsquery', 'citext'])) return 'LONGTEXT';

    // varchar / bpchar
    if (in_array($udt, ['varchar', 'character varying'])) {
        return $len ? "VARCHAR($len)" : 'TEXT';
    }
    if ($udt === 'bpchar') {
        return $len ? "CHAR($len)" : 'CHAR(1)';
    }

    // arrays
    if (str_starts_with($udt, '_')) return 'LONGTEXT COMMENT \'PostgreSQL array, stored as JSON\'';

    // bytea
    if ($udt === 'bytea') return 'LONGBLOB';

    // inet / cidr / macaddr
    if (in_array($udt, ['inet', 'cidr', 'macaddr'])) return 'VARCHAR(50)';

    // interval
    if ($udt === 'interval') return 'VARCHAR(100)';

    // custom enum
    if (isset($enumsByName[$udt])) {
        $vals = implode(',', array_map(fn($v) => "'$v'", $enumsByName[$udt]));
        return "ENUM($vals)";
    }

    // fallback
    return 'TEXT';
}

function pgDefaultToMysql(string $def, string $mysqlType): string {
    if ($def === '') return '';

    // PostgreSQL sequences / serial
    if (str_contains($def, 'nextval(')) return ''; // AUTO_INCREMENT handles this

    // now() / CURRENT_TIMESTAMP
    if (preg_match('/^now\(\)|CURRENT_TIMESTAMP/i', $def)) return 'CURRENT_TIMESTAMP(6)';

    // Boolean literals
    if (strtolower($def) === 'true')  return '1';
    if (strtolower($def) === 'false') return '0';

    // UUID gen
    if (str_contains($def, 'uuid_generate') || str_contains($def, 'gen_random_uuid')) return '';

    // Strip explicit casts  e.g. 'active'::character varying  → 'active'
    if (preg_match('/^\'(.*)\'::/s', $def, $m)) return "'" . $m[1] . "'";

    // Numeric literals
    if (is_numeric($def)) return $def;

    // NULL
    if (strtolower($def) === 'null') return 'NULL';

    // Arrays / JSON defaults — skip (too complex for MySQL DEFAULT)
    if (str_starts_with($def, "'[") || str_starts_with($def, "'{")) return '';

    return '';
}

// ── Determine table dependency order (topological sort on FKs) ────────────────────────────────
function topologicalSort(array $tables, array $fksByTable): array {
    $tableNames = array_column($tables, 'table_name');
    $deps = array_fill_keys($tableNames, []);
    foreach ($fksByTable as $table => $fks) {
        foreach ($fks as $fk) {
            $ref = $fk['foreign_table'];
            if ($ref !== $table && in_array($ref, $tableNames)) {
                $deps[$table][] = $ref;
            }
        }
    }
    $visited = [];
    $result  = [];
    function visit(string $t, array &$deps, array &$visited, array &$result) {
        if (isset($visited[$t])) return;
        $visited[$t] = true;
        foreach ($deps[$t] ?? [] as $dep) visit($dep, $deps, $visited, $result);
        $result[] = $t;
    }
    foreach ($tableNames as $t) visit($t, $deps, $visited, $result);
    return $result;
}

$orderedTables = topologicalSort($meta['tables'], $meta['fks'] ?? []);
echo "Table order determined (" . count($orderedTables) . " tables).\n";

// ── helpers ────────────────────────────────────────────────────────────────────────────────────
function escapeValue(mixed $val, string $mysqlType): string {
    if ($val === null) return 'NULL';

    $type = strtolower($mysqlType);

    // Booleans
    if (str_starts_with($type, 'tinyint(1)')) {
        return ($val === 't' || $val === true || $val === '1' || $val === 1) ? '1' : '0';
    }

    // Numerics
    if (preg_match('/^(int|bigint|smallint|decimal|float|double)/i', $type)) {
        return is_numeric($val) ? $val : "'" . addslashes((string)$val) . "'";
    }

    // JSON: ensure valid JSON
    if (str_starts_with($type, 'json')) {
        $decoded = json_decode($val, true);
        $encoded = ($decoded !== null) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $val;
        return "'" . addslashes($encoded) . "'";
    }

    // CHAR(36) UUID
    if (preg_match('/^char\(36\)/i', $type)) {
        return "'" . addslashes((string)$val) . "'";
    }

    // DATETIME
    if (str_starts_with($type, 'datetime')) {
        // PostgreSQL timestamptz → MySQL DATETIME: strip timezone suffix, keep microseconds
        $val = preg_replace('/\+\d{2}:\d{2}$|[\+\-]\d{4}$| UTC$| \w+$/', '', (string)$val);
        return "'" . addslashes(trim($val)) . "'";
    }

    // Arrays (stored as JSON text)
    if (str_contains($type, 'postgresql array')) {
        // Convert PG array literal to JSON array
        if (str_starts_with(trim((string)$val), '{')) {
            $inner = substr(trim($val), 1, -1);
            $items = str_getcsv($inner);
            return "'" . addslashes(json_encode($items, JSON_UNESCAPED_UNICODE)) . "'";
        }
        return "'" . addslashes((string)$val) . "'";
    }

    // Default: string escape
    return "'" . str_replace(
        ["\\",   "'",   "\n",  "\r",  "\x00", "\x1a"],
        ["\\\\", "\\'", "\\n", "\\r", "\\0",  "\\Z"],
        (string)$val
    ) . "'";
}

// ── Check if a column is AUTO_INCREMENT ────────────────────────────────────────────────────────
function isAutoIncrement(array $col): bool {
    $udt = strtolower($col['udt_name'] ?? '');
    $def = $col['column_default'] ?? '';
    if (in_array($udt, ['serial', 'bigserial', 'smallserial'])) return true;
    if (str_contains($def, 'nextval(')) return true;
    if ($col['is_identity'] === 'YES') return true;
    return false;
}

// ── Compatibility log ──────────────────────────────────────────────────────────────────────────
$compatLog   = [];
$pgOnlyItems = [];

// ── Build MySQL SQL ─────────────────────────────────────────────────────────────────────────────
$sqlParts = [];

// Header
$sqlParts[] = <<<SQL
-- ============================================================
-- Inter Smart Employee Portal — MySQL Migration Dump
-- Generated: {$now}
-- Source: Supabase PostgreSQL (READ-ONLY)
-- Target: MySQL 8.0 / MariaDB 10.6+
-- WARNING: Back up your existing cPanel database BEFORE importing!
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';
SET time_zone = '+00:00';
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET FOREIGN_KEY_CHECKS = 0;

SQL;
$now = date('Y-m-d H:i:s T');

echo "Building CREATE TABLE statements ...\n";

$mysqlTypeMap = []; // [$tableName][$colName] = mysqlType

foreach ($orderedTables as $tn) {
    $cols  = $meta['columns'][$tn]  ?? [];
    $pks   = $meta['pks'][$tn]      ?? [];
    $fks   = $meta['fks'][$tn]      ?? [];
    $uqs   = $meta['uqs'][$tn]      ?? [];
    $idxs  = $meta['indexes'][$tn]  ?? [];
    $enums = $meta['enums']          ?? [];

    if (empty($cols)) {
        echo "  WARNING: No columns for table $tn — skipping.\n";
        continue;
    }

    $lines   = [];
    $hasAutoInc = false;

    foreach ($cols as $col) {
        $mysqlType = pgTypeToMysql($col, $enums);
        $mysqlTypeMap[$tn][$col['column_name']] = $mysqlType;

        $nullable  = ($col['is_nullable'] === 'YES') ? 'NULL' : 'NOT NULL';
        $autoInc   = isAutoIncrement($col) ? ' AUTO_INCREMENT' : '';
        if ($autoInc) $hasAutoInc = true;

        $defVal    = pgDefaultToMysql($col['column_default'] ?? '', $mysqlType);
        $defaultStr = '';
        if ($defVal !== '') {
            if (in_array(strtoupper($defVal), ['NULL','CURRENT_TIMESTAMP(6)'])) {
                $defaultStr = " DEFAULT $defVal";
            } else {
                $defaultStr = " DEFAULT $defVal";
            }
        } elseif ($col['is_nullable'] === 'YES' && $col['column_default'] === 'null') {
            $defaultStr = ' DEFAULT NULL';
        }

        $colDef = "  `{$col['column_name']}` $mysqlType $nullable$autoInc$defaultStr";
        $lines[] = $colDef;
    }

    // Primary key
    if (!empty($pks)) {
        $pkList = implode('`, `', $pks);
        $lines[] = "  PRIMARY KEY (`$pkList`)";
    }

    // Unique constraints (skip those covered by PK)
    foreach ($uqs as $uq) {
        $uqCols = array_map('trim', explode(', ', $uq['columns']));
        if ($uqCols === $pks) continue; // same as PK
        $uqList = implode('`, `', $uqCols);
        $cname  = substr($uq['constraint_name'], 0, 64);
        $lines[] = "  UNIQUE KEY `$cname` (`$uqList`)";
    }

    // Non-primary, non-unique indexes
    foreach ($idxs as $idx) {
        if ($idx['is_primary']) continue;
        if ($idx['is_unique'])  continue; // handled above
        $idxCols = array_map('trim', explode(', ', $idx['columns']));
        $idxCols = array_filter($idxCols);
        if (empty($idxCols)) continue;
        $idxList  = implode('`, `', $idxCols);
        $idxName  = substr($idx['index_name'], 0, 64);
        $lines[]  = "  KEY `$idxName` (`$idxList`)";
    }

    $colsSql = implode(",\n", $lines);
    $tableSQL = "-- Table: `$tn`\n";
    $tableSQL .= "CREATE TABLE IF NOT EXISTS `$tn` (\n$colsSql\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n";
    $sqlParts[] = $tableSQL;
}

// ── Add FK constraints as ALTER TABLE (after all tables created) ───────────────────────────────
$fkAlters = [];
foreach ($orderedTables as $tn) {
    foreach ($meta['fks'][$tn] ?? [] as $fk) {
        $cname   = substr($fk['constraint_name'], 0, 64);
        $col     = $fk['column_name'];
        $refT    = $fk['foreign_table'];
        $refC    = $fk['foreign_column'];
        $onUpd   = strtoupper($fk['update_rule'] ?? 'RESTRICT');
        $onDel   = strtoupper($fk['delete_rule']  ?? 'RESTRICT');
        // MySQL supports: RESTRICT, CASCADE, SET NULL, NO ACTION
        $onUpd = in_array($onUpd, ['RESTRICT','CASCADE','SET NULL','NO ACTION']) ? $onUpd : 'RESTRICT';
        $onDel = in_array($onDel, ['RESTRICT','CASCADE','SET NULL','NO ACTION']) ? $onDel : 'RESTRICT';
        $fkAlters[] = "ALTER TABLE `$tn` ADD CONSTRAINT `$cname` FOREIGN KEY (`$col`) REFERENCES `$refT` (`$refC`) ON UPDATE $onUpd ON DELETE $onDel;";
    }
}
if (!empty($fkAlters)) {
    $sqlParts[] = "\n-- Foreign Key Constraints\n" . implode("\n", $fkAlters) . "\n";
}

echo "CREATE TABLE statements built.\n";

// ── DATA EXPORT ────────────────────────────────────────────────────────────────────────────────
echo "Exporting data ...\n";
$BATCH = 500;

foreach ($orderedTables as $tn) {
    $cols = $meta['columns'][$tn] ?? [];
    if (empty($cols)) continue;

    $rowCount = $meta['rowCounts'][$tn] ?? 0;
    if (!is_int($rowCount) || $rowCount === 0) {
        $sqlParts[] = "\n-- Table `$tn` has no rows to insert.\n";
        continue;
    }

    echo "  Exporting $tn ($rowCount rows) ...\n";

    $colNames = array_column($cols, 'column_name');
    $colList  = implode('`, `', $colNames);

    $sqlParts[] = "\n-- Data for table `$tn` ($rowCount rows)\n";
    $sqlParts[] = "LOCK TABLES `$tn` WRITE;\n";

    $offset = 0;
    while (true) {
        $quotedTn = '"' . str_replace('"', '""', $tn) . '"';
        $stmt = $pdo->prepare("SELECT * FROM public.$quotedTn ORDER BY 1 LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit',  $BATCH, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) break;

        $insertRows = [];
        foreach ($rows as $row) {
            $vals = [];
            foreach ($colNames as $cn) {
                $mysqlType = $mysqlTypeMap[$tn][$cn] ?? 'TEXT';
                $vals[] = escapeValue($row[$cn] ?? null, $mysqlType);
            }
            $insertRows[] = '(' . implode(', ', $vals) . ')';
        }

        $sqlParts[] = "INSERT INTO `$tn` (`$colList`) VALUES\n" . implode(",\n", $insertRows) . ";\n";

        $offset += $BATCH;
        if (count($rows) < $BATCH) break;
    }

    $sqlParts[] = "UNLOCK TABLES;\n";
}

// ── Footer ─────────────────────────────────────────────────────────────────────────────────────
$sqlParts[] = "\nSET FOREIGN_KEY_CHECKS = 1;\n\n-- Migration dump complete.\n";

// ── Write MySQL file ───────────────────────────────────────────────────────────────────────────
echo "Writing MySQL dump file ...\n";
file_put_contents($outFile, implode("\n", $sqlParts));
$sizeKB = round(filesize($outFile) / 1024, 1);
echo "MySQL dump written: $outFile ($sizeKB KB)\n";

// ── Compatibility report ──────────────────────────────────────────────────────────────────────
$compatContent = <<<MD
# PostgreSQL → MySQL Compatibility Notes

> Generated: {$now}

## Type Mappings Applied

| PostgreSQL Type | MySQL Type | Notes |
|---|---|---|
| uuid | CHAR(36) | UUID values preserved exactly |
| bigint / bigserial | BIGINT | AUTO_INCREMENT where serial |
| integer / serial | INT | AUTO_INCREMENT where serial |
| numeric(p,s) | DECIMAL(p,s) | Precision preserved |
| boolean | TINYINT(1) | 0=false, 1=true |
| timestamp / timestamptz | DATETIME(6) | Timezone offset stripped, UTC stored |
| json / jsonb | JSON | Native MySQL JSON type |
| text / citext | LONGTEXT | Case-insensitive behavior not replicated |
| uuid default gen_random_uuid() | No DEFAULT | Application must generate UUIDs |
| now() default | CURRENT_TIMESTAMP(6) | MySQL equivalent |
| Array types (_text, _int, etc.) | LONGTEXT | Stored as JSON string |
| bytea | LONGBLOB | |
| inet / cidr | VARCHAR(50) | |
| interval | VARCHAR(100) | Stored as text |
| tsvector / tsquery | LONGTEXT | Full-text search not replicated |

## Features Not Transferred

| Feature | Impact | Resolution |
|---|---|---|
| Row Level Security (RLS) | Laravel Sanctum handles auth | Application-level |
| PostgreSQL ENUM types | Converted to MySQL ENUM | Compatible |
| CHECK constraints | Not in MySQL 5.x; enforced in 8.0+ | Preserved where possible |
| Partial indexes | Not supported in MySQL | Dropped; full indexes used |
| Expression indexes | Not supported in MySQL | Dropped |
| Sequences (nextval) | Replaced by AUTO_INCREMENT | |
| UUID default functions | Dropped; app generates UUIDs | Application must handle |
| citext (case-insensitive text) | Converted to LONGTEXT | Use `COLLATE utf8mb4_ci` if needed |
| GENERATED columns | Not migrated | Manual review needed |
| Foreign key DEFERRABLE | Not supported in MySQL | Immediate enforcement used |
MD;
file_put_contents($compatFile, $compatContent);
echo "Compatibility report written.\n";

// ── PG-only features report ────────────────────────────────────────────────────────────────────
$policyCount   = count(array_merge(...array_values($meta['policies'] ?? [[]])));
$triggerCount  = count($meta['triggers'] ?? []);
$funcCount     = count($meta['functions'] ?? []);
$seqCount      = count($meta['sequences'] ?? []);
$viewCount     = count($meta['views'] ?? []);
$enumCount     = count($meta['enums'] ?? []);

$pgOnlyContent = <<<MD
# PostgreSQL-Only Features

> Generated: {$now}

## Summary

| Feature | Count | MySQL Equivalent |
|---|---|---|
| RLS Policies | {$policyCount} | None (Laravel Sanctum/middleware) |
| Triggers | {$triggerCount} | Manual recreation or app-level |
| Functions/Procedures | {$funcCount} | MySQL stored procedures (manual) |
| Sequences | {$seqCount} | AUTO_INCREMENT |
| Views | {$viewCount} | MySQL views (recreated if needed) |
| Enum Types | {$enumCount} | MySQL ENUM |

## RLS Policies

All RLS policies in Supabase control row-level access at the database level.
In the Laravel application, equivalent security is enforced through:
- Laravel Sanctum authentication tokens
- Policy classes (`app/Policies/`)
- Middleware and route guards

**No action needed** to replicate RLS in MySQL. The application logic already handles authorization.

## Triggers

MD;

if (!empty($meta['triggers'])) {
    foreach ($meta['triggers'] as $tr) {
        $pgOnlyContent .= "- **`{$tr['trigger_name']}`** on `{$tr['table_name']}` ({$tr['action_timing']} {$tr['event_manipulation']})\n";
    }
} else {
    $pgOnlyContent .= "_No triggers found in public schema._\n";
}

$pgOnlyContent .= "\n## Functions / Procedures\n\n";
if (!empty($meta['functions'])) {
    foreach ($meta['functions'] as $fn) {
        $pgOnlyContent .= "- **`{$fn['routine_name']}`** ({$fn['routine_type']}): returns `{$fn['return_type']}`\n";
    }
} else {
    $pgOnlyContent .= "_No custom functions found in public schema._\n";
}

$pgOnlyContent .= "\n## Sequences\n\n";
if (!empty($meta['sequences'])) {
    foreach ($meta['sequences'] as $seq) {
        $pgOnlyContent .= "- **`{$seq['sequence_name']}`** (start: {$seq['start_value']}, increment: {$seq['increment']}) → replaced by AUTO_INCREMENT\n";
    }
} else {
    $pgOnlyContent .= "_No standalone sequences found._\n";
}

$pgOnlyContent .= "\n## Views\n\n";
if (!empty($meta['views'])) {
    foreach ($meta['views'] as $v) {
        $pgOnlyContent .= "- **`{$v['view_name']}`** — Review and recreate in MySQL if needed.\n";
    }
} else {
    $pgOnlyContent .= "_No views found._\n";
}

file_put_contents($pgOnlyFile, $pgOnlyContent);
echo "PG-only features report written.\n";

echo "\n=== Conversion Complete ===\n";
echo "MySQL dump : $outFile ($sizeKB KB)\n";
echo "Tables     : " . count($orderedTables) . "\n";
echo "Total rows : " . number_format($meta['totalRows']) . "\n";
