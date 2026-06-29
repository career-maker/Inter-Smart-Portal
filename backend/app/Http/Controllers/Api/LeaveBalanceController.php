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

        // The leave_balances table only has user_id and balance columns (no year or leave_type_id)
        $balance = LeaveBalance::where('user_id', $user->id)->first();

        return response()->json([
            'data' => $balance
        ]);
    }
}
