<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Api\Work\MeetingController;
use App\Models\OutOfScopeRequest;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use Illuminate\Http\Request;

/**
 * The Project Office raises extra paid work; Sales answers it with a reason (approve or reject) or asks for a meeting.
 * "Action required" = no Sales answer yet (a flag here, plus a notification when it is raised). The project manager's own decision is separate.
 */
class OutOfScopeController extends Controller
{
    private function mine(Request $request)
    {
        $q = OutOfScopeRequest::query();
        if (! Access::salesSeesAll($request->user())) {
            $q->whereIn('project_id', ProjectFinance::where('sales_user_id', $request->user()->id)->pluck('project_id'));
        }

        return $q;
    }

    public function index(Request $request)
    {
        $rows = $this->mine($request)->orderByRaw('sales_status is null desc')->orderByDesc('id')->limit(200)->get();
        $projects = Project::whereIn('id', $rows->pluck('project_id'))->pluck('name', 'id');

        return response()->json(['data' => $rows->map(fn ($r) => $r->toArray() + [
            'project_name' => $projects[$r->project_id] ?? null,
            'action_required' => $r->sales_status === null || $r->sales_status === 'Meeting requested',
        ])]);
    }

    public function reply(Request $request, OutOfScopeRequest $oos)
    {
        $user = $request->user();
        if (! $this->mine($request)->whereKey($oos->id)->exists()) {
            $m = 'This request is not on one of your projects.';

            return response()->json(['message' => $m, 'errors' => ['reply' => [$m]]], 403);
        }
        if (in_array($oos->sales_status, ['Approved', 'Rejected'], true)) {
            $m = "You already answered this request ({$oos->sales_status}).";

            return response()->json(['message' => $m, 'errors' => ['reply' => [$m]]], 422);
        }

        $d = $request->validate([
            'answer' => ['required', 'in:approve,reject,meeting'],
            'reason' => ['required_if:answer,approve,reject', 'nullable', 'string', 'max:2000'],
            'starts_at' => ['required_if:answer,meeting', 'nullable', 'date_format:Y-m-d H:i'],
            'ends_at' => ['required_if:answer,meeting', 'nullable', 'date_format:Y-m-d H:i', 'after:starts_at'],
        ], ['reason.required_if' => 'Give a reason for your answer.', 'starts_at.required_if' => 'Pick when the meeting should be.', 'ends_at.required_if' => 'Pick when the meeting ends.']);

        $project = Project::find($oos->project_id);
        $managers = Access::pmoManagers();
        $coordinator = User::where('id', $oos->requested_by)->get();

        if ($d['answer'] === 'meeting') {
            $meeting = app(MeetingController::class)->schedule($user, [
                'kind' => 'client', 'title' => "Out-of-scope: {$project->name}", 'project_id' => $project->id,
                'starts_at' => $d['starts_at'], 'ends_at' => $d['ends_at'], 'agenda' => $oos->description . (! empty($d['reason']) ? "\n\nNote from Sales: {$d['reason']}" : ''),
                'attendee_ids' => $managers->pluck('id')->merge($coordinator->pluck('id'))->reject(fn ($id) => $id === $user->id)->unique()->values()->all(),
            ]);
            $oos->update(['sales_status' => 'Meeting requested', 'sales_reason' => $d['reason'] ?? null, 'sales_replied_by' => $user->id, 'sales_replied_at' => now(), 'sales_meeting_id' => $meeting->id]);
            $say = 'asked for a meeting';
        } else {
            $status = $d['answer'] === 'approve' ? 'Approved' : 'Rejected';
            $oos->update(['sales_status' => $status, 'sales_reason' => $d['reason'], 'sales_replied_by' => $user->id, 'sales_replied_at' => now()]);
            $say = strtolower($status) . " it: {$d['reason']}";
        }
        Notify::users($managers->merge($coordinator), 'Sales answered an out-of-scope request', "\"{$project->name}\": Sales {$say}", 'out_of_scope_sales_reply', $project->id, $user);

        return response()->json(['message' => 'Your answer was sent to the Project Office.', 'data' => $oos->fresh()]);
    }
}
