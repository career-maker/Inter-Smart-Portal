<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Support\Access;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Leads and their follow-up inbox. A salesperson sees their own; Super Admin / Sales lead see all. */
class LeadController extends Controller
{
    private function own(Request $request)
    {
        $q = Lead::query();

        return Access::salesSeesAll($request->user()) ? $q : $q->where('owner_id', $request->user()->id);
    }

    public function index(Request $request)
    {
        $q = $this->own($request)->withCount(['activities as open_activities' => fn ($a) => $a->where('status', 'Open')]);
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $q->where(fn ($w) => $w->where('name', 'like', "%{$request->search}%")->orWhere('contact_name', 'like', "%{$request->search}%"));
        }

        return response()->json(['data' => $q->orderByRaw('next_followup_at is null')->orderBy('next_followup_at')->orderByDesc('id')->get()]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        return response()->json(['data' => Lead::create($data + ['owner_id' => $request->user()->id])], 201);
    }

    public function update(Request $request, Lead $lead)
    {
        $this->authorizeLead($request, $lead);
        $lead->update($this->validated($request, partial: true));

        return response()->json(['data' => $lead->fresh()]);
    }

    public function destroy(Request $request, Lead $lead)
    {
        $this->authorizeLead($request, $lead);
        $lead->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // ---- follow-up inbox -------------------------------------------------

    /** Open items (follow-ups, proposals, meetings, other), earliest due first. Optional kind filter. */
    public function inbox(Request $request)
    {
        $q = LeadActivity::with('lead:id,name,status')->where('status', 'Open');
        if (! Access::salesSeesAll($request->user())) {
            $q->where('owner_id', $request->user()->id);
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->kind);
        }

        return response()->json(['data' => $q->orderByRaw('due_at is null')->orderBy('due_at')->get()]);
    }

    public function addActivity(Request $request, Lead $lead)
    {
        $this->authorizeLead($request, $lead);
        $data = $request->validate([
            'kind' => ['required', Rule::in(['followup', 'proposal', 'meeting', 'other'])],
            'title' => 'required|string|max:255',
            'due_at' => 'nullable|date',
        ]);

        return response()->json(['data' => $lead->activities()->create($data + ['owner_id' => $lead->owner_id])], 201);
    }

    /** Status update on an inbox item: done (with outcome, optional next follow-up date) or cancelled. */
    public function updateActivity(Request $request, LeadActivity $activity)
    {
        $this->authorizeLead($request, $activity->lead);
        $data = $request->validate([
            'status' => ['required', Rule::in(['Done', 'Cancelled'])],
            'outcome' => 'nullable|string|max:2000',
            'next_followup_at' => 'nullable|date|after_or_equal:today',
        ]);
        if ($activity->status !== 'Open') {
            return response()->json(['message' => "Already {$activity->status}."], 422);
        }

        $activity->update([
            'status' => $data['status'], 'outcome' => $data['outcome'] ?? null,
            'completed_at' => $data['status'] === 'Done' ? now() : null,
        ]);
        if (! empty($data['next_followup_at'])) {
            $activity->lead->update(['next_followup_at' => $data['next_followup_at']]);
        }

        return response()->json(['data' => $activity->fresh()]);
    }

    private function authorizeLead(Request $request, Lead $lead): void
    {
        abort_unless(Access::salesSeesAll($request->user()) || $lead->owner_id === $request->user()->id, 403, 'This lead belongs to another salesperson.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $sometimes = $partial ? 'sometimes|' : '';
        $data = $request->validate([
            'name' => $sometimes . 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'source' => 'nullable|string|max:255',
            'status' => ['sometimes', Rule::in(Lead::STATUSES)],
            'expected_value' => 'nullable|numeric|min:0',
            'next_followup_at' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
            'lost_reason' => 'nullable|string|max:2000',
        ]);
        if (($data['status'] ?? null) === 'Lost' && empty($data['lost_reason'])) {
            abort(response()->json(['message' => 'Give a reason when marking a lead Lost.', 'errors' => ['lost_reason' => ['Give a reason when marking a lead Lost.']]], 422));
        }

        return $data;
    }
}
