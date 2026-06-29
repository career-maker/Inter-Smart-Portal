<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use Illuminate\Http\Request;

class LeaveBalanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $year = date('Y');

        $balances = LeaveBalance::with('leaveType')
            ->where('user_id', $user->id)
            ->where('year', $year)
            ->get();

        return response()->json([
            'data' => $balances
        ]);
    }
}
