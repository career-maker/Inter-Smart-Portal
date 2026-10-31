<?php

namespace App\Http\Controllers\Api\Pmo;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\OutOfScopeRequest;
use App\Models\Project;
use App\Models\ProjectBusinessAnalysis;
use App\Models\ProjectFinance;
use App\Models\ProjectResource;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use App\Support\ProjectGate;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Work inside a project: business analysis, resources, out-of-scope requests. Locked tabs stay locked here too. */
class PmoWorkController extends Controller
{
    public const RESOURCE_KINDS = ['Brand book', 'Logo', 'Domain', 'Brochure', 'Proposal', 'Other'];

    public function saveBusinessAnalysis(Request $request, Project $project)
    {
        $this->requireTab($request, $project, 'business_analysis');
        $data = $request->validate(collect(['purpose', 'about_company', 'competitors', 'audience', 'usp', 'conclusion'])->mapWithKeys(fn ($f) => [$f => 'nullable|string|max:10000'])->all());

        $ba = ProjectBusinessAnalysis::updateOrCreate(['project_id' => $project->id], $data + ['updated_by' => $request->user()->id]);

        return response()->json(['data' => $ba]);
    }

    public function addResource(Request $request, Project $project)
    {
        $this->requireTab($request, $project, 'resources');
        $data = $request->validate([
            'kind' => ['required', Rule::in(self::RESOURCE_KINDS)],
            'title' => 'required|string|max:255',
            'url' => 'nullable|url|max:1000',
            'notes' => 'nullable|string|max:2000',
        ]);

        return response()->json(['data' => ProjectResource::create($data + ['project_id' => $project->id, 'added_by' => $request->user()->id])], 201);
    }

    public function removeResource(Request $request, Project $project, ProjectResource $resource)
    {
        $this->requireTab($request, $project, 'resources');
        abort_unless($resource->project_id === $project->id, 404);
        $resource->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /** Coordinator (or manager) asks for extra paid work, with the effort. Managers are told. */
    public function requestOutOfScope(Request $request, Project $project)
    {
        abort_unless(PmoProjectController::canView($request->user(), $project), 403, 'This project is not assigned to you.');
        $data = $request->validate([
            'description' => 'required|string|max:5000',
            'effort_days' => 'required|numeric|gt:0|max:10000',
            'amount_estimate' => 'nullable|numeric|min:0',
        ]);

        $req = OutOfScopeRequest::create($data + ['project_id' => $project->id, 'requested_by' => $request->user()->id]);
        $this->audit($request, $req, 'requested out-of-scope work', ['project' => $project->id, 'effort_days' => $data['effort_days']]);
        Notify::users(Access::pmoManagers(), 'Out-of-scope request', "\"{$project->name}\": {$data['effort_days']} day(s) of extra work requested. Approve or reject it in the Project Office.", 'out_of_scope_requested', $project->id, $request->user());

        // Sales has to answer it: a notification now, and the request shows as "action required" on their out-of-scope page
        Notify::users(User::whereIn('id', ProjectFinance::where('project_id', $project->id)->pluck('sales_user_id'))->get(), 'Out-of-scope request needs your answer', "\"{$project->name}\": {$data['effort_days']} day(s) of extra work. Approve or reject with a reason, or ask for a meeting.", 'out_of_scope_sales_action', $project->id, $request->user());

        return response()->json(['data' => $req], 201);
    }

    /** Managers see every request; a coordinator sees their own. Filter: status. */
    public function outOfScopeQueue(Request $request)
    {
        $q = OutOfScopeRequest::query()->orderByRaw("status = 'Pending' desc")->orderByDesc('id');
        if (! Access::pmoManager($request->user())) {
            // a coordinator sees what they asked for and everything on the projects assigned to them
            $q->where(fn ($w) => $w->where('requested_by', $request->user()->id)->orWhereIn('project_id', Project::where('project_coordinator_id', $request->user()->id)->select('id')));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        $rows = $q->limit(200)->get();
        $projects = Project::whereIn('id', $rows->pluck('project_id'))->pluck('name', 'id');
        $users = User::whereIn('id', $rows->pluck('requested_by'))->get()->keyBy('id');

        $mine = Project::where('project_coordinator_id', $request->user()->id)->pluck('id')->flip();
        $canAll = Access::can('pmo_approve', $request->user());

        return response()->json(['data' => $rows->map(fn ($r) => $r->toArray() + [
            'can_decide' => $canAll || $mine->has($r->project_id),
            'project_name' => $projects[$r->project_id] ?? null,
            'requested_by_name' => ($u = $users->get($r->requested_by)) ? trim("{$u->first_name} {$u->last_name}") : null,
        ])]);
    }

    /** Manager approves (the salesperson is told to agree it with the client, with the effort) or rejects with a note. */
    public function decideOutOfScope(Request $request, OutOfScopeRequest $oos)
    {
        // The project manager, or the coordinator assigned to this project.
        abort_unless(Access::can('pmo_approve', $request->user()) || Project::where('id', $oos->project_id)->where('project_coordinator_id', $request->user()->id)->exists(), 403, 'Only the project manager or the project coordinator can decide this.');
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'note' => 'nullable|string|max:2000']);
        if ($data['decision'] === 'reject' && empty($data['note'])) {
            return response()->json(['message' => 'Give a reason when rejecting.', 'errors' => ['note' => ['Give a reason when rejecting.']]], 422);
        }
        if ($oos->status !== 'Pending') {
            return response()->json(['message' => "Already {$oos->status}."], 422);
        }

        $approved = $data['decision'] === 'approve';
        $oos->update(['status' => $approved ? 'Approved' : 'Rejected', 'decided_by' => $request->user()->id, 'decided_at' => now(), 'decision_note' => $data['note'] ?? null]);
        $project = Project::find($oos->project_id);
        $this->audit($request, $oos, $approved ? 'approved out-of-scope work' : 'rejected out-of-scope work', ['project' => $project?->id]);

        $sales = User::whereIn('id', ProjectFinance::where('project_id', $oos->project_id)->pluck('sales_user_id'))->get();
        $coordinator = User::where('id', $oos->requested_by)->get();
        $effort = rtrim(rtrim((string) $oos->effort_days, '0'), '.');
        if ($approved) {
            Notify::users($sales, 'Out-of-scope work approved', "\"{$project->name}\": {$effort} day(s) of extra work approved. Please agree the extra cost with the client.", 'out_of_scope_approved', $project->id, $request->user());
            Notify::users($coordinator, 'Out-of-scope request approved', "Your request for \"{$project->name}\" ({$effort} days) was approved.", 'out_of_scope_approved', $project->id, $request->user());
        } else {
            Notify::users($coordinator->merge($sales), 'Out-of-scope request rejected', "\"{$project->name}\": request rejected. {$data['note']}", 'out_of_scope_rejected', $project->id, $request->user());
        }

        return response()->json(['data' => $oos->fresh()]);
    }

    private function requireTab(Request $request, Project $project, string $tab): void
    {
        abort_unless(PmoProjectController::canView($request->user(), $project), 403, 'This project is not assigned to you.');
        $t = ProjectGate::state($project)['tabs']->firstWhere('key', $tab);
        abort_unless($t && $t['enabled'], 423, $t['locked_reason'] ?? 'This tab is locked.');
    }

    private function audit(Request $request, $model, string $action, array $changes): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id, 'action' => $action, 'model_type' => get_class($model),
            'model_id' => $model->id, 'changes' => json_encode($changes), 'ip_address' => $request->ip(),
        ]);
    }
}
