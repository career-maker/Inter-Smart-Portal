<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Appreciation;
use App\Models\Recognition;
use App\Support\Access;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Appreciation: team leads, HR and PCs nominate; the project manager or HR approves. Approval shares it on the Hall
 * (a Recognition for 30 days) and as a company announcement.
 */
class AppreciationController extends Controller
{
    private function refuse(string $message)
    {
        return response()->json(['message' => $message, 'errors' => ['appreciation' => [$message]]], 403);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $approver = Access::appreciationApprover($user);
        $q = Appreciation::with(['nominee:id,first_name,last_name', 'nominator:id,first_name,last_name'])->latest();
        if (! $approver) {
            $q->where('nominated_by', $user->id);
        }

        return response()->json([
            'data' => $q->get(),
            'can_nominate' => Access::appreciationNominator($user),
            'can_approve' => $approver,
        ]);
    }

    /** Active people a nominator can pick (id and name only), because nominators may not have access to the employee list. */
    public function people(Request $request)
    {
        if (! Access::appreciationNominator($request->user())) {
            return $this->refuse('Only team leads, HR and the project coordinators can nominate someone.');
        }

        return response()->json(['data' => \App\Models\User::where('status', 'Active')->where('id', '!=', $request->user()->id)->orderBy('first_name')->get(['id', 'first_name', 'last_name'])]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! Access::appreciationNominator($user)) {
            return $this->refuse('Only team leads, HR and the project coordinators can nominate someone.');
        }
        $data = $request->validate([
            'nominee_id' => ['required', 'exists:users,id', 'not_in:' . $user->id],
            'title' => ['required', 'string', 'max:255'],
            'reason' => ['required', 'string', 'max:2000'],
        ], ['nominee_id.not_in' => 'You cannot nominate yourself.']);

        $a = Appreciation::create($data + ['nominated_by' => $user->id]);
        $a->load('nominee:id,first_name,last_name');
        Notify::users(Access::appreciationApprovers(), 'Appreciation nomination', "{$user->first_name} nominated {$a->nominee->first_name} {$a->nominee->last_name}: {$a->title}", 'appreciation.nominated', null, $user);

        return response()->json(['message' => 'Nomination sent for approval.', 'data' => $a], 201);
    }

    public function decide(Request $request, Appreciation $appreciation)
    {
        $user = $request->user();
        if (! Access::appreciationApprover($user)) {
            return $this->refuse('Only the project manager or HR can approve an appreciation.');
        }
        if ($appreciation->status !== 'Pending') {
            return $this->refuse('This nomination was already decided.');
        }
        $data = $request->validate([
            'approve' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:1000', 'required_if:approve,false'],
        ], ['note.required_if' => 'Give a reason when you reject.']);

        DB::transaction(function () use ($appreciation, $data, $user) {
            $appreciation->fill([
                'status' => $data['approve'] ? 'Approved' : 'Rejected',
                'decided_by' => $user->id,
                'decision_note' => $data['note'] ?? null,
                'decided_at' => now(),
            ]);
            if ($data['approve']) {
                $n = $appreciation->nominee;
                $rec = Recognition::create([
                    'user_id' => $n->id, 'title' => $appreciation->title, 'is_custom' => true,
                    'start_date' => now()->toDateString(), 'end_date' => now()->addDays(30)->toDateString(),
                    'description' => $appreciation->reason, 'is_active' => true, 'created_by' => $user->id,
                ]);
                $ann = Announcement::create([
                    'title' => "Appreciation: {$n->first_name} {$n->last_name}",
                    'content' => "{$appreciation->title}\n\n{$appreciation->reason}",
                    'category' => 'Appreciation', 'is_pinned' => false, 'created_by' => $user->id,
                ]);
                $appreciation->recognition_id = $rec->id;
                $appreciation->announcement_id = $ann->id;
            }
            $appreciation->save();
        });

        $msg = $data['approve'] ? 'Approved and shared on the Hall and as an announcement.' : 'Rejected: ' . $data['note'];
        Notify::users([$appreciation->nominator], 'Appreciation ' . strtolower($appreciation->status), "{$appreciation->title}: {$msg}", 'appreciation.decided', null, $user);
        if ($data['approve']) {
            Notify::users([$appreciation->nominee], 'You were appreciated', $appreciation->title, 'appreciation.received', null, $user);
        }

        return response()->json(['message' => $msg, 'data' => $appreciation]);
    }
}
