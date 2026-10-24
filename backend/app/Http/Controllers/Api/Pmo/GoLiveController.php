<?php

namespace App\Http\Controllers\Api\Pmo;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Models\Team;
use App\Models\User;
use App\Support\Access;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Two hand-overs from the Project Office: asking Accounts for the next payment, and the go-live steps with the system admin
 * team (coordinator requests a server, the system admin allocates it and marks the project live).
 */
class GoLiveController extends Controller
{
    /** Coordinator or manager asks Accounts for a payment. It appears in Accounts as "Awaiting". */
    public function requestPayment(Request $request, Project $project)
    {
        abort_unless(PmoProjectController::canView($request->user(), $project), 403, 'This project is not assigned to you.');
        $data = $request->validate(['kind' => ['required', Rule::in(['installment', 'final'])], 'amount' => 'required|numeric|gt:0|max:100000000', 'due_date' => 'nullable|date', 'notes' => 'nullable|string|max:2000']);

        $payment = ProjectPayment::create($data + ['project_id' => $project->id, 'status' => 'Awaiting', 'requested_by' => $request->user()->id]);
        $accounts = User::whereHas('team', fn ($q) => $q->where('name', 'like', 'accounts%'))->get();
        Notify::users($accounts, 'Payment requested', "\"{$project->name}\": the Project Office asks for a {$data['kind']} payment of " . number_format($data['amount'], 2) . '.', 'payment_requested', $project->id, $request->user());

        return response()->json(['data' => $payment], 201);
    }

    public function show(Request $request, Project $project)
    {
        abort_unless(PmoProjectController::canView($request->user(), $project) || $this->isSystemAdmin($request->user()), 403, 'This project is not assigned to you.');

        return response()->json(['data' => DB::table('project_go_live')->where('project_id', $project->id)->first(), 'can_handle' => $this->isSystemAdmin($request->user())]);
    }

    /** System admin queue: every project that asked for a server and is not live yet. */
    public function queue(Request $request)
    {
        abort_unless($this->isSystemAdmin($request->user()), 403, 'Only the system admin team can see this.');
        $rows = DB::table('project_go_live')->where('status', '!=', 'Live')->orderBy('id')->get();
        $names = Project::whereIn('id', $rows->pluck('project_id'))->pluck('name', 'id');

        return response()->json(['data' => $rows->map(fn ($r) => (array) $r + ['project_name' => $names[$r->project_id] ?? null])]);
    }

    public function requestServer(Request $request, Project $project)
    {
        abort_unless(PmoProjectController::canView($request->user(), $project), 403, 'This project is not assigned to you.');
        $data = $request->validate(['request_note' => 'nullable|string|max:2000']);
        if (DB::table('project_go_live')->where('project_id', $project->id)->exists()) {
            return response()->json(['message' => 'A server has already been requested for this project.', 'errors' => ['request_note' => ['A server has already been requested for this project.']]], 422);
        }

        DB::table('project_go_live')->insert(['project_id' => $project->id, 'status' => 'Requested', 'request_note' => $data['request_note'] ?? null, 'requested_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        Notify::users($this->systemAdmins(), 'Server requested', "\"{$project->name}\": please allocate a server so the project can go live.", 'server_requested', $project->id, $request->user());

        return response()->json(['data' => DB::table('project_go_live')->where('project_id', $project->id)->first()], 201);
    }

    /** System admin: Requested -> Allocated (with details) -> Live (with the public address). */
    public function handle(Request $request, Project $project)
    {
        abort_unless($this->isSystemAdmin($request->user()), 403, 'Only the system admin team can do this.');
        $row = DB::table('project_go_live')->where('project_id', $project->id)->first();
        abort_unless($row, 422, 'No server has been requested for this project.');
        $data = $request->validate(['step' => ['required', Rule::in(['allocate', 'live'])], 'server_details' => 'nullable|string|max:1000', 'live_url' => 'nullable|url|max:1000']);

        $told = User::whereIn('id', collect([$row->requested_by, $project->project_coordinator_id])->filter()->unique())->get()->merge(Access::pmoManagers());
        if ($data['step'] === 'allocate') {
            if (empty($data['server_details'])) {
                return response()->json(['message' => 'Say which server was allocated.', 'errors' => ['server_details' => ['Say which server was allocated.']]], 422);
            }
            abort_unless($row->status === 'Requested', 422, 'The server was already allocated.');
            DB::table('project_go_live')->where('id', $row->id)->update(['status' => 'Allocated', 'server_details' => $data['server_details'], 'handled_by' => $request->user()->id, 'allocated_at' => now(), 'updated_at' => now()]);
            Notify::users($told, 'Server allocated', "\"{$project->name}\": a server has been allocated.", 'server_allocated', $project->id, $request->user());
        } else {
            abort_unless($row->status === 'Allocated', 422, 'Allocate the server before going live.');
            if (empty($data['live_url'])) {
                return response()->json(['message' => 'Give the live address.', 'errors' => ['live_url' => ['Give the live address.']]], 422);
            }
            DB::table('project_go_live')->where('id', $row->id)->update(['status' => 'Live', 'live_url' => $data['live_url'], 'live_at' => now(), 'updated_at' => now()]);
            $sales = User::whereIn('id', ProjectFinance::where('project_id', $project->id)->pluck('sales_user_id'))->get();
            Notify::users($told->merge($sales), 'Project is live', "\"{$project->name}\" is live at {$data['live_url']}.", 'project_live', $project->id, $request->user());
        }

        return response()->json(['data' => DB::table('project_go_live')->where('project_id', $project->id)->first()]);
    }

    private function systemAdmins()
    {
        return User::whereRaw('lower(trim(designation)) = ?', ['system administrator'])->get();
    }

    private function isSystemAdmin(User $user): bool
    {
        return Access::systemAdmin($user) || $user->hasRole('Super Admin');
    }
}
