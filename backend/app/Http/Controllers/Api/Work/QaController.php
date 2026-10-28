<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\QaBug;
use App\Models\QaReview;
use App\Models\SprintEvent;
use App\Models\SprintItem;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkSprint;
use App\Support\Access;
use App\Support\Notify;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * QA: reviews are opened automatically when a task is Completed (see QaHandoff). A QA person takes the review, lists bugs,
 * then passes it (task goes to the team lead to verify) or fails it (task goes back to the developer as "Testing bugs N").
 */
class QaController extends Controller
{
    /** Every review still waiting for or in testing. QA team members and project managers only. */
    public function queue(Request $request)
    {
        abort_unless($this->isQa($request->user()) || Access::pmoManager($request->user()), 403, 'Only the QA team and project managers can see the QA queue.');

        return response()->json(['data' => $this->rows(QaReview::whereIn('status', ['Open', 'In review'])->orderBy('id')->get())]);
    }

    public function forProject(Request $request, Project $project)
    {
        abort_unless(WorkAccess::canWork($request->user(), $project), 403, 'This project is not on your work list.');
        WorkAccess::requireOpenTab($project, 'qa');

        return response()->json(['data' => $this->rows(QaReview::where('project_id', $project->id)->orderByDesc('id')->get())]);
    }

    public function show(Request $request, QaReview $review)
    {
        $project = Project::findOrFail($review->project_id);
        abort_unless(WorkAccess::canWork($request->user(), $project), 403, 'This project is not on your work list.');
        $item = SprintItem::find($review->sprint_item_id);
        $user = $request->user();
        $assignee = $item?->assigned_to ? User::find($item->assigned_to) : null;

        return response()->json([
            'review' => $review->toArray() + ['project_name' => $project->name, 'task' => $item?->title, 'task_status' => $item?->status, 'developer' => $assignee ? trim("{$assignee->first_name} {$assignee->last_name}") : null,
                'tester' => ($t = $review->assigned_to ? User::find($review->assigned_to) : null) ? trim("{$t->first_name} {$t->last_name}") : null],
            'bugs' => $review->bugs()->get(),
            'priorities' => QaBug::PRIORITIES,
            'can_take' => $this->isQa($user) && $review->status === 'Open',
            'can_test' => $this->canTest($user, $review),
            'can_fix' => $this->canFix($user, $review),
        ]);
    }

    public function take(Request $request, QaReview $review)
    {
        abort_unless($this->isQa($request->user()), 403, 'Only the QA team can take a review.');
        abort_unless($review->status === 'Open', 422, 'This review has already been taken.');
        $review->update(['status' => 'In review', 'assigned_to' => $request->user()->id]);

        return response()->json(['data' => $review->fresh()]);
    }

    public function addBug(Request $request, QaReview $review)
    {
        abort_unless($this->canTest($request->user(), $review), 403, 'Only the QA person on this review can list bugs.');
        abort_unless($review->status === 'In review', 422, 'Take the review before listing bugs.');
        $data = $request->validate(['title' => 'required|string|max:255', 'priority' => ['required', Rule::in(QaBug::PRIORITIES)], 'description' => 'nullable|string|max:5000']);

        return response()->json(['data' => QaBug::create($data + ['review_id' => $review->id, 'reported_by' => $request->user()->id])], 201);
    }

    /** The developer or team lead marks a bug Fixed; the QA person marks it Verified. */
    public function updateBug(Request $request, QaBug $bug)
    {
        $review = QaReview::findOrFail($bug->review_id);
        $data = $request->validate(['status' => ['required', Rule::in(['Open', 'Fixed', 'Verified'])]]);
        $user = $request->user();

        if ($data['status'] === 'Verified') {
            abort_unless($this->canTest($user, $review), 403, 'Only the QA person can verify a bug.');
        } else {
            abort_unless($this->canFix($user, $review) || $this->canTest($user, $review), 403, 'You cannot update this bug.');
        }
        $bug->update($data);

        return response()->json(['data' => $bug->fresh()]);
    }

