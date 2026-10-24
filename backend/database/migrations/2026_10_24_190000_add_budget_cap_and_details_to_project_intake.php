<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales Team Documentation sheet: max budget cap set by Sales, plus the sheet's project/client/scope/in-house answers. Add-only. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_intake', function (Blueprint $table) {
            $table->decimal('budget_cap', 12, 2)->nullable()->after('budget');
            $table->json('details')->nullable()->after('overview');
        });
    }

    public function down(): void
    {
        Schema::table('project_intake', function (Blueprint $table) {
            $table->dropColumn(['budget_cap', 'details']);
        });
    }
};
