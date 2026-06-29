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
}
