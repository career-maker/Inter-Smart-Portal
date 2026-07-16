<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
use App\Http\Resources\TeamResource;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        $query = Team::with('teamLead')->withCount('members');

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        return TeamResource::collection($query->paginate(10));
    }

    public function store(StoreTeamRequest $request)
    {
        $data = $request->validated();

        // Auto-generate a unique team code from the name
        $base = strtoupper(preg_replace('/[^A-Za-z]/', '', $data['name']));
        $base = substr($base, 0, 4);
        $code = $base . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        while (Team::where('code', $code)->exists()) {
            $code = $base . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        }
        $data['code'] = $code;

        $team = Team::create($data);

        // Set the Team Lead's team_id to this team
        if ($team->team_lead_id) {
            User::find($team->team_lead_id)->update(['team_id' => $team->id]);
        }

        return new TeamResource($team->load('teamLead')->loadCount('members'));
    }

    public function show(Team $team)
    {
        return new TeamResource($team->load(['teamLead', 'members']));
    }

    public function update(UpdateTeamRequest $request, Team $team)
    {
        $oldTeamLeadId = $team->team_lead_id;
        $data = $request->validated();
        $team->update($data);

        // If Team Lead changed, update team_id accordingly
        if (isset($data['team_lead_id']) && $data['team_lead_id'] !== $oldTeamLeadId) {
            // Remove old team lead's team_id if there was one
            if ($oldTeamLeadId) {
                User::find($oldTeamLeadId)->update(['team_id' => null]);
            }
            // Set new team lead's team_id
            if ($data['team_lead_id']) {
                User::find($data['team_lead_id'])->update(['team_id' => $team->id]);
            }
        }

        return new TeamResource($team->load('teamLead')->loadCount('members'));
    }

    public function destroy(Team $team)
    {
        // Nullify the team_id for all current members
        User::where('team_id', $team->id)->update(['team_id' => null]);
        
        $team->delete();
        
        return response()->json(['message' => 'Team deleted successfully.']);
    }

    public function syncMembers(Request $request, Team $team)
    {
        $request->validate([
            'member_ids' => 'present|array',
            'member_ids.*' => 'exists:users,id'
        ]);

        // First remove all existing members (but preserve team lead's team_id)
        User::where('team_id', $team->id)
            ->where('id', '!=', $team->team_lead_id)
            ->update(['team_id' => null]);

        // Then assign the new ones
        if (!empty($request->member_ids)) {
            User::whereIn('id', $request->member_ids)->update(['team_id' => $team->id]);
        }

        // Ensure team lead's team_id is set
        if ($team->team_lead_id) {
            User::find($team->team_lead_id)->update(['team_id' => $team->id]);
        }

        return response()->json(['message' => 'Team members synced successfully.']);
    }
}
