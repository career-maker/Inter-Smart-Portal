<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Super Admin only: find and delete content that users created (single, selected or everything matching a
 * user / department filter). Tables with a deleted_at column are soft-deleted; the rest are removed with their children.
 */
class ContentCleanupController extends Controller
{
    /** key => [label, table, owner column, title column, [child table => foreign key]] */
    public const TYPES = [
        'community_posts' => ['Community posts', 'community_posts', 'user_id', 'content', ['community_post_comments' => 'post_id', 'community_post_likes' => 'post_id']],
        'community_comments' => ['Community comments', 'community_post_comments', 'user_id', 'comment', []],
        'announcements' => ['Announcements', 'announcements', 'created_by', 'title', []],
        'issues' => ['Issues / concerns', 'issues', 'user_id', 'title', ['issue_comments' => 'issue_id', 'issue_attachments' => 'issue_id']],
        'issue_comments' => ['Issue comments', 'issue_comments', 'user_id', 'comment', []],
        'birthday_wishes' => ['Birthday wishes', 'birthday_wishes', 'sender_id', 'message', []],
        'sticky_notes' => ['Sticky notes', 'sticky_notes', 'user_id', 'title', []],
        'leave_requests' => ['Leave requests', 'leave_requests', 'user_id', 'reason', []],
        'wfh_requests' => ['WFH requests', 'wfh_requests', 'user_id', 'reason', []],
        'ta_requests' => ['Travel allowance requests', 'ta_requests', 'user_id', 'reason', []],
        'recognitions' => ['Recognitions', 'recognitions', 'created_by', 'title', []],
        'appreciations' => ['Appreciation nominations', 'appreciations', 'nominated_by', 'title', []],
        'meetings' => ['Meetings', 'meetings', 'organizer_id', 'title', ['meeting_user' => 'meeting_id', 'meeting_actions' => 'meeting_id']],
        'leads' => ['Sales leads', 'leads', 'owner_id', 'name', ['lead_activities' => 'lead_id']],
        'projects' => ['Projects', 'pm_projects', 'created_by', 'name', []],
        'tasks' => ['Project tasks', 'pm_tasks', 'created_by', 'title', []],
        'task_comments' => ['Task comments', 'pm_task_comments', 'user_id', 'comment', []],
        'corrections' => ['Corrections', 'pm_corrections', 'raised_by', 'description', []],
        'chat_messages' => ['Chat messages', 'chat_messages', 'sender_id', 'message', []],
        'document_requests' => ['Document requests', 'document_requests', 'user_id', 'subject', ['document_uploads' => 'document_request_id']],
        'customer_feedback' => ['Customer feedback notes', 'customer_feedback', 'recorded_by', 'notes', []],
        'work_changes' => ['Work changes', 'work_changes', 'requested_by', 'title', []],
        'out_of_scope' => ['Out-of-scope requests', 'out_of_scope_requests', 'requested_by', 'description', []],
        'sprints' => ['Sprints', 'work_sprints', 'created_by', 'title', ['sprint_items' => 'sprint_id', 'sprint_events' => 'sprint_id']],
        'holidays' => ['Holidays', 'holidays', 'created_by', 'name', []],
        'policies' => ['HR policies', 'hr_policies', 'created_by', 'title', []],
        'profile_requests' => ['Profile update requests', 'profile_update_requests', 'user_id', 'status', []],
        'bugs' => ['Bugs', 'bugzilla_bugs', 'reporter_id', 'summary', ['bugzilla_comments' => 'bug_id', 'bugzilla_history' => 'bug_id', 'bugzilla_attachments' => 'bug_id']],
    ];

    private function def(string $key): array
    {
        abort_unless(isset(self::TYPES[$key]), 422, 'Unknown content type.');
        [$label, $table, $owner, $title, $children] = self::TYPES[$key];
        abort_unless(Schema::hasTable($table), 422, 'This content type is not available on this server.');

        return compact('label', 'table', 'owner', 'title', 'children');
    }

    private function base(array $t, Request $request)
    {
        $q = DB::table($t['table'])
            ->leftJoin('users as cu', 'cu.id', '=', "{$t['table']}.{$t['owner']}")
            ->leftJoin('teams as ct', 'ct.id', '=', 'cu.team_id');
        if (Schema::hasColumn($t['table'], 'deleted_at')) {
            $q->whereNull("{$t['table']}.deleted_at");
        }
        if ($request->filled('user_id')) {
            $q->where("{$t['table']}.{$t['owner']}", (int) $request->input('user_id'));
        }
        if ($request->filled('team_id')) {
            $q->where('cu.team_id', (int) $request->input('team_id'));
        }
        if ($request->filled('q')) {
            $q->where("{$t['table']}.{$t['title']}", 'like', '%' . $request->input('q') . '%');
        }

        return $q;
    }

