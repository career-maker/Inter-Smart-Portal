<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\PageEvent;
use App\Models\PageSection;
use App\Models\Project;
use App\Models\ProjectIntake;
use App\Models\ProjectPage;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** UI department: pages, sections, the page status chain, per-page budgets inside the design budget. */
class UiWorkflowController extends Controller
{
    /** Projects the signed-in person can work on, with a one-line UI summary. */
    public function myProjects(Request $request)
    {
        $ids = WorkAccess::projectIds($request->user());
        $projects = Project::whereIn('id', $ids)->orderByDesc('id')->get(['id', 'name', 'status']);
        $pages = ProjectPage::whereIn('project_id', $ids)->where('approval', 'Approved')->selectRaw('project_id, count(*) as total, sum(status = ?) as done', ['Completed'])->groupBy('project_id')->get()->keyBy('project_id');

        return response()->json(['data' => $projects->map(fn ($p) => $p->toArray() + [
            'ui_pages' => (int) ($pages[$p->id]->total ?? 0), 'ui_pages_done' => (int) ($pages[$p->id]->done ?? 0),
        ])]);
    }

    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        $this->authorizeView($user, $project);

        $pages = ProjectPage::where('project_id', $project->id)->withCount('sections')->orderBy('position')->orderBy('id')->get();
        $users = User::whereIn('id', $pages->pluck('assigned_to')->filter())->get()->keyBy('id');
        $cap = WorkAccess::uiBudgetCap($project);
        $used = (float) $pages->where('approval', 'Approved')->sum('budget');
        $intake = ProjectIntake::where('project_id', $project->id)->first();

