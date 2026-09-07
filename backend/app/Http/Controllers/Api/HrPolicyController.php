<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HrPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class HrPolicyController extends Controller
{
    /**
     * List all active (non-archived) HR policies.
     */
    public function index(Request $request)
    {
        $policies = Cache::remember('all_hr_policies', now()->addHours(24), function () {
            return HrPolicy::where('is_archived', false)
                ->orderBy('category')
                ->orderBy('title')
                ->get();
        });

        return response()->json(['data' => $policies]);
    }

    /**
     * Admin uploads a new HR policy document.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title'    => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'version'  => ['nullable', 'string', 'max:50'],
            'file'     => ['required', 'file', 'mimes:pdf,doc,docx', 'max:20480'],
        ]);

        $path = $request->file('file')->store('policies', 'public');

        $policy = HrPolicy::create([
            'title'      => $request->title,
            'category'   => $request->category,
            'version'    => $request->version,
            'file_path'  => $path,
            'created_by' => $request->user()->id,
        ]);

        Cache::forget('all_hr_policies');

        return response()->json([
            'message' => 'HR Policy uploaded successfully.',
            'data'    => $policy,
        ], 201);
    }

    /**
     * Admin archives (soft-deletes) a policy.
     */
    public function destroy(Request $request, HrPolicy $hrPolicy)
    {
        $hrPolicy->update([
            'is_archived' => true,
            'updated_by'  => $request->user()->id,
        ]);

        Cache::forget('all_hr_policies');

        return response()->json(['message' => 'Policy archived successfully.']);
    }

    /**
     * Authenticated download or view of an HR policy file.
     * Prevents exposing internal file hash or direct storage paths.
     */
    public function download(Request $request, HrPolicy $hrPolicy)
    {
        // Authenticate user via Sanctum (bearer token header, query token, or cookie)
        $user = $request->user('sanctum');
        if (!$user && $request->query('token')) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($request->query('token'));
            if ($accessToken && (!$accessToken->expires_at || $accessToken->expires_at->isFuture())) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user) {
            if ($request->acceptsHtml()) {
                return response()->view('errors.404', [], 404);
            }
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($hrPolicy->is_archived && !in_array($user->role, ['Super Admin', 'Admin', 'HR'])) {
            if ($request->acceptsHtml()) {
                return response()->view('errors.404', [], 404);
            }
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        if (!$hrPolicy->file_path || !$disk->exists($hrPolicy->file_path)) {
            if ($request->acceptsHtml()) {
                return response()->view('errors.404', [], 404);
            }
            return response()->json(['message' => 'File not found.'], 404);
        }

        $extension = pathinfo($hrPolicy->file_path, PATHINFO_EXTENSION) ?: 'pdf';
        $safeTitle = \Illuminate\Support\Str::slug($hrPolicy->title) ?: 'hr-policy';
        $downloadFilename = "{$safeTitle}.{$extension}";

        $disposition = $request->query('disposition') === 'attachment' ? 'attachment' : 'inline';

        return $disk->response($hrPolicy->file_path, $downloadFilename, [
            'Content-Disposition' => "{$disposition}; filename=\"{$downloadFilename}\"",
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}

