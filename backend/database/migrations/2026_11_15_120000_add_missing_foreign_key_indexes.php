<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit 15 Nov 2026 (M-12): foreign-key style columns that no index starts with.
 * Add-only; each index is created only if the table and column exist and no index starts on that column yet.
 */
return new class extends Migration
{
    private const TARGETS = [
        'leave_requests' => 'approver_id',
        'teams' => 'team_lead_id',
        'qa_requests' => 'task_id',
        'meetings' => 'project_id',
        'audit_logs' => 'user_id',
    ];

    public function up(): void
    {
        foreach (self::TARGETS as $table => $column) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column) || $this->hasLeadingIndex($table, $column)) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) use ($column) {
                $t->index($column);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TARGETS as $table => $column) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column)) {
                try {
                    Schema::table($table, fn (Blueprint $t) => $t->dropIndex([$column]));
                } catch (\Throwable $e) {
                    // index was not created by this migration
                }
            }
        }
    }

    private function hasLeadingIndex(string $table, string $column): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['columns'][0] ?? null) === $column) {
                return true;
            }
        }

        return false;
    }
};
