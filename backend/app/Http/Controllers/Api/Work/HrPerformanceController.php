<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * HR performance view: the raw numbers per person (task completion on time, effort against estimate, QA bugs, monthly feedback scores).
 * It deliberately computes NO rating: the formula is not approved yet, so HR reads the figures and judges.
 */
class HrPerformanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! (Access::hr($user) || $user->hasRole('Super Admin'))) {
            $m = 'Performance figures are for HR.';

            return response()->json(['message' => $m, 'errors' => ['performance' => [$m]]], 403);
        }
        $teamId = $request->integer('team_id') ?: null;

        $people = User::where('status', 'Active')->whereNotNull('team_id')->when($teamId, fn ($q) => $q->where('team_id', $teamId))->with('team:id,name')->orderBy('first_name')->get();
        $ids = $people->pluck('id');

        $items = DB::table('sprint_items as i')->join('work_sprints as s', 's.id', '=', 'i.sprint_id')->whereIn('i.assigned_to', $ids)
            ->get(['i.id', 'i.assigned_to', 'i.status', 'i.effort_days', 'i.time_spent_days', 'i.updated_at', 's.end_date'])->groupBy('assigned_to');
        $bugs = DB::table('qa_bugs as b')->join('qa_reviews as r', 'r.id', '=', 'b.review_id')->join('sprint_items as i', 'i.id', '=', 'r.sprint_item_id')->whereIn('i.assigned_to', $ids)
            ->selectRaw('i.assigned_to, count(*) as total, sum(b.priority in ("High","Critical")) as serious')->groupBy('i.assigned_to')->get()->keyBy('assigned_to');
        $feedback = DB::table('team_feedback')->whereIn('user_id', $ids)->orderByDesc('month')->get()->groupBy('user_id');

        $rows = $people->map(function ($p) use ($items, $bugs, $feedback) {
            $mine = $items->get($p->id, collect());
            $done = $mine->whereIn('status', ['Completed', 'Approved']);
            $late = $done->filter(fn ($i) => $i->end_date && substr((string) $i->updated_at, 0, 10) > substr((string) $i->end_date, 0, 10));
            $est = (float) $done->sum('effort_days');
            $spent = (float) $done->sum('time_spent_days');
            $fb = $feedback->get($p->id, collect());
            $avg = fn ($rowset) => $rowset->isEmpty() ? null : round($rowset->map(fn ($f) => ($f->attitude + $f->attire + $f->learning + $f->on_time) / 4)->avg(), 2);

            return [
                'id' => $p->id, 'name' => trim("{$p->first_name} {$p->last_name}"), 'team' => $p->team?->name, 'designation' => $p->designation,
                'tasks_assigned' => $mine->count(), 'tasks_done' => $done->count(), 'tasks_done_late' => $late->count(),
                'on_time_percent' => $done->count() ? round(100 * ($done->count() - $late->count()) / $done->count(), 1) : null,
                'effort_estimated_days' => $est, 'effort_spent_days' => $spent, 'effort_variance_days' => round($spent - $est, 2),
                'qa_bugs' => (int) ($bugs->get($p->id)->total ?? 0), 'qa_bugs_serious' => (int) ($bugs->get($p->id)->serious ?? 0),
                'feedback_count' => $fb->count(), 'feedback_latest_month' => $fb->first()->month ?? null, 'feedback_latest_avg' => $avg($fb->take(1)), 'feedback_overall_avg' => $avg($fb),
            ];
        });

        return response()->json(['data' => $rows->values(), 'teams' => Team::orderBy('name')->get(['id', 'name']), 'note' => 'Figures only. No rating is calculated until HR approves a formula.']);
    }
}
