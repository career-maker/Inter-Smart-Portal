<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. bugzilla_projects
        if (!Schema::hasTable('bugzilla_projects')) {
            Schema::create('bugzilla_projects', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('portal_project_id')->unique();
                $table->string('name', 255);
                $table->text('description')->nullable();
                $table->string('status', 50)->default('active'); // active, inactive
                $table->unsignedBigInteger('default_assignee_id')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('portal_project_id')->references('id')->on('pm_projects')->cascadeOnDelete();
                $table->foreign('default_assignee_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            });
        }

        // 2. bugzilla_components
        if (!Schema::hasTable('bugzilla_components')) {
            Schema::create('bugzilla_components', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bugzilla_project_id');
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->unsignedBigInteger('default_assignee_id')->nullable();
                $table->string('status', 50)->default('active');
                $table->timestamps();

                $table->foreign('bugzilla_project_id')->references('id')->on('bugzilla_projects')->cascadeOnDelete();
                $table->foreign('default_assignee_id')->references('id')->on('users')->nullOnDelete();
                $table->unique(['bugzilla_project_id', 'name']);
            });
        }

        // 3. bugzilla_bugs
        if (!Schema::hasTable('bugzilla_bugs')) {
            Schema::create('bugzilla_bugs', function (Blueprint $table) {
                $table->id();
                $table->string('bug_number', 50)->unique();
                $table->unsignedBigInteger('bugzilla_project_id');
                $table->unsignedBigInteger('portal_project_id');
                $table->unsignedBigInteger('task_id')->nullable();
                $table->unsignedBigInteger('component_id')->nullable();
                $table->unsignedBigInteger('reporter_id');
                $table->unsignedBigInteger('assignee_id')->nullable();
                
                $table->string('summary', 255);
                $table->text('description');
                $table->text('steps_to_reproduce')->nullable();
                $table->text('expected_result')->nullable();
                $table->text('actual_result')->nullable();
                $table->string('environment', 150)->nullable();
                $table->string('browser', 150)->nullable();
                $table->string('device', 150)->nullable();

                $table->string('severity', 50)->default('NORMAL'); // BLOCKER, CRITICAL, MAJOR, NORMAL, MINOR, TRIVIAL
                $table->string('priority', 50)->default('P3'); // P1, P2, P3, P4, P5
                $table->string('status', 50)->default('NEW'); // UNCONFIRMED, NEW, ASSIGNED, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED, REOPENED
                $table->string('resolution', 50)->nullable(); // FIXED, INVALID, WONTFIX, DUPLICATE, WORKSFORME, INCOMPLETE

                $table->unsignedBigInteger('duplicate_of_bug_id')->nullable();
                $table->unsignedBigInteger('linked_pm_bug_id')->nullable();

                $table->timestamp('resolved_at')->nullable();
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->foreign('bugzilla_project_id')->references('id')->on('bugzilla_projects')->cascadeOnDelete();
                $table->foreign('portal_project_id')->references('id')->on('pm_projects')->cascadeOnDelete();
                $table->foreign('task_id')->references('id')->on('pm_tasks')->nullOnDelete();
                $table->foreign('component_id')->references('id')->on('bugzilla_components')->nullOnDelete();
                $table->foreign('reporter_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('assignee_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('duplicate_of_bug_id')->references('id')->on('bugzilla_bugs')->nullOnDelete();
                $table->foreign('linked_pm_bug_id')->references('id')->on('pm_task_bugs')->nullOnDelete();

                $table->index('bugzilla_project_id');
                $table->index('portal_project_id');
                $table->index('task_id');
                $table->index('component_id');
                $table->index('reporter_id');
                $table->index('assignee_id');
                $table->index('status');
                $table->index('severity');
                $table->index('priority');
                $table->index('resolution');
                $table->index('created_at');
            });
        }

        // 4. bugzilla_comments
        if (!Schema::hasTable('bugzilla_comments')) {
            Schema::create('bugzilla_comments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('user_id');
                $table->text('comment');
                $table->boolean('is_private')->default(false);
                $table->timestamps();

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('bug_id');
            });
        }

        // 5. bugzilla_attachments
        if (!Schema::hasTable('bugzilla_attachments')) {
            Schema::create('bugzilla_attachments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('uploaded_by');
                $table->string('file_path', 500);
                $table->string('original_name', 255);
                $table->string('mime_type', 150)->nullable();
                $table->unsignedBigInteger('file_size')->nullable();
                $table->string('description', 255)->nullable();
                $table->boolean('is_private')->default(false);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('uploaded_by')->references('id')->on('users')->cascadeOnDelete();
                $table->index('bug_id');
            });
        }

        // 6. bugzilla_labels
        if (!Schema::hasTable('bugzilla_labels')) {
            Schema::create('bugzilla_labels', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique();
                $table->timestamps();
            });
        }

        // 7. bugzilla_bug_label
        if (!Schema::hasTable('bugzilla_bug_label')) {
            Schema::create('bugzilla_bug_label', function (Blueprint $table) {
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('label_id');

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('label_id')->references('id')->on('bugzilla_labels')->cascadeOnDelete();
                $table->primary(['bug_id', 'label_id']);
            });
        }

        // 8. bugzilla_history
        if (!Schema::hasTable('bugzilla_history')) {
            Schema::create('bugzilla_history', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100);
                $table->string('field', 100)->nullable();
                $table->text('old_value')->nullable();
                $table->text('new_value')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('bug_id');
                $table->index('created_at');
            });
        }

        // 9. bugzilla_dependencies
        if (!Schema::hasTable('bugzilla_dependencies')) {
            Schema::create('bugzilla_dependencies', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('depends_on_bug_id');
                $table->string('relationship_type', 50)->default('depends_on'); // depends_on, blocks
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('depends_on_bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->unique(['bug_id', 'depends_on_bug_id', 'relationship_type'], 'bugzilla_dep_unique');
            });
        }

        // 10. bugzilla_watchers
        if (!Schema::hasTable('bugzilla_watchers')) {
            Schema::create('bugzilla_watchers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('bug_id');
                $table->unsignedBigInteger('user_id');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('bug_id')->references('id')->on('bugzilla_bugs')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->unique(['bug_id', 'user_id']);
            });
        }

        // 11. bugzilla_saved_searches
        if (!Schema::hasTable('bugzilla_saved_searches')) {
            Schema::create('bugzilla_saved_searches', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('name', 150);
                $table->json('criteria');
                $table->boolean('is_shared')->default(false);
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index('user_id');
            });
        }

        // Register Bugzilla in pm_addons
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'bugzilla')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key' => 'bugzilla',
                    'name' => 'Bugzilla',
                    'description' => 'Enterprise bug & defect management system with products/components, rich lifecycles, duplicate detection, dependencies, advanced search, and reporting.',
                    'icon' => 'Bug',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bugzilla_saved_searches');
        Schema::dropIfExists('bugzilla_watchers');
        Schema::dropIfExists('bugzilla_dependencies');
        Schema::dropIfExists('bugzilla_history');
        Schema::dropIfExists('bugzilla_bug_label');
        Schema::dropIfExists('bugzilla_labels');
        Schema::dropIfExists('bugzilla_attachments');
        Schema::dropIfExists('bugzilla_comments');
        Schema::dropIfExists('bugzilla_bugs');
        Schema::dropIfExists('bugzilla_components');
        Schema::dropIfExists('bugzilla_projects');
        
        if (Schema::hasTable('pm_addons')) {
            DB::table('pm_addons')->where('key', 'bugzilla')->delete();
        }
    }
};
