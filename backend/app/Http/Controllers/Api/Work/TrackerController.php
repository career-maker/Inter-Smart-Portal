<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudgetAllocation;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use App\Support\WorkAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The department tables on a project: Design (pages), Frontend/HTML (pages with timeline sub-tasks) and Dev (tasks).
 * Header figures are fetched, not typed: allocated = what the project manager gave those departments (person-days),
 * used = what the table itself adds up to, deviation = allocated - used.
 */
class TrackerController extends Controller
{
    public const KINDS = ['design', 'frontend', 'dev'];
    private const TAB = ['design' => 'ui', 'frontend' => 'ux', 'dev' => 'dev'];
    public const STATUSES = ['Completed', 'Pending', 'In progress', 'Yet to start', 'Correction'];
    public const PROGRESS = ['Not started', 'In progress', 'On hold', 'Completed'];
    public const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
    public const WORK_TYPES = ['Backend', 'Frontend', 'Backend & Frontend', 'Dev-Backend API'];
    public const CLIENT = ['Not shared', 'Shared', 'Approved', 'Changes requested'];
    private const HOURS_PER_DAY = 8;

    /** Teams of each kind. Design and Frontend are matched by name prefix; everything else that does delivery work is Dev (PHP, WordPress, React ...). */
    public static function teamIds(string $kind, Project $project): array
    {
        $all = Team::whereIn('id', ProjectBudgetAllocation::where('project_id', $project->id)->pluck('team_id'))->get();

        return $all->filter(function ($t) use ($kind) {
            $n = strtolower(trim($t->name));
            $office = (bool) preg_match('/^(pmo|sales|accounts|qa)/', $n);
            $design = str_starts_with($n, 'design');
            $front = str_starts_with($n, 'html') || str_starts_with($n, 'front');

            return ! $office && match ($kind) { 'design' => $design, 'frontend' => $front, default => ! $design && ! $front };
        })->pluck('id')->all();
    }

    /** Who may add, change and remove rows of a kind: project manager, a member/lead of that kind of department, and (Design and Frontend only) the project coordinator. Dev is view-only for the coordinator. */
    private function canEdit(User $user, Project $project, string $kind): bool
    {
        if (Access::pmoManager($user) || ($kind !== 'dev' && $project->project_coordinator_id === $user->id)) {
            return true;
        }
        $teams = $kind === 'design' ? WorkAccess::uiTeamIds() : self::teamIds($kind, $project);
        $mine = array_filter(array_merge([$user->team_id], WorkAccess::ledTeamIds($user)));

        return count(array_intersect($mine, $teams)) > 0;
    }

    /** Planned hours (Frontend sub-tasks) belong to the project manager and the HTML team; the coordinator cannot change them. */
    private function canEditHours(User $user, Project $project): bool
    {
        if (Access::pmoManager($user)) {
            return true;
        }
        $mine = array_filter(array_merge([$user->team_id], WorkAccess::ledTeamIds($user)));

        return count(array_intersect($mine, self::teamIds('frontend', $project))) > 0;
    }

    /** Allocated and used person-days for a kind, the same figures the table header shows. */
    public static function figures(Project $project, string $kind): array
    {
        $teamIds = $kind === 'design' ? WorkAccess::uiTeamIds() : self::teamIds($kind, $project);
        $allocated = (float) ProjectBudgetAllocation::where('project_id', $project->id)->whereIn('team_id', $teamIds)->sum('amount');
        $rowIds = DB::table('work_tracker_rows')->where('project_id', $project->id)->where('kind', $kind)->pluck('id');
        $used = match ($kind) {
            'design' => (float) DB::table('work_tracker_rows')->whereIn('id', $rowIds)->sum('days'),
            'frontend' => (float) DB::table('work_tracker_subtasks')->whereIn('row_id', $rowIds)->sum('hours') / self::HOURS_PER_DAY,
            default => (float) DB::table('work_tracker_rows')->whereIn('id', $rowIds)->sum('hours') / self::HOURS_PER_DAY,
        };

        return ['allocated_days' => $allocated, 'used_days' => round($used, 2), 'deviation_days' => round($allocated - $used, 2)];
    }

