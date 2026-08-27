<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\ProjectTask;
use App\Models\ProjectTaskAssignee;

return new class extends Migration
{
    public function up(): void
    {
        // Find all tasks that currently have more than 1 assignee
        $tasksWithMultipleAssignees = DB::table('pm_task_assignees')
            ->select('task_id', DB::raw('COUNT(*) as total_assignees'))
            ->groupBy('task_id')
            ->having('total_assignees', '>', 1)
            ->get();

        foreach ($tasksWithMultipleAssignees as $record) {
            $taskId = $record->task_id;
            $originalTask = ProjectTask::find($taskId);
            if (!$originalTask) continue;

            $assignees = ProjectTaskAssignee::where('task_id', $taskId)
                ->orderBy('id', 'asc')
                ->get();

            // Keep the first assignee on the original task
            // For remaining assignees (1, 2, ...), clone the task and re-assign
            for ($i = 1; $i < count($assignees); $i++) {
                $assigneeRow = $assignees[$i];

                // Clone task attributes
                $newTask = $originalTask->replicate();
                $newTask->save();

                // Point this assignee to the newly created task
                $assigneeRow->task_id = $newTask->id;
                $assigneeRow->is_primary = true;
                $assigneeRow->save();
            }
        }
    }

    public function down(): void
    {
        // Non-destructive rollback
    }
};
