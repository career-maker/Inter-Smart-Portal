<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaSavedSearch;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;

class BugzillaSavedSearchController extends Controller
{
    /**
     * List saved searches accessible to user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $searches = BugzillaSavedSearch::where('user_id', $user->id)
            ->orWhere('is_shared', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'saved_searches' => $searches,
        ]);
    }

    /**
     * Store new saved search criteria.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'criteria' => 'required|array',
            'is_shared' => 'sometimes|boolean',
        ]);

        $search = BugzillaSavedSearch::create([
            'user_id' => $user->id,
            'name' => trim($validated['name']),
            'criteria' => $validated['criteria'],
            'is_shared' => BugzillaAuthService::canDevelop($user) ? ($validated['is_shared'] ?? false) : false,
        ]);

        return response()->json([
            'message' => "Search '{$search->name}' saved successfully.",
            'saved_search' => $search,
        ], 201);
    }

    /**
     * Delete saved search.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $search = BugzillaSavedSearch::findOrFail($id);

        if ((int) $search->user_id !== (int) $user->id && !BugzillaAuthService::isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $search->delete();

        return response()->json([
            'message' => 'Saved search removed successfully.',
        ]);
    }
}
