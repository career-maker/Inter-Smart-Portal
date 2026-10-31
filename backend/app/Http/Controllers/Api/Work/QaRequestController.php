<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTaskAssignee;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * QA requests raised from the Frontend and Dev tables. They go to the QA lead(s), who assign each one to a QA team member.
 * The assigned member moves it to In testing and Done.
 */
class QaRequestController extends Controller
{
    public const STATUSES = ['Requested', 'Assigned', 'In testing', 'Done'];

    private function isQaLead(User $u): bool
    {
        return $u->hasRole('Super Admin') || Access::has('qa_lead', $u);
    }

    private function qaMembers()
    {
        return Access::teamMembers(['qa'])->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}")])->values();
    }

    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');
        $rows = DB::table('qa_requests')->where('project_id', $project->id)->orderByDesc('id')->get();
        $names = User::whereIn('id', $rows->pluck('requested_by')->merge($rows->pluck('assigned_to'))->filter()->unique())->get()->keyBy('id');
        $nm = fn ($id) => $id && $names->has($id) ? trim($names[$id]->first_name . ' ' . $names[$id]->last_name) : null;

        return response()->json([
            'data' => $rows->map(fn ($r) => (array) $r + ['requested_by_name' => $nm($r->requested_by), 'assigned_to_name' => $nm($r->assigned_to)]),
            'statuses' => self::STATUSES, 'can_assign' => $this->isQaLead($user), 'qa_members' => $this->qaMembers(), 'me' => $user->id,
        ]);
    }

    /** A Frontend or Dev team member asks QA to test a page or task. */
    public function store(Request $request, int $row)
    {
        $r = DB::table('work_tracker_rows')->find($row);
        abort_unless($r && in_array($r->kind, ['frontend', 'dev'], true), 404);
        $project = Project::findOrFail($r->project_id);
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project) && ! Access::inTeam($user, 'qa'), 403, 'Only the Frontend and Dev teams can ask for QA.');
        $d = $request->validate(['note' => 'nullable|string|max:2000']);
        if (DB::table('qa_requests')->where('row_id', $row)->where('status', '!=', 'Done')->exists()) {
            return response()->json(['message' => 'QA has already been requested for this and is not finished.', 'errors' => ['note' => ['QA has already been requested for this and is not finished.']]], 422);
        }

        $id = DB::table('qa_requests')->insertGetId([
            'project_id' => $project->id, 'row_id' => $row, 'kind' => $r->kind, 'title' => $r->name, 'note' => $d['note'] ?? null,
            'requested_by' => $user->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $leads = Access::usersWith('qa_lead')->merge(User::role('Super Admin')->get())->unique('id');
        Notify::users($leads, 'QA requested', "\"{$project->name}\": QA is requested for \"{$r->name}\" ({$r->kind}). Assign it to a QA team member.", 'qa_requested', $project->id, $user);

        return response()->json(['data' => DB::table('qa_requests')->find($id)], 201);
    }

    /** The QA lead assigns the request to a QA team member. */
    public function assign(Request $request, int $qaRequest)
    {
        $q = DB::table('qa_requests')->find($qaRequest);
        abort_unless($q, 404);
        abort_unless($this->isQaLead($request->user()), 403, 'Only the QA lead can assign QA requests.');
        $d = $request->validate([
            'assigned_to' => ['required', Rule::in($this->qaMembers()->pluck('id')->all())],
            'start_date' => 'required|date', 'end_date' => 'required|date|after_or_equal:start_date',
        ]);
        $project = Project::find($q->project_id);
        $taskId = $this->taskFor($q, $project, (int) $d['assigned_to'], $d['start_date'], $d['end_date'], $request->user());
        DB::table('qa_requests')->where('id', $qaRequest)->update(['assigned_to' => $d['assigned_to'], 'assigned_by' => $request->user()->id, 'task_id' => $taskId,
            'start_date' => $d['start_date'], 'end_date' => $d['end_date'], 'status' => $q->status === 'Requested' ? 'Assigned' : $q->status, 'updated_at' => now()]);
        Notify::users(User::where('id', $d['assigned_to'])->get(), 'QA assigned to you', "\"{$project->name}\": please test \"{$q->title}\" ({$q->kind}).", 'qa_assigned', $q->project_id, $request->user());

        return response()->json(['data' => DB::table('qa_requests')->find($qaRequest)]);
    }

    /** The task on the Tasks page for this request: created on first assignment, moved to the new tester and dates after that. */
    private function taskFor(object $q, Project $project, int $tester, string $start, string $end, User $actor): int
    {
        $task = $q->task_id ? ProjectTask::find($q->task_id) : null;
        $fields = ['start_date' => $start, 'due_date' => $end, 'allotted_days' => max(1, \Carbon\Carbon::parse($start)->diffInDays(\Carbon\Carbon::parse($end)) + 1)];
        if ($task) {
            $task->update($fields + ['updated_by' => $actor->id]);
            ProjectTaskAssignee::where('task_id', $task->id)->delete();
        } else {
            $task = ProjectTask::create($fields + [
                'project_id' => $project->id, 'title' => "QA: {$q->title}", 'description' => "QA for \"{$q->title}\" ({$q->kind}).",
                'status' => 'Assigned to QA', 'priority' => 'Medium', 'team_id' => User::find($tester)?->team_id, 'created_by' => $actor->id,
            ]);
        }
        ProjectTaskAssignee::create(['task_id' => $task->id, 'user_id' => $tester, 'assigned_by' => $actor->id, 'is_primary' => true]);

        return $task->id;
    }

    /** Called when a task's status changes on the Tasks page, so the QA request follows it. */
    public static function followTask(ProjectTask $task): void
    {
        $q = DB::table('qa_requests')->where('task_id', $task->id)->first();
        if (! $q || $q->status === 'Done') {
            return;
        }
        $to = match ($task->status) { 'In Progress' => 'In testing', 'Completed' => 'Done', default => null };
        if ($to && $to !== $q->status) {
            DB::table('qa_requests')->where('id', $q->id)->update(['status' => $to, 'updated_at' => now()]);
            if ($to === 'Done') {
                Notify::users(User::where('id', $q->requested_by)->get(), 'QA finished', "\"{$q->title}\" has finished QA.", 'qa_done', $q->project_id, null);
            }
        }
    }

    /** The assigned QA member (or the QA lead) moves it to In testing / Done. */
    public function status(Request $request, int $qaRequest)
    {
        $q = DB::table('qa_requests')->find($qaRequest);
        abort_unless($q, 404);
        $user = $request->user();
        abort_unless($q->assigned_to === $user->id || $this->isQaLead($user), 403, 'Only the assigned QA person can update this.');
        abort_unless($q->assigned_to !== null, 422, 'Assign it to a QA team member first.');
        $d = $request->validate(['status' => ['required', Rule::in(['In testing', 'Done'])]]);
        DB::table('qa_requests')->where('id', $qaRequest)->update(['status' => $d['status'], 'updated_at' => now()]);
        // the same work shows on the Tasks page: In testing = In Progress, Done = Completed
        $task = $q->task_id ? ProjectTask::find($q->task_id) : null;
        if ($task) {
            $d['status'] === 'Done'
                ? $task->update(['status' => 'Completed', 'actual_start_date' => $task->actual_start_date ?? now()->toDateString(), 'actual_completion_date' => $task->actual_completion_date ?? now()->toDateString()])
                : $task->update(['status' => 'In Progress', 'actual_start_date' => $task->actual_start_date ?? now()->toDateString()]);
        }
        if ($d['status'] === 'Done') {
            Notify::users(User::where('id', $q->requested_by)->get(), 'QA finished', "\"{$q->title}\" has finished QA.", 'qa_done', $q->project_id, $user);
        }

        return response()->json(['data' => DB::table('qa_requests')->find($qaRequest)]);
    }
}
