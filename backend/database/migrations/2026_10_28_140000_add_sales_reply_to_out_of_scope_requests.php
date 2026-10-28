<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sales answers an out-of-scope request raised by the Project Office: approve or reject with a reason, or ask for a meeting. Add-only nullable columns; a null sales_status means "action required" from Sales. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('out_of_scope_requests', function (Blueprint $table) {
            $table->string('sales_status', 20)->nullable();        // Approved | Rejected | Meeting requested
            $table->text('sales_reason')->nullable();
            $table->foreignId('sales_replied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sales_replied_at')->nullable();
            $table->unsignedBigInteger('sales_meeting_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('out_of_scope_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sales_replied_by');
            $table->dropColumn(['sales_status', 'sales_reason', 'sales_replied_at', 'sales_meeting_id']);
        });
    }
};
