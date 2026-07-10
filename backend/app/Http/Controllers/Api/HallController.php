<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;

class HallController extends Controller
{
    /**
     * Display a listing of the hall (all employees' today status).
     */
    public function index(Request $request)
    {
        $today = Carbon::today('Asia/Kolkata');
        $todayStr = $today->toDateString();

        // Check if today is a holiday
        $holiday = Holiday::where('date', $todayStr)->first();

        // Get all active employees
        $employees = User::where('status', 'Active')
            ->with(['team:id,name', 'roles:id,name'])
            ->get();

        // Get all approved leave requests covering today
        $leaveRequests = LeaveRequest::where('status', 'Approved')
            ->where('start_date', '<=', $todayStr)
            ->where('end_date', '>=', $todayStr)
            ->with('leaveType:id,name')
            ->get()
            ->keyBy('user_id');

        // Get all approved WFH requests covering today
        $wfhRequests = WfhRequest::where('status', 'Approved')
            ->where('wfh_date', $todayStr)
            ->get()
            ->keyBy('user_id');

        $hallData = [];
        $summary = [
            'total' => $employees->count(),
            'working' => 0,
            'on_leave' => 0,
            'wfh' => 0,
            'half_day' => 0,
            'holiday' => 0,
        ];

        foreach ($employees as $emp) {
            $status = 'Working';
            
            if ($holiday) {
                $status = 'Holiday';
            }

            if ($wfhRequests->has($emp->id)) {
                $req = $wfhRequests->get($emp->id);
                if (in_array($req->duration_type, ['Half-Morning', 'Half-Afternoon'])) {
                    $status = 'Half Day WFH';
                } else {
                    $status = 'WFH';
                }
            } elseif ($leaveRequests->has($emp->id)) {
                $req = $leaveRequests->get($emp->id);
                if (in_array($req->duration_type, ['Half-Morning', 'Half-Afternoon'])) {
                    $status = 'Half Day Leave';
                } else {
                    $status = $req->leaveType->name ?? 'Leave';
                }
            }

            // Update summary
            if ($status === 'Holiday') {
                $summary['holiday']++;
            } elseif (str_contains($status, 'Half Day')) {
                $summary['half_day']++;
            } elseif ($status === 'WFH') {
                $summary['wfh']++;
            } elseif ($status !== 'Working') {
                $summary['on_leave']++;
            } else {
                $summary['working']++;
            }

            $hallData[] = [
                'id' => $emp->id,
                'first_name' => $emp->first_name,
                'last_name' => $emp->last_name,
                'employee_code' => $emp->employee_code,
                'designation' => $emp->designation,
                'team' => $emp->team->name ?? 'Unassigned',
                'status' => $status,
            ];
        }

        return response()->json([
            'summary' => $summary,
            'employees' => $hallData,
            'date' => $todayStr,
            'is_holiday' => $holiday ? true : false,
            'holiday_name' => $holiday->name ?? null,
        ]);
    }
}
