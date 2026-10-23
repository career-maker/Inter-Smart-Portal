<?php

namespace App\Http\Controllers\Api\Accounts;

use App\Http\Controllers\Controller;
use App\Models\SalesTarget;
use Illuminate\Http\Request;

class SalesTargetController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->input('period', now()->format('Y-m'));

        return response()->json([
            'period' => $period,
            'data' => SalesTarget::with('user:id,first_name,last_name')->where('period', $period)->get(),
        ]);
    }

    /** Create or update one person's target for a month. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'period' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'target_amount' => 'required|numeric|min:0',
        ]);

        $target = SalesTarget::updateOrCreate(
            ['user_id' => $data['user_id'], 'period' => $data['period']],
            ['target_amount' => $data['target_amount'], 'set_by' => $request->user()->id]
        );

        return response()->json(['data' => $target], 201);
    }

    public function destroy(SalesTarget $target)
    {
        $target->delete();

        return response()->json(['message' => 'Deleted.']);
    }
}