    private function names(array $ids): array
    {
        $u = User::whereIn('id', $ids)->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $u->has($id) ? ['id' => (int) $id, 'name' => trim($u[$id]->first_name . ' ' . $u[$id]->last_name)] : null)->filter()->values()->all();
    }

    public function index(Request $request, Project $project, string $kind)
    {
        abort_unless(in_array($kind, self::KINDS, true), 404);
        $user = $request->user();
        abort_unless(WorkAccess::canWork($user, $project), 403, 'This project is not on your work list.');
        WorkAccess::requireOpenTab($project, self::TAB[$kind]);

        $rows = DB::table('work_tracker_rows')->where('project_id', $project->id)->where('kind', $kind)->orderBy('no')->orderBy('id')->get();
        $subs = DB::table('work_tracker_subtasks')->whereIn('row_id', $rows->pluck('id'))->orderBy('id')->get()->groupBy('row_id');
        $allIds = $rows->flatMap(fn ($r) => json_decode((string) $r->members, true) ?: [])->unique()->all();
        $nm = collect($this->names($allIds))->keyBy('id');
        $qa = DB::table('qa_requests')->whereIn('row_id', $rows->pluck('id'))->where('status', '!=', 'Done')->pluck('status', 'row_id');

        $teamIds = $kind === 'design' ? WorkAccess::uiTeamIds() : self::teamIds($kind, $project);
        $allocated = (float) ProjectBudgetAllocation::where('project_id', $project->id)->whereIn('team_id', $teamIds)->sum('amount');

        $out = $rows->map(function ($r) use ($subs, $nm, $qa, $kind) {
            $sub = $subs->get($r->id, collect());
            $ids = json_decode((string) $r->members, true) ?: [];

            return array_merge((array) $r, [
                'members' => $ids, 'member_names' => collect($ids)->map(fn ($i) => $nm[$i]['name'] ?? null)->filter()->values(),
                'subtasks' => $sub->values(), 'planned_hours' => (float) $sub->sum('hours'), 'qa_status' => $qa[$r->id] ?? null,
            ]);
        });

        $usedDays = match ($kind) {
            'design' => (float) $rows->sum('days'),
            'frontend' => (float) $out->sum('planned_hours') / self::HOURS_PER_DAY,
            default => (float) $rows->sum('hours') / self::HOURS_PER_DAY,
        };

        $pool = User::whereIn('team_id', $teamIds)->where('status', 'Active')->get(['id', 'first_name', 'last_name'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => trim("{$u->first_name} {$u->last_name}")])->values();

        return response()->json([
            'rows' => $out->values(),
            'summary' => ['allocated_days' => $allocated, 'used_days' => round($usedDays, 2), 'deviation_days' => round($allocated - $usedDays, 2),
                'allocated_hours' => $allocated * self::HOURS_PER_DAY, 'used_hours' => round($usedDays * self::HOURS_PER_DAY, 2), 'deviation_hours' => round(($allocated - $usedDays) * self::HOURS_PER_DAY, 2)],
            'options' => ['statuses' => self::STATUSES, 'progress' => self::PROGRESS, 'priorities' => self::PRIORITIES, 'work_types' => self::WORK_TYPES, 'client' => self::CLIENT, 'members' => $pool],
            'can_edit' => $this->canEdit($user, $project, $kind), 'can_edit_hours' => $this->canEditHours($user, $project),
        ]);
    }

    private function rules(string $kind): array
    {
        $r = [
            'no' => 'nullable|integer|min:1|max:100000', 'name' => 'required|string|max:255', 'link' => 'nullable|string|max:1000',
            'members' => 'nullable|array', 'members.*' => 'integer|exists:users,id',
            'status' => ['nullable', Rule::in($kind === 'dev' ? self::PROGRESS : self::STATUSES)],
        ];
        if ($kind === 'design') {
            $r += ['priority' => ['nullable', Rule::in(self::PRIORITIES)], 'client_status' => ['nullable', Rule::in(self::CLIENT)], 'days' => 'nullable|numeric|min:0|max:10000'];
        }
        if ($kind === 'frontend') {
            $r += ['subtasks' => 'nullable|array', 'subtasks.*.title' => 'required|string|max:255', 'subtasks.*.hours' => 'required|numeric|min:0|max:10000'];
        }
        if ($kind === 'dev') {
            $r += ['work_type' => ['nullable', Rule::in(self::WORK_TYPES)], 'hours' => 'nullable|numeric|min:0|max:100000'];
        }

        return $r;
    }

    public function store(Request $request, Project $project, string $kind)
    {
        abort_unless(in_array($kind, self::KINDS, true), 404);
        abort_unless($this->canEdit($request->user(), $project, $kind), 403, 'Only the department team, the coordinator or the project manager can change this table.');
        WorkAccess::requireOpenTab($project, self::TAB[$kind]);
        $d = $request->validate($this->rules($kind));

        $no = $d['no'] ?? ((int) DB::table('work_tracker_rows')->where('project_id', $project->id)->where('kind', $kind)->max('no') + 1);
        $id = DB::table('work_tracker_rows')->insertGetId([
            'project_id' => $project->id, 'kind' => $kind, 'no' => $no, 'name' => $d['name'], 'priority' => $d['priority'] ?? ($kind === 'design' ? 'P2' : null),
            'status' => $d['status'] ?? ($kind === 'dev' ? 'Not started' : 'Yet to start'), 'link' => $d['link'] ?? null, 'work_type' => $d['work_type'] ?? null,
            'client_status' => $d['client_status'] ?? null, 'members' => json_encode(array_map('intval', $d['members'] ?? [])),
            'days' => $d['days'] ?? null, 'hours' => $d['hours'] ?? null, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ($this->canEditHours($request->user(), $project) ? ($d['subtasks'] ?? []) : [] as $s) {
            DB::table('work_tracker_subtasks')->insert(['row_id' => $id, 'title' => $s['title'], 'hours' => $s['hours'], 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->tell($project, $kind, $d['members'] ?? [], $d['name'], $request->user());

        return response()->json(['data' => DB::table('work_tracker_rows')->find($id)], 201);
    }

    public function update(Request $request, int $row)
    {
        $r = DB::table('work_tracker_rows')->find($row);
        abort_unless($r, 404);
        $project = Project::findOrFail($r->project_id);
        abort_unless($this->canEdit($request->user(), $project, $r->kind), 403, 'Only the department team, the coordinator or the project manager can change this table.');
        $d = $request->validate(array_map(fn ($rule) => is_string($rule) ? str_replace('required|', 'sometimes|required|', $rule) : $rule, $this->rules($r->kind)));

        $set = collect($d)->only(['no', 'name', 'priority', 'status', 'link', 'work_type', 'client_status', 'days', 'hours'])->all();
        if (array_key_exists('members', $d)) {
            $set['members'] = json_encode(array_map('intval', $d['members'] ?? []));
            $new = array_diff($d['members'] ?? [], json_decode((string) $r->members, true) ?: []);
            $this->tell($project, $r->kind, $new, $r->name, $request->user());
        }
        DB::table('work_tracker_rows')->where('id', $row)->update($set + ['updated_at' => now()]);

        return response()->json(['data' => DB::table('work_tracker_rows')->find($row)]);
    }

    public function destroy(Request $request, int $row)
    {
        $r = DB::table('work_tracker_rows')->find($row);
        abort_unless($r, 404);
        abort_unless($this->canEdit($request->user(), Project::findOrFail($r->project_id), $r->kind), 403, 'Only the department team, the coordinator or the project manager can change this table.');
        DB::table('work_tracker_rows')->where('id', $row)->delete();

        return response()->json(['message' => 'Removed.']);
    }

    public function addSubtask(Request $request, int $row)
    {
        $r = DB::table('work_tracker_rows')->find($row);
        abort_unless($r && $r->kind === 'frontend', 404);
        abort_unless($this->canEditHours($request->user(), Project::findOrFail($r->project_id)), 403, 'Only the Frontend team or the project manager can change planned hours.');
        $d = $request->validate(['title' => 'required|string|max:255', 'hours' => 'required|numeric|min:0|max:10000']);
        $id = DB::table('work_tracker_subtasks')->insertGetId($d + ['row_id' => $row, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => DB::table('work_tracker_subtasks')->find($id)], 201);
    }

    public function destroySubtask(Request $request, int $subtask)
    {
        $s = DB::table('work_tracker_subtasks')->find($subtask);
        abort_unless($s, 404);
        $r = DB::table('work_tracker_rows')->find($s->row_id);
        abort_unless($this->canEditHours($request->user(), Project::findOrFail($r->project_id)), 403, 'Only the Frontend team or the project manager can change planned hours.');
        DB::table('work_tracker_subtasks')->where('id', $subtask)->delete();

        return response()->json(['message' => 'Removed.']);
    }

    private function tell(Project $project, string $kind, array $memberIds, string $name, User $actor): void
    {
        $people = User::whereIn('id', $memberIds)->where('id', '!=', $actor->id)->get();
        if ($people->isNotEmpty()) {
            Notify::users($people, 'Work assigned', "\"{$project->name}\": you were given \"{$name}\" ({$kind}).", 'item_assigned', $project->id, $actor);
        }
    }
}