        return response()->json([
            'project' => $project->only(['id', 'name', 'status']),
            'pages' => $pages->map(fn ($p) => $p->toArray() + ['assignee' => ($u = $users->get($p->assigned_to)) ? trim("{$u->first_name} {$u->last_name}") : null]),
            'statuses' => ProjectPage::STATUSES, 'animation_levels' => ProjectPage::ANIMATION, 'update_types' => ProjectPage::UPDATE_TYPES,
            'budget' => ['cap' => $cap, 'used' => $used, 'left' => $cap - $used],
            'pages_allowed' => $intake?->pages_count,
            'ui_team' => Team::whereIn('id', WorkAccess::uiTeamIds())->with('members:id,first_name,last_name,team_id')->get()
                ->flatMap(fn ($t) => $t->members)->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}")])->values(),
            'can_manage' => WorkAccess::canManageUi($user, $project), 'can_work' => WorkAccess::canWorkUi($user, $project), 'is_manager' => Access::pmoManager($user),
        ]);
    }

    public function show(Request $request, ProjectPage $page)
    {
        $project = Project::findOrFail($page->project_id);
        $this->authorizeView($request->user(), $project);
        $sections = $page->sections()->get();
        $names = User::whereIn('id', $page->events()->pluck('user_id')->filter())->get()->keyBy('id');

        return response()->json([
            'page' => $page,
            'sections' => $sections->whereNull('parent_id')->values()->map(fn ($s) => $s->toArray() + ['children' => $sections->where('parent_id', $s->id)->values()]),
            'events' => $page->events()->get()->map(fn ($e) => $e->toArray() + ['user' => ($u = $names->get($e->user_id)) ? trim("{$u->first_name} {$u->last_name}") : null]),
        ]);
    }

    /** Add a page. Beyond the number of pages in the sale it waits for the project manager (the sheet's "request a new page"). */
    public function storePage(Request $request, Project $project)
    {
        $this->authorizeManage($request->user(), $project);
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'animation_level' => ['nullable', Rule::in(ProjectPage::ANIMATION)],
            'est_sections' => 'nullable|integer|min:1|max:200',
            'figma_url' => 'nullable|url|max:1000',
            'due_date' => 'nullable|date',
        ]);

        $allowed = ProjectIntake::where('project_id', $project->id)->value('pages_count');
        $count = ProjectPage::where('project_id', $project->id)->whereIn('approval', ['Approved', 'Pending'])->count();
        $needsApproval = $allowed !== null && $count >= $allowed;

        $page = ProjectPage::create($data + [
            'project_id' => $project->id, 'position' => $count + 1, 'created_by' => $request->user()->id,
            'approval' => $needsApproval ? 'Pending' : 'Approved',
        ]);

        if ($needsApproval) {
            Notify::users(Access::pmoManagers(), 'New page needs approval', "\"{$project->name}\": page \"{$page->title}\" is beyond the {$allowed} pages in the sale. Approve or reject it in the Project Office.", 'page_requested', $project->id, $request->user());
        }

        return response()->json(['data' => $page, 'needs_approval' => $needsApproval], 201);
    }

    public function updatePage(Request $request, ProjectPage $page)
    {
        $project = Project::findOrFail($page->project_id);
        $this->authorizeManage($request->user(), $project);
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'animation_level' => ['sometimes', Rule::in(ProjectPage::ANIMATION)],
            'est_sections' => 'nullable|integer|min:1|max:200',
            'figma_url' => 'nullable|url|max:1000',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'budget' => 'nullable|numeric|min:0',
        ]);

        if (! empty($data['assigned_to'])) {
            $assignee = User::with('team')->findOrFail($data['assigned_to']);
            abort_unless(WorkAccess::isUiMember($assignee), 422, 'Pages can only be assigned to someone in the Design team.');
        }
        if (array_key_exists('budget', $data) && $data['budget'] !== null) {
            $others = (float) ProjectPage::where('project_id', $project->id)->where('approval', 'Approved')->where('id', '!=', $page->id)->sum('budget');
            $cap = WorkAccess::uiBudgetCap($project);
            if ($others + (float) $data['budget'] > $cap) {
                $msg = 'Page budgets would total ' . number_format($others + (float) $data['budget'], 2) . ' but the design budget is ' . number_format($cap, 2) . '. Ask the project manager to raise it first.';

                return response()->json(['message' => $msg, 'errors' => ['budget' => [$msg]]], 422);
            }
        }

        $wasAssigned = $page->assigned_to;
        $page->update($data);
        if (! empty($data['assigned_to']) && (int) $data['assigned_to'] !== (int) $wasAssigned) {
            Notify::users(User::where('id', $data['assigned_to'])->get(), 'Page assigned', "You were given the page \"{$page->title}\" on \"{$project->name}\".", 'page_assigned', $project->id, $request->user());
        }

        return response()->json(['data' => $page->fresh()]);
    }

    /** Project manager decides on a page beyond the sold number of pages. */
    public function decidePage(Request $request, ProjectPage $page)
    {
        abort_unless(Access::pmoManager($request->user()), 403, 'Only the project manager can decide this.');
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])], 'note' => 'nullable|string|max:2000']);
        abort_unless($page->approval === 'Pending', 422, "This page is already {$page->approval}.");
        if ($data['decision'] === 'reject' && empty($data['note'])) {
            $msg = 'Give a reason when rejecting.';

            return response()->json(['message' => $msg, 'errors' => ['note' => [$msg]]], 422);
        }

        $page->update(['approval' => $data['decision'] === 'approve' ? 'Approved' : 'Rejected']);
        $project = Project::find($page->project_id);
        Notify::users(User::where('id', $page->created_by)->get(), $data['decision'] === 'approve' ? 'Extra page approved' : 'Extra page rejected',
            "\"{$project->name}\": page \"{$page->title}\" was " . ($data['decision'] === 'approve' ? 'approved.' : "rejected. {$data['note']}"), 'page_decided', $project->id, $request->user());

        return response()->json(['data' => $page->fresh()]);
    }

    /** Move a page along the status chain. Every move is logged with who and why. */
    public function setStatus(Request $request, ProjectPage $page)
    {
        $project = Project::findOrFail($page->project_id);
        abort_unless(WorkAccess::canWorkUi($request->user(), $project), 403, 'You cannot update this page.');
        WorkAccess::requireOpenTab($project, 'ui');
        abort_unless($page->approval === 'Approved', 422, 'This page is waiting for the project manager to approve it.');

        $data = $request->validate([
            'status' => ['required', Rule::in(ProjectPage::STATUSES)],
            'note' => 'nullable|string|max:2000',
            'update_type' => ['nullable', Rule::in(ProjectPage::UPDATE_TYPES)],
        ]);
        if ($data['status'] === $page->status) {
            return response()->json(['message' => "The page is already {$page->status}."], 422);
        }
        if ($data['status'] === 'Rejected' && empty($data['note'])) {
            $msg = 'Say why the page was rejected.';

            return response()->json(['message' => $msg, 'errors' => ['note' => [$msg]]], 422);
        }

        $from = $page->status;
        DB::transaction(function () use ($page, $data, $from, $request) {
            $page->update(['status' => $data['status']]);
            PageEvent::create(['page_id' => $page->id, 'user_id' => $request->user()->id, 'from_status' => $from, 'to_status' => $data['status'], 'update_type' => $data['update_type'] ?? null, 'note' => $data['note'] ?? null]);
        });

        $leads = Team::whereIn('id', WorkAccess::uiTeamIds())->pluck('team_lead_id')->filter();
        $audience = User::whereIn('id', $leads->push($project->project_coordinator_id)->push($page->assigned_to)->filter())->get();
        if ($data['status'] === 'Completed') {
            Notify::users($audience, 'Page completed', "\"{$project->name}\": page \"{$page->title}\" is completed and ready to review.", 'page_completed', $project->id, $request->user());
        } elseif ($data['status'] === 'Rejected') {
            Notify::users($audience, 'Page rejected', "\"{$project->name}\": page \"{$page->title}\" was rejected. {$data['note']}", 'page_rejected', $project->id, $request->user());
        } elseif (str_starts_with($data['status'], 'Correction')) {
            Notify::users($audience, 'Page needs a correction', "\"{$project->name}\": page \"{$page->title}\" is in {$data['status']}.", 'page_correction', $project->id, $request->user());
        }

        return response()->json(['data' => $page->fresh()]);
    }

    // ---- sections ---------------------------------------------------------------

    public function storeSection(Request $request, ProjectPage $page)
    {
        $project = Project::findOrFail($page->project_id);
        abort_unless(WorkAccess::canWorkUi($request->user(), $project), 403, 'You cannot edit this page.');
        WorkAccess::requireOpenTab($project, 'ui');
        $data = $this->sectionRules($request);

        if (empty($data['parent_id']) && $page->est_sections !== null) {
            $now = PageSection::where('page_id', $page->id)->whereNull('parent_id')->count();
            if ($now >= $page->est_sections) {
                $msg = "This page is set up for {$page->est_sections} sections. Ask the UI lead to raise the number first.";

                return response()->json(['message' => $msg, 'errors' => ['title' => [$msg]]], 422);
            }
        }
        if (! empty($data['parent_id'])) {
            abort_unless(PageSection::where('id', $data['parent_id'])->where('page_id', $page->id)->whereNull('parent_id')->exists(), 422, 'A sub-section must belong to a section on the same page.');
        }

        $position = PageSection::where('page_id', $page->id)->where('parent_id', $data['parent_id'] ?? null)->count() + 1;

        return response()->json(['data' => PageSection::create($data + ['page_id' => $page->id, 'position' => $position])], 201);
    }

    public function updateSection(Request $request, PageSection $section)
    {
        $page = ProjectPage::findOrFail($section->page_id);
        $project = Project::findOrFail($page->project_id);
        abort_unless(WorkAccess::canWorkUi($request->user(), $project), 403, 'You cannot edit this page.');
        WorkAccess::requireOpenTab($project, 'ui');
        $section->update(collect($this->sectionRules($request, true))->except('parent_id')->all());

        return response()->json(['data' => $section->fresh()]);
    }

    public function destroySection(Request $request, PageSection $section)
    {
        $page = ProjectPage::findOrFail($section->page_id);
        $project = Project::findOrFail($page->project_id);
        abort_unless(WorkAccess::canWorkUi($request->user(), $project), 403, 'You cannot edit this page.');
        $section->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    private function sectionRules(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'statistics' => 'nullable|string|max:5000',
            'content' => 'nullable|string|max:20000',
            'description' => 'nullable|string|max:20000',
            'parent_id' => 'nullable|integer',
        ]);
    }

    private function authorizeView(User $user, Project $project): void
    {
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');
    }

    private function authorizeManage(User $user, Project $project): void
    {
        abort_unless(WorkAccess::canManageUi($user, $project), 403, 'Only the UI lead, the coordinator or the project manager can do this.');
        WorkAccess::requireOpenTab($project, 'ui');
    }
}
