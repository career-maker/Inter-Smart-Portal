<?php

namespace App\Http\Controllers\Api\Bugzilla;

use App\Http\Controllers\Controller;
use App\Models\BugzillaBug;
use App\Models\BugzillaWatcher;
use App\Services\BugzillaAuthService;
use Illuminate\Http\Request;

class BugzillaWatcherController extends Controller
{
    /**
     * Toggle watch state for authenticated user on a bug.
     */
    public function toggle(Request $request, $bugId)
    {
        $user = $request->user();
        if (!BugzillaAuthService::canView($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $bug = BugzillaBug::findOrFail($bugId);
        if (!BugzillaAuthService::canAccessProject($user, $bug->portal_project_id)) {
            return response()->json(['message' => 'Unauthorized project access.'], 403);
        }

        $existing = BugzillaWatcher::where('bug_id', $bugId)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $isWatching = false;
            $message = 'You have stopped watching this bug.';
        } else {
            BugzillaWatcher::create([
                'bug_id' => $bugId,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
            $isWatching = true;
            $message = 'You are now watching this bug for updates.';
        }

        return response()->json([
            'message' => $message,
            'is_watching' => $isWatching,
            'watchers_count' => $bug->watchers()->count(),
        ]);
    }
}