    /** Pass (no open bugs) or fail (at least one bug). The task moves on automatically and the right people are told. */
    public function complete(Request $request, QaReview $review)
    {
        abort_unless($this->canTest($request->user(), $review), 403, 'Only the QA person on this review can finish it.');
        abort_unless($review->status === 'In review', 422, 'Take the review first.');
        $data = $request->validate(['result' => ['required', Rule::in(['pass', 'fail'])], 'note' => 'nullable|string|max:2000']);

        $bugs = $review->bugs()->get();
        $open = $bugs->where('status', 'Open')->count();
        if ($data['result'] === 'pass' && $open > 0) {
            return $this->refuse("There are {$open} open bug(s). Mark them fixed or verified before passing, or fail the review.", 'result');
        }
        if ($data['result'] === 'fail' && $bugs->isEmpty()) {
            return $this->refuse('List at least one bug before failing a review.', 'result');
        }

        $item = SprintItem::findOrFail($review->sprint_item_id);
        $sprint = WorkSprint::findOrFail($review->sprint_id);
        $project = Project::findOrFail($review->project_id);
        $pass = $data['result'] === 'pass';
        $newStatus = $pass ? 'Waiting for approval' : 'Testing bugs ' . min(3, $review->round);
        $from = $item->status;

        DB::transaction(function () use ($review, $item, $sprint, $pass, $newStatus, $from, $data, $request, $bugs) {
            $review->update(['status' => $pass ? 'Passed' : 'Failed', 'completed_at' => now(), 'note' => $data['note'] ?? null]);
            $item->update(['status' => $newStatus]);
            SprintEvent::create(['sprint_id' => $sprint->id, 'item_id' => $item->id, 'user_id' => $request->user()->id, 'from_status' => $from, 'to_status' => $newStatus,
                'note' => $pass ? "QA passed (round {$review->round})" : "QA failed round {$review->round}: {$bugs->count()} bug(s)" . (empty($data['note']) ? '' : ". {$data['note']}")]);
        });

        $lead = User::whereIn('id', [Team::find($sprint->team_id)?->team_lead_id])->get();
        if ($pass) {
            Notify::users($lead, 'QA passed', "\"{$project->name}\": \"{$item->title}\" passed QA. Please verify and approve it.", 'qa_passed', $project->id, $request->user());
        } else {
            Notify::users($lead->merge(User::where('id', $item->assigned_to)->get()), 'QA found bugs', "\"{$project->name}\": \"{$item->title}\" failed QA round {$review->round} with {$bugs->count()} bug(s). It is back with the developer.", 'qa_failed', $project->id, $request->user());
        }

        return response()->json(['data' => $review->fresh(), 'task_status' => $newStatus]);
    }

    // ---- helpers -------------------------------------------------------------------

    private function isQa(User $user): bool
    {
        return Access::inTeam($user, 'qa');
    }

    private function canTest(User $user, QaReview $review): bool
    {
        return $this->isQa($user) && ($review->assigned_to === $user->id || Access::has('qa_lead', $user));
    }

    private function canFix(User $user, QaReview $review): bool
    {
        $item = SprintItem::find($review->sprint_item_id);
        $sprint = $item?->sprint;

        return $item && $sprint && ($item->assigned_to === $user->id || WorkAccess::canManageSprint($user, $sprint->team_id));
    }

    private function rows($reviews)
    {
        $items = SprintItem::whereIn('id', $reviews->pluck('sprint_item_id'))->get()->keyBy('id');
        $projects = Project::whereIn('id', $reviews->pluck('project_id'))->pluck('name', 'id');
        $bugs = QaBug::whereIn('review_id', $reviews->pluck('id'))->selectRaw('review_id, count(*) as total, sum(status = ?) as open', ['Open'])->groupBy('review_id')->get()->keyBy('review_id');

        return $reviews->map(fn ($r) => $r->toArray() + [
            'project_name' => $projects[$r->project_id] ?? null, 'task' => $items[$r->sprint_item_id]->title ?? null,
            'bugs_total' => (int) ($bugs[$r->id]->total ?? 0), 'bugs_open' => (int) ($bugs[$r->id]->open ?? 0),
        ])->values();
    }

    private function refuse(string $msg, string $field)
    {
        return response()->json(['message' => $msg, 'errors' => [$field => [$msg]]], 422);
    }
}
