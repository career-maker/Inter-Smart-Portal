<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\OutOfScopeRequest;
use App\Models\Project;
use App\Models\ProjectPage;
use App\Models\QaBug;
use App\Models\QaReview;
use App\Models\SprintItem;
use App\Models\WorkChange;
use App\Models\WorkSprint;
use App\Support\Access;
use App\Support\WorkAccess;
use Illuminate\Http\Request;

/**
 * Number tiles for the top of My Work, one set per hat the person wears (project manager, coordinator, team lead, QA, resource).
 * Each tile is {label, value, tone: ok|warn|bad, href}. Counts only cover projects on the person's own work list.
 */
class WorkDashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();
        $sections = [];
        $tile = fn (string $label, int|float $value, string $tone = 'ok', ?string $href = null) => compact('label', 'value', 'tone', 'href');

        if (Access::pmoManager($user)) {
            $sections[] = ['title' => 'Project manager', 'tiles' => [
                $tile('Active projects', Project::where('status', 'Active')->count()),
                $tile('On hold', Project::where('status', 'On Hold')->count(), 'warn'),
                $tile('Sprints to approve', WorkSprint::where('status', 'Submitted')->count(), 'warn'),
                $tile('Changes to approve', WorkChange::where('status', 'Estimated')->count(), 'warn'),
                $tile('Out-of-scope to decide', OutOfScopeRequest::where('status', 'Pending')->count(), 'warn', '/pmo/approvals'),
                $tile('Late design pages', ProjectPage::where('approval', 'Approved')->where('status', '!=', 'Completed')->whereNotNull('due_date')->where('due_date', '<', $today)->count(), 'bad'),
            ]];
        }

        $mine = Project::where('project_coordinator_id', $user->id);
        if ($mine->exists()) {
            $ids = $mine->pluck('id');
            $sections[] = ['title' => 'Coordinator', 'tiles' => [
                $tile('My projects', $ids->count()),
                $tile('Sprints needing dates', WorkSprint::whereIn('project_id', $ids)->where('status', 'Approved')->whereNull('requested_start')->count(), 'warn'),
                $tile('Corrections open', WorkChange::whereIn('project_id', $ids)->whereNotIn('status', ['Completed', 'Rejected'])->count(), 'warn'),
                $tile('Waiting on QA', QaReview::whereIn('status', ['Open', 'In review'])->count(), 'warn'),
            ]];
        }

        $led = WorkAccess::ledTeamIds($user);
        if ($led) {
            $sprints = WorkSprint::whereIn('team_id', $led)->pluck('id');
            $sections[] = ['title' => 'Team lead', 'tiles' => [
                $tile('Sprints to plan or confirm', WorkSprint::whereIn('team_id', $led)->where(fn ($q) => $q->whereIn('status', ['Draft', 'Rejected'])->orWhere(fn ($q2) => $q2->where('status', 'Approved')->whereNotNull('requested_start')))->count(), 'warn', '/work/inbox'),
                $tile('Tasks to verify', SprintItem::whereIn('sprint_id', $sprints)->where('status', 'Waiting for approval')->count(), 'warn', '/work/inbox'),
                $tile('Changes to estimate', WorkChange::whereIn('team_id', $led)->whereIn('status', ['Requested', 'Rejected'])->count(), 'warn', '/work/inbox'),
                $tile('Open tasks in my team', SprintItem::whereIn('sprint_id', $sprints)->where('status', '!=', 'Approved')->count(), 'ok', '/work/team'),
            ]];
        }

        if (Access::inTeam($user, 'qa')) {
            $sections[] = ['title' => 'QA', 'tiles' => [
                $tile('Waiting to be taken', QaReview::where('status', 'Open')->count(), 'warn', '/work/qa'),
                $tile('In review', QaReview::where('status', 'In review')->count(), 'ok', '/work/qa'),
                $tile('Open bugs', QaBug::where('status', 'Open')->count(), 'bad', '/work/qa'),
            ]];
        }

        $assigned = SprintItem::where('assigned_to', $user->id)->where('status', '!=', 'Approved')->count() + WorkChange::where('assigned_to', $user->id)->whereIn('status', ['Approved', 'In progress'])->count();
        if ($assigned) {
            $sections[] = ['title' => 'My tasks', 'tiles' => [$tile('Assigned to me', $assigned, 'ok', '/work/inbox')]];
        }

        return response()->json(['sections' => $sections]);
    }
}
