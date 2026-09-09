<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaBug;
use App\Models\BugzillaDependency;
use App\Models\BugzillaHistory;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;

class BugzillaDependencyController extends Controller
{
    /**
     * Add a dependency relationship.
     */
    public function store(Request $request, $bugId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canDevelop($user)) {
            return response()->json(['message' => 'Developer capability required to manage dependencies.'], 403);
        }

        $bug = BugzillaBug::findOrFail($bugId);
        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $validated = $request->validate([
            'target_bug_number' => 'required|string',
            'relationship_type' => 'required|in:depends_on,blocks',
        ]);

        $targetBug = BugzillaBug::where('bug_number', strtoupper(trim($validated['target_bug_number'])))->first();
        if (!$targetBug) {
            return response()->json(['message' => "Target bug '{$validated['target_bug_number']}' not found."], 404);
        }

        if ((int) $targetBug->id === (int) $bug->id) {
            return response()->json(['message' => 'A bug cannot depend on or block itself.'], 422);
        }

        // Check if reciprocal or duplicate exists
        $relType = $validated['relationship_type'];
        $exists = BugzillaDependency::where('bug_id', $bug->id)
            ->where('depends_on_bug_id', $targetBug->id)
            ->where('relationship_type', $relType)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This relationship already exists.'], 422);
        }

        // Prevent immediate direct cycle
        $cycle = BugzillaDependency::where('bug_id', $targetBug->id)
            ->where('depends_on_bug_id', $bug->id)
            ->where('relationship_type', $relType)
            ->exists();

        if ($cycle) {
            return response()->json(['message' => 'Circular dependency detected.'], 422);
        }

        $dep = BugzillaDependency::create([
            'bug_id' => $bug->id,
            'depends_on_bug_id' => $targetBug->id,
            'relationship_type' => $relType,
            'created_at' => now(),
        ]);

        BugzillaHistory::logChange(
            $bug->id,
            $user->id,
            'dependency_added',
            $relType,
            null,
            "Added {$relType} {$targetBug->bug_number}"
        );

        return response()->json([
            'message' => 'Dependency linked successfully.',
            'dependency' => $dep->load('dependsOnBug:id,bug_number,summary,status,severity,priority'),
        ], 201);
    }

    /**
     * Remove a dependency relationship.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canDevelop($user)) {
            return response()->json(['message' => 'Developer capability required.'], 403);
        }

        $dep = BugzillaDependency::with('dependsOnBug')->findOrFail($id);
        $bug = BugzillaBug::findOrFail($dep->bug_id);

        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $targetNum = $dep->dependsOnBug->bug_number ?? 'bug';
        $relType = $dep->relationship_type;
        $dep->delete();

        BugzillaHistory::logChange(
            $bug->id,
            $user->id,
            'dependency_removed',
            $relType,
            "Removed {$relType} {$targetNum}",
            null
        );

        return response()->json([
            'message' => 'Dependency removed successfully.',
        ]);
    }
}
