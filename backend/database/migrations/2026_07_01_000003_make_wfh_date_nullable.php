<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // wfh_date was NOT NULL — make nullable via raw SQL (no doctrine/dbal needed)
        DB::statement('ALTER TABLE wfh_requests ALTER COLUMN wfh_date DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wfh_requests ALTER COLUMN wfh_date SET NOT NULL');
    }
};
