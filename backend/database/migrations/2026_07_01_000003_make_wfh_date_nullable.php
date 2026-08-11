<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE wfh_requests MODIFY COLUMN wfh_date DATE NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE wfh_requests MODIFY COLUMN wfh_date DATE NOT NULL');
    }
};
