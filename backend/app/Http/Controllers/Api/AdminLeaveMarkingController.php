<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminLeaveMarkingController extends Controller
{
    public function markLeave(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ]);

        $admin = $request->user();
        $employee = User::find($validated['employee_id']);

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        try {
            $diff = \Carbon\Carbon::parse($validated['start_date'])->diffInDays(\Carbon\Carbon::parse($validated['end_date'])) + 1;
            $days = max(1.0, (float)$diff);

            $leaveRequest = LeaveRequest::create([
                'user_id' => $employee->id,
                'leave_type_id' => $validated['leave_type_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'days' => $days,
                'actual_leave_days' => $days,
                'reason' => $validated['reason'] . ' [Admin marked]',
                'status' => 'Approved',
                'tl_status' => 'Not Required',
                'admin_status' => 'Approved',
                'approved_by' => $admin->id,
            ]);

            // Notify the employee (In-app notification)
            try {
                $adminName = trim("{$admin->first_name} {$admin->last_name}") ?: 'Admin';
                $leaveRequest->loadMissing('leaveType');
                $leaveTypeName = $leaveRequest->leaveType->name ?? 'Leave';
                $isSingleDay = ($validated['start_date'] === $validated['end_date']);
                $dateStr = $isSingleDay
                    ? \Carbon\Carbon::parse($validated['start_date'])->format('d M Y')
                    : \Carbon\Carbon::parse($validated['start_date'])->format('d M Y') . ' to ' . \Carbon\Carbon::parse($validated['end_date'])->format('d M Y');

                $cleanReason = trim($validated['reason']);
                $reasonSuffix = !empty($cleanReason) ? " (Reason: {$cleanReason})" : "";
                $msg = "{$adminName} has marked an approved {$leaveTypeName} for you ({$dateStr}){$reasonSuffix}.";
                $employee->notify(new \App\Notifications\LeaveRequestNotification('admin_marked', $leaveRequest, $msg));
            } catch (\Throwable $notifEx) {
                \Log::warning('Failed to send in-app leave notification to employee: ' . $notifEx->getMessage());
            }

            // Send email to employee if email is available
            try {
                if (!empty($employee->email) && filter_var($employee->email, FILTER_VALIDATE_EMAIL)) {
                    \App\Services\Email\EmailService::applySmtpConfig();
                    $emailData = [
                        'employee_name' => trim("{$employee->first_name} {$employee->last_name}"),
                        'leave_type' => $leaveRequest->leaveType->name ?? 'Leave',
                        'start_date' => $validated['start_date'],
                        'end_date' => $validated['end_date'],
                        'is_single_day' => ($validated['start_date'] === $validated['end_date']),
                        'reason' => $validated['reason'] . ' [Directly marked by Admin]',
                        'status' => 'Approved',
                    ];
                    \Illuminate\Support\Facades\Mail::to($employee->email)->send(new \App\Mail\LeaveRequestMail($emailData, $leaveRequest));
                }
            } catch (\Throwable $mailEx) {
                \Log::warning('Failed to send leave email to employee: ' . $mailEx->getMessage());
            }

            return response()->json([
                'message' => 'Leave marked successfully',
                'data' => $leaveRequest
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Admin leave marking failed', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to mark leave: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markWfh(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'wfh_type_id' => 'nullable',
            'duration_type' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'reason' => 'required|string|max:500',
        ]);

        $admin = $request->user();
        $employee = User::find($validated['employee_id']);

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        try {
            $rawDuration = $validated['duration_type'] ?? 'Full';
            $durationLower = strtolower($rawDuration);
            if ($durationLower === 'half-morning' || $durationLower === 'first_half' || $durationLower === 'morning') {
                $durationType = 'Half-Morning';
            } elseif ($durationLower === 'half-afternoon' || $durationLower === 'second_half' || $durationLower === 'afternoon') {
                $durationType = 'Half-Afternoon';
            } else {
                $durationType = 'Full';
            }

            $isHalfDay = in_array($durationType, ['Half-Morning', 'Half-Afternoon']);
            $endDate = ($isHalfDay || empty($validated['end_date'])) ? $validated['start_date'] : $validated['end_date'];

            $wfhRequest = WfhRequest::create([
                'user_id' => $employee->id,
                'wfh_type_id' => $validated['wfh_type_id'] ?? null,
                'start_date' => $validated['start_date'],
                'end_date' => $endDate,
                'wfh_date' => $validated['start_date'],
                'duration_type' => $durationType,
                'reason' => $validated['reason'] . ' [Admin marked]',
                'status' => 'Approved',
                'tl_status' => 'Not Required',
                'admin_status' => 'Approved',
                'approved_by' => $admin->id,
            ]);

            // Notify the employee (In-app notification)
            try {
                $adminName = trim("{$admin->first_name} {$admin->last_name}") ?: 'Admin';
                $isSingleDay = ($validated['start_date'] === $endDate);
                $dateStr = $isSingleDay
                    ? \Carbon\Carbon::parse($validated['start_date'])->format('d M Y')
                    : \Carbon\Carbon::parse($validated['start_date'])->format('d M Y') . ' to ' . \Carbon\Carbon::parse($endDate)->format('d M Y');

                $sessionLabel = $durationType;
                if ($durationType === 'Half-Morning') $sessionLabel = 'Half Day (Morning)';
                elseif ($durationType === 'Half-Afternoon') $sessionLabel = 'Half Day (Afternoon)';
                elseif ($durationType === 'Full') $sessionLabel = 'Full Day';

                $cleanReason = trim($validated['reason']);
                $reasonSuffix = !empty($cleanReason) ? " (Reason: {$cleanReason})" : "";
                $msg = "{$adminName} has marked an approved WFH ({$sessionLabel}) for you ({$dateStr}){$reasonSuffix}.";
                $employee->notify(new \App\Notifications\WfhRequestNotification('admin_marked', $wfhRequest, $msg));
            } catch (\Throwable $notifEx) {
                \Log::warning('Failed to send in-app WFH notification to employee: ' . $notifEx->getMessage());
            }

            // Send email to employee if email is available
            try {
                if (!empty($employee->email) && filter_var($employee->email, FILTER_VALIDATE_EMAIL)) {
                    \App\Services\Email\EmailService::applySmtpConfig();
                    $emailData = [
                        'employee_name' => trim("{$employee->first_name} {$employee->last_name}"),
                        'duration_type' => $durationType,
                        'start_date' => $validated['start_date'],
                        'end_date' => $endDate,
                        'is_single_day' => ($validated['start_date'] === $endDate),
                        'reason' => $validated['reason'] . ' [Directly marked by Admin]',
                        'status' => 'Approved',
                    ];
                    \Illuminate\Support\Facades\Mail::to($employee->email)->send(new \App\Mail\WfhRequestMail($emailData, $wfhRequest));
                }
            } catch (\Throwable $mailEx) {
                \Log::warning('Failed to send WFH email to employee: ' . $mailEx->getMessage());
            }

            return response()->json([
                'message' => 'WFH marked successfully',
                'data' => $wfhRequest
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Admin WFH marking failed', [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to mark WFH: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
