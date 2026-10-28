<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Support\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Customer feedback notes. The project manager records them during a project, HR after go-live (the project must be marked live).
 * Project managers, HR and Super Admins can read them all. A score here is for information only; it never feeds a rating.
 */
class CustomerFeedbackController extends Controller
{
    private function refuse(string $message)
    {
        return response()->json(['message' => $message, 'errors' => ['feedback' => [$message]]], 403);
    }

    private function allowed($user): bool
    {
        return Access::hr($user) || Access::pmoManager($user);
    }

    private function isLive(int $projectId): bool
    {
        return DB::table('project_go_live')->where('project_id', $projectId)->where('status', 'Live')->exists();
    }

    /** Projects to pick from, with whether each is live, and all notes (newest first). */
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $this->allowed($user)) {
            return $this->refuse('Customer feedback is for the project manager and HR.');
        }
        $live = DB::table('project_go_live')->where('status', 'Live')->pluck('project_id')->all();
        $projects = Project::orderBy('name')->get(['id', 'name'])->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'live' => in_array($p->id, $live, true)]);
        $rows = DB::table('customer_feedback as f')
            ->join('pm_projects as p', 'p.id', '=', 'f.project_id')
            ->join('users as u', 'u.id', '=', 'f.recorded_by')
            ->orderByDesc('f.call_date')->orderByDesc('f.id')
            ->get(['f.*', 'p.name as project_name', DB::raw("CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name")]);

        return response()->json([
            'data' => $rows,
            'projects' => $projects,
            'stages' => array_values(array_filter([Access::pmoManager($user) ? 'during' : null, (Access::hr($user) || $user->hasRole('Super Admin')) ? 'post_live' : null])),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $this->allowed($user)) { // check permission before looking at the form, so the answer is a clear 403
            return $this->refuse('Customer feedback is for the project manager and HR.');
        }
        $d = $request->validate([
            'project_id' => ['required', 'exists:pm_projects,id'],
            'stage' => ['required', 'in:during,post_live'],
            'contact_name' => ['required', 'string', 'max:255'],
            'call_date' => ['required', 'date', 'before_or_equal:today'],
            'score' => ['nullable', 'integer', 'between:1,5'],
            'notes' => ['required', 'string', 'max:5000'],
        ]);

        if ($d['stage'] === 'during' && ! Access::pmoManager($user)) {
            return $this->refuse('Only the project manager records feedback during a project.');
        }
        if ($d['stage'] === 'post_live') {
            if (! (Access::hr($user) || $user->hasRole('Super Admin'))) {
                return $this->refuse('Only HR records feedback after go-live.');
            }
            if (! $this->isLive($d['project_id'])) {
                return $this->refuse('This project is not live yet, so post-go-live feedback cannot be recorded.');
            }
        }

        $id = DB::table('customer_feedback')->insertGetId($d + ['recorded_by' => $user->id, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['message' => 'Feedback recorded.', 'data' => DB::table('customer_feedback')->find($id)], 201);
    }
}
