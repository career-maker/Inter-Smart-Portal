<?php

namespace App\Http\Controllers\Api\Accounts;

use App\Http\Controllers\Controller;
use App\Models\AmcContract;
use Illuminate\Http\Request;

class AmcController extends Controller
{
    /** AMC list. Optional filters: status, expiring_in (days). Status shows Expired once the end date has passed. */
    public function index(Request $request)
    {
        $query = AmcContract::with('project:id,name')->orderBy('end_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('expiring_in')) {
            $query->where('status', 'Active')->whereBetween('end_date', [now()->toDateString(), now()->addDays((int) $request->expiring_in)->toDateString()]);
        }

        $rows = $query->get()->map(function ($amc) {
            $amc->setAttribute('effective_status', $amc->status === 'Active' && $amc->end_date->isPast() ? 'Expired' : $amc->status);

            return $amc;
        });

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'required|exists:pm_projects,id',
            'client_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        return response()->json(['data' => AmcContract::create($data + ['created_by' => $request->user()->id])], 201);
    }

    public function update(Request $request, AmcContract $amc)
    {
        $data = $request->validate([
            'client_name' => 'nullable|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'amount' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:Active,Expired,Renewed,Cancelled',
            'notes' => 'nullable|string|max:2000',
        ]);
        $amc->update($data);

        return response()->json(['data' => $amc->fresh()]);
    }
}