    /** Content types with the number of items each holds. */
    public function types()
    {
        $out = [];
        foreach (self::TYPES as $key => $m) {
            if (! Schema::hasTable($m[1])) {
                continue;
            }
            $q = DB::table($m[1]);
            if (Schema::hasColumn($m[1], 'deleted_at')) {
                $q->whereNull('deleted_at');
            }
            $out[] = ['key' => $key, 'label' => $m[0], 'count' => $q->count()];
        }

        return response()->json([
            'types' => $out,
            'users' => DB::table('users')->whereNull('deleted_at')->orderBy('first_name')->get(['id', 'first_name', 'last_name', 'team_id'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => trim($u->first_name . ' ' . $u->last_name), 'team_id' => $u->team_id]),
            'teams' => DB::table('teams')->whereNull('deleted_at')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function index(Request $request)
    {
        $t = $this->def((string) $request->input('type'));
        $q = $this->base($t, $request);
        $total = (clone $q)->count();
        $rows = $q->orderByDesc("{$t['table']}.id")->forPage(max(1, (int) $request->input('page', 1)), 25)
            ->get(["{$t['table']}.id", DB::raw("{$t['table']}.{$t['title']} as title"), "{$t['table']}.created_at", 'cu.first_name', 'cu.last_name', 'ct.name as team'])
            ->map(fn ($r) => [
                'id' => $r->id,
                'title' => mb_substr(trim(strip_tags((string) $r->title)) ?: '(no text)', 0, 140),
                'created_at' => $r->created_at,
                'owner' => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'team' => $r->team ?: 'No department',
            ]);

        return response()->json(['items' => $rows, 'total' => $total, 'per_page' => 25]);
    }

    /** Delete chosen ids, or (all_matching) everything the filters match. All matching needs confirm = DELETE. */
    public function destroy(Request $request)
    {
        $d = $request->validate([
            'type' => ['required', 'string'],
            'ids' => ['nullable', 'array', 'max:500'],
            'ids.*' => ['integer'],
            'all_matching' => ['nullable', 'boolean'],
            'confirm' => ['nullable', 'string'],
        ]);
        $t = $this->def($d['type']);

        if (! empty($d['all_matching'])) {
            abort_unless(($d['confirm'] ?? '') === 'DELETE', 422, 'Type DELETE to confirm deleting everything that matches.');
            abort_unless($request->filled('user_id') || $request->filled('team_id') || $request->filled('q'), 422, 'Pick a user, a department or a search word first, so you do not wipe the whole list by accident.');
            $ids = $this->base($t, $request)->pluck("{$t['table']}.id")->all();
        } else {
            abort_if(empty($d['ids']), 422, 'Select at least one item.');
            $ids = $d['ids'];
        }

        $soft = Schema::hasColumn($t['table'], 'deleted_at');
        $done = 0;
        $failed = 0;
        foreach (array_chunk($ids, 100) as $chunk) {
            foreach ($chunk as $id) {
                try {
                    DB::transaction(function () use ($t, $id, $soft) {
                        if ($soft) {
                            DB::table($t['table'])->where('id', $id)->update(['deleted_at' => now()]);

                            return;
                        }
                        foreach ($t['children'] as $child => $fk) {
                            if (Schema::hasTable($child)) {
                                DB::table($child)->where($fk, $id)->delete();
                            }
                        }
                        DB::table($t['table'])->where('id', $id)->delete();
                    });
                    $done++;
                } catch (\Throwable $e) {
                    $failed++;
                }
            }
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => "deleted {$done} {$t['label']} through Content cleanup",
            'model_type' => 'ContentCleanup',
            'model_id' => 0,
            'changes' => json_encode(['type' => $d['type'], 'filters' => $request->only('user_id', 'team_id', 'q'), 'deleted' => $done, 'failed' => $failed, 'ids' => array_slice($ids, 0, 200)]),
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => "Deleted {$done}" . ($failed ? ", {$failed} could not be deleted (still in use)." : '.'), 'deleted' => $done, 'failed' => $failed]);
    }
}
