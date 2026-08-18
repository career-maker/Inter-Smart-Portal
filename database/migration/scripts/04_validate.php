<?php
/**
 * Phase 8 — Static Validation of MySQL Dump
 * Verifies structure without running MySQL locally.
 * Compares row counts between schema_meta.json (Supabase) and INSERT counts in the MySQL dump.
 */

$scriptDir  = __DIR__;
$metaFile   = $scriptDir . '/schema_meta.json';
$mysqlDump  = $scriptDir . '/../mysql/inter-smart-employee-portal-mysql.sql';
$reportFile = $scriptDir . '/../MIGRATION_VALIDATION_REPORT.md';

if (!file_exists($metaFile)) {
    die("ERROR: schema_meta.json not found. Run 01_discover_schema.php first.\n");
}
if (!file_exists($mysqlDump)) {
    die("ERROR: MySQL dump not found. Run 03_convert_to_mysql.php first.\n");
}

$meta     = json_decode(file_get_contents($metaFile), true);
$dumpText = file_get_contents($mysqlDump);

echo "Validating MySQL dump ...\n";

$validationRows = [];
$issues = [];

$tableNames = array_column($meta['tables'], 'table_name');
foreach ($tableNames as $tn) {
    $sourceCount = $meta['rowCounts'][$tn] ?? 0;

    // Count INSERT statements for this table
    $mysqlCount = 0;
    // Each INSERT INTO `table` VALUES\n(...),(...);\n — count via regex
    $pattern = '/^INSERT INTO `' . preg_quote($tn, '/') . '` .+?VALUES\s*\n(.*?);/ms';
    if (preg_match_all($pattern, $dumpText, $matches)) {
        foreach ($matches[1] as $valueBlock) {
            // Count tuples — each row starts with '('
            $rows = preg_match_all('/^\(/m', $valueBlock);
            $mysqlCount += $rows;
        }
    }

    $diff   = is_int($sourceCount) ? ($mysqlCount - $sourceCount) : 'N/A';
    $status = ($diff === 0) ? '✅ OK' : ($diff === 'N/A' ? '⚠️ N/A' : '❌ MISMATCH');

    if ($diff !== 0 && $diff !== 'N/A') {
        $issues[] = "Row count mismatch for `$tn`: source=$sourceCount, mysql=$mysqlCount";
    }

    $validationRows[$tn] = [
        'source' => is_int($sourceCount) ? number_format($sourceCount) : $sourceCount,
        'mysql'  => number_format($mysqlCount),
        'diff'   => $diff,
        'status' => $status,
    ];
}

// Structural checks
$tablePattern = '/^CREATE TABLE IF NOT EXISTS `(\w+)`/m';
preg_match_all($tablePattern, $dumpText, $createdTables);
$createdSet = array_flip($createdTables[1]);

$missingTables = [];
foreach ($tableNames as $tn) {
    if (!isset($createdSet[$tn])) {
        $missingTables[] = $tn;
    }
}

$fkCount = preg_match_all('/ADD CONSTRAINT.*FOREIGN KEY/m', $dumpText);
$idxCount = preg_match_all('/^\s+KEY `/m', $dumpText);
$uqCount  = preg_match_all('/UNIQUE KEY `/m', $dumpText);

// Check UTF8MB4
$hasUtf8mb4 = str_contains($dumpText, 'utf8mb4');
$hasFkOff   = str_contains($dumpText, 'FOREIGN_KEY_CHECKS = 0');
$hasFkOn    = str_contains($dumpText, 'FOREIGN_KEY_CHECKS = 1');

$now = date('Y-m-d H:i:s T');
$totalSourceRows = array_sum(array_filter(array_values($meta['rowCounts']), 'is_int'));
$totalMysqlRows  = array_sum(array_map(fn($r) => (int)str_replace(',','',$r['mysql']), $validationRows));
$fileSizeKB = round(filesize($mysqlDump) / 1024, 1);

ob_start();
echo "# Migration Validation Report\n\n";
echo "> **Generated**: $now  \n";
echo "> **Dump file**: `database/migration/mysql/inter-smart-employee-portal-mysql.sql`  \n";
echo "> **Dump size**: {$fileSizeKB} KB  \n\n";

echo "## Structural Checks\n\n";
echo "| Check | Result |\n";
echo "|---|---|\n";
echo "| Tables in source | " . count($tableNames) . " |\n";
echo "| Tables in dump | " . count($createdTables[1]) . " |\n";
echo "| Missing tables | " . (empty($missingTables) ? '✅ None' : '❌ ' . implode(', ', $missingTables)) . " |\n";
echo "| Foreign key constraints | {$fkCount} |\n";
echo "| Regular indexes | {$idxCount} |\n";
echo "| Unique indexes | {$uqCount} |\n";
echo "| UTF8MB4 charset | " . ($hasUtf8mb4 ? '✅ Yes' : '❌ Missing') . " |\n";
echo "| FOREIGN_KEY_CHECKS=0 | " . ($hasFkOff ? '✅ Yes' : '⚠️ Missing') . " |\n";
echo "| FOREIGN_KEY_CHECKS=1 | " . ($hasFkOn  ? '✅ Yes' : '⚠️ Missing') . " |\n";
echo "\n";

echo "## Row Count Comparison\n\n";
echo "| Table | Supabase Rows | MySQL Rows | Difference | Status |\n";
echo "|---|---|---|---|---|\n";
foreach ($validationRows as $tn => $r) {
    echo "| `$tn` | {$r['source']} | {$r['mysql']} | {$r['diff']} | {$r['status']} |\n";
}
echo "\n";
echo "**Total source rows**: " . number_format($totalSourceRows) . "  \n";
echo "**Total MySQL rows**: " . number_format($totalMysqlRows) . "  \n";

if (!empty($issues)) {
    echo "\n## Issues Found\n\n";
    foreach ($issues as $iss) {
        echo "> [!WARNING]  \n> $iss\n\n";
    }
} else {
    echo "\n> [!NOTE]  \n> All row counts match. Validation passed.\n\n";
}

$report = ob_get_clean();
file_put_contents($reportFile, $report);
echo $report;
echo "\nValidation report saved: $reportFile\n";
