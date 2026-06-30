<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\WfhRequest;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function employees(Request $request): JsonResponse
    {
        $query = User::with(['team.teamLead', 'roles', 'leaveBalance'])->whereNotNull('joining_date');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('id', $request->user_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('team_id')) {
            $query->where('team_id', $request->team_id);
        }

        $employees = $query->get()->map(function (User $emp) {
            $currentYear = Carbon::now()->year;
            $currentMonth = Carbon::now()->month;
            $balance = $emp->leaveBalance;
            $probationEnd = $emp->probationEndDate();
            $isInProbation = $emp->isInProbation();

            // Service duration
            $joining = $emp->joining_date ? Carbon::parse($emp->joining_date) : null;
            $serviceDays = $joining ? $joining->diffInDays(Carbon::today()) : 0;
            $serviceYears = $joining ? $joining->diffInYears(Carbon::today()) : 0;

            // DOB / Age
            $age = $emp->dob ? Carbon::parse($emp->dob)->age : null;

            // Leave counts
            $leavesTakenThisYear = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->sum('actual_leave_days');

            $leavesTakenThisMonth = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->whereMonth('start_date', $currentMonth)
                ->sum('actual_leave_days');

            $pendingLeaves = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Pending')->count();

            $approvedLeaves = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')->count();

            $rejectedLeaves = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Rejected')->count();

            $lopCount = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->where('is_unpaid', true)
                ->sum('actual_leave_days');

            $wfhThisMonth = WfhRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->whereMonth('start_date', $currentMonth)
                ->count();

            $wfhThisYear = WfhRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->count();

            $clCarryForward = $balance ? ($balance->cl_carry_forward ?? 0) : 0;
            $clBalance      = $balance ? ($balance->casual_leave_balance ?? 0) : 0;
            $slBalance      = $balance ? ($balance->sick_leave_balance ?? 0) : 0;

            return [
                'id'                      => $emp->id,
                'employee_code'           => $emp->employee_code,
                'first_name'              => $emp->first_name,
                'last_name'               => $emp->last_name,
                'full_name'               => "{$emp->first_name} {$emp->last_name}",
                'gender'                  => $emp->gender,
                'dob'                     => $emp->dob,
                'age'                     => $age,
                'marital_status'          => $emp->marital_status,
                'blood_group'             => $emp->blood_group,
                'team'                    => $emp->team?->name,
                'team_lead'               => $emp->team?->teamLead ? "{$emp->team->teamLead->first_name} {$emp->team->teamLead->last_name}" : null,
                'designation'             => $emp->designation,
                'joining_date'            => $emp->joining_date,
                'probation_end_date'      => $probationEnd,
                'is_in_probation'         => $isInProbation,
                'service_days'            => $serviceDays,
                'service_years'           => $serviceYears,
                'email'                   => $emp->email,
                'personal_email'          => $emp->personal_email,
                'contact_number'          => $emp->contact_number,
                'alternate_contact_number'=> $emp->alternate_contact_number,
                'current_address'         => $emp->current_address,
                'permanent_address'       => $emp->permanent_address,
                'status'                  => $emp->status,
                'role'                    => $emp->roles->pluck('name')->first(),
                // Leave info
                'casual_leave_balance'    => $clBalance,
                'sick_leave_balance'      => $slBalance,
                'cl_carry_forward'        => $clCarryForward,
                'total_cl_available'      => $clBalance + $clCarryForward,
                'total_sl_available'      => $slBalance,
                'leaves_taken_this_month' => $leavesTakenThisMonth,
                'leaves_taken_this_year'  => $leavesTakenThisYear,
                'pending_leaves'          => $pendingLeaves,
                'approved_leaves'         => $approvedLeaves,
                'rejected_leaves'         => $rejectedLeaves,
                'lop_count'               => $lopCount,
                'wfh_this_month'          => $wfhThisMonth,
                'wfh_this_year'           => $wfhThisYear,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $employees]);
    }

    public function leaves(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['user.team', 'leaveType', 'approver'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('start_date')) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('end_date', '<=', $request->end_date);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $leaves = $query->get()->map(function (LeaveRequest $req) {
            return [
                'id'                   => $req->id,
                'employee_code'        => $req->user?->employee_code,
                'employee_name'        => "{$req->user?->first_name} {$req->user?->last_name}",
                'team'                 => $req->user?->team?->name,
                'leave_type'           => $req->leaveType?->name,
                'start_date'           => $req->start_date,
                'end_date'             => $req->end_date,
                'requested_days'       => $req->actual_leave_days - ($req->sandwich_leave_days ?? 0),
                'sandwich_days'        => $req->sandwich_leave_days ?? 0,
                'total_days'           => $req->actual_leave_days,
                'is_unpaid'            => $req->is_unpaid,
                'paid_status'          => $req->is_unpaid ? 'Unpaid (LOP)' : 'Paid',
                'status'               => $req->status,
                'tl_status'            => $req->tl_status,
                'admin_status'         => $req->admin_status,
                'reason'               => $req->reason,
                'applied_date'         => $req->created_at?->toDateString(),
                'approved_by'          => $req->approver ? "{$req->approver->first_name} {$req->approver->last_name}" : null,
                'approval_date'        => $req->updated_at?->toDateString(),
                'remarks'              => $req->remarks,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $leaves]);
    }

    public function leaveBalances(Request $request): JsonResponse
    {
        $query = User::with(['team', 'leaveBalance'])->whereNotNull('joining_date');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('id', $request->user_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $currentYear = Carbon::now()->year;

        $data = $query->get()->map(function (User $emp) use ($currentYear) {
            $balance = $emp->leaveBalance;
            $cl      = $balance?->casual_leave_balance ?? 0;
            $sl      = $balance?->sick_leave_balance ?? 0;
            $cf      = $balance?->cl_carry_forward ?? 0;

            $clUsed = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->where('is_unpaid', false)
                ->whereHas('leaveType', fn($q) => $q->where('name', 'like', '%Casual%'))
                ->whereYear('start_date', $currentYear)
                ->sum('actual_leave_days');

            $slUsed = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->where('is_unpaid', false)
                ->whereHas('leaveType', fn($q) => $q->where('name', 'like', '%Sick%'))
                ->whereYear('start_date', $currentYear)
                ->sum('actual_leave_days');

            $lop = LeaveRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->where('is_unpaid', true)
                ->whereYear('start_date', $currentYear)
                ->sum('actual_leave_days');

            $wfh = WfhRequest::where('user_id', $emp->id)
                ->where('status', 'Approved')
                ->whereYear('start_date', $currentYear)
                ->count();

            return [
                'id'               => $emp->id,
                'employee_code'    => $emp->employee_code,
                'full_name'        => "{$emp->first_name} {$emp->last_name}",
                'team'             => $emp->team?->name,
                'designation'      => $emp->designation,
                'status'           => $emp->status,
                'cl_balance'       => $cl,
                'sl_balance'       => $sl,
                'cl_carry_forward' => $cf,
                'total_cl'         => $cl + $cf,
                'total_sl'         => $sl,
                'cl_used'          => $clUsed,
                'sl_used'          => $slUsed,
                'lop_count'        => $lop,
                'wfh_count'        => $wfh,
                'is_in_probation'  => $emp->isInProbation(),
                'probation_end_date' => $emp->probationEndDate(),
            ];
        });

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function allEmployeesForFilter(Request $request): JsonResponse
    {
        $employees = User::select('id', 'first_name', 'last_name', 'employee_code')
            ->where('status', 'Active')
            ->orderBy('first_name')
            ->get()
            ->map(fn($e) => ['id' => $e->id, 'name' => "{$e->first_name} {$e->last_name}", 'code' => $e->employee_code]);

        return response()->json(['data' => $employees]);
    }
}
