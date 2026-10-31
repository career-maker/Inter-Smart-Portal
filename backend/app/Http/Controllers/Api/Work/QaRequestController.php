<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
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
        $d = $request->validate(['assigned_to' => ['required', Rule::in($this->qaMembers()->pluck('id')->all())]]);
        DB::table('qa_requests')->where('id', $qaRequest)->update(['assigned_to' => $d['assigned_to'], 'assigned_by' => $request->user()->id, 'status' => $q->status === 'Requested' ? 'Assigned' : $q->status, 'updated_at' => now()]);
        $project = Project::find($q->project_id);
        Notify::users(User::where('id', $d['assigned_to'])->get(), 'QA assigned to you', "\"{$project->name}\": please test \"{$q->title}\" ({$q->kind}).", 'qa_assigned', $q->project_id, $request->user());

        return response()->json(['data' => DB::table('qa_requests')->find($qaRequest)]);
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
        if ($d['status'] === 'Done') {
            Notify::users(User::where('id', $q->requested_by)->get(), 'QA finished', "\"{$q->title}\" has finished QA.", 'qa_done', $q->project_id, $user);
        }

        return response()->json(['data' => DB::table('qa_requests')->find($qaRequest)]);
    }
}
