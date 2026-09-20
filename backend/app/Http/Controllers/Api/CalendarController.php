<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\Team;
use App\Models\User;
use App\Models\WfhRequest;
use App\Models\WorkingDaysOverride;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CalendarController extends Controller
{
    private const EXCLUDED_STATUSES = ['Rejected', 'Cancelled', 'rejected', 'cancelled'];

    /**
     * Get an aggregated list of events for the leave calendar.
     *
     * Everyone gets company holidays, weekends and their own leave/WFH.
     * Team Leads additionally get the leave/WFH of their active team members.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $month = $request->query('month', Carbon::now()->month);
        $year = $request->query('year', Carbon::now()->year);

        // Calculate start and end date for filtering (just broad strokes to cover the month)
        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth()->subDays(15);
        $endOfMonth = Carbon::createFromDate($year, $month, 1)->endOfMonth()->addDays(15);
        $fromStr = $startOfMonth->toDateString();
        $toStr = $endOfMonth->toDateString();

        $events = [];

        // 1. Company Holidays
        $holidays = Holiday::whereBetween('date', [$fromStr, $toStr])->get();
        $holidayDateMap = [];
        foreach ($holidays as $h) {
            $hDate = $h->date ? \Carbon\Carbon::parse($h->date)->format('Y-m-d') : null;
            if ($hDate) {
                $holidayDateMap[$hDate] = true;
            }
            $events[] = [
                'id' => 'h_' . $h->id,
                'title' => $h->name,
                'date' => $hDate,
                'type' => 'Holiday',
                'status' => 'Approved', // implicitly
            ];
        }

        // Add all Saturdays and Sundays as weekend holidays (unless marked as working in WorkingDaysOverride)
        $workingOverrides = WorkingDaysOverride::whereBetween('date', [$fromStr, $toStr])
            ->pluck('date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->flip()
            ->toArray();

        $curr = $startOfMonth->copy();
        while ($curr->lte($endOfMonth)) {
            $dateStr = $curr->format('Y-m-d');
            if ($curr->isWeekend() && !isset($workingOverrides[$dateStr]) && !isset($holidayDateMap[$dateStr])) {
                $events[] = [
                    'id' => 'weekend_' . $dateStr,
                    'title' => $curr->format('l'),
                    'date' => $dateStr,
                    'type' => 'Holiday',
                    'status' => 'Approved',
                ];
            }
            $curr->addDay();
        }

        // Whose leave/WFH to show: the user, plus active team members when the user is a Team Lead
        $teamName = null;
        $memberIds = [];
        $isTeamLead = $user->hasRole('Team Lead') || Team::where('team_lead_id', $user->id)->exists();
        if ($isTeamLead) {
            $teamId = $user->team_id ?: Team::where('team_lead_id', $user->id)->value('id');
            if ($teamId) {
                $teamName = Team::where('id', $teamId)->value('name');
                $memberIds = User::where('team_id', $teamId)
                    ->where('status', 'Active')
                    ->where('id', '!=', $user->id)
                    ->pluck('id')
                    ->all();
            }
        }
        $userIds = array_merge([$user->id], $memberIds);
        $userCols = 'user:id,first_name,last_name,designation,profile_photo_path';

        // 2. Leave Requests (do not display Rejected or Cancelled)
        $leaves = LeaveRequest::whereIn('user_id', $userIds)
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->where('start_date', '<=', $toStr)
            ->whereRaw('COALESCE(end_date, start_date) >= ?', [$fromStr])
            ->with(['leaveType:id,name', $userCols])
            ->get();

        foreach ($leaves as $l) {
            $title = $l->leaveType->name ?? 'Leave';
            $events[] = [
                'id' => 'l_' . $l->id,
                'title' => $title,
                'date' => $l->start_date,
                'end_date' => $l->end_date,
                'type' => 'Leave',
                'status' => $l->status,
                'days' => $l->days,
                'duration' => $l->duration_type,
                'user' => $this->userPayload($l->user, $user->id),
            ];
        }

        // 3. WFH Requests (do not display Rejected or Cancelled)
        $wfhs = WfhRequest::whereIn('user_id', $userIds)
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->where(function ($q) use ($fromStr, $toStr) {
                $q->where(function ($r) use ($fromStr, $toStr) {
                    $r->where('start_date', '<=', $toStr)
                      ->whereRaw('COALESCE(end_date, start_date) >= ?', [$fromStr]);
                })->orWhereBetween('wfh_date', [$fromStr, $toStr]);
            })
            ->with($userCols)
            ->get();

        foreach ($wfhs as $w) {
            $title = 'WFH';
            if (in_array($w->duration_type, ['Half-Morning', 'Half-Afternoon'])) {
                $title = "Half Day WFH";
            }
            $events[] = [
                'id' => 'w_' . $w->id,
                'title' => $title,
                'date' => $w->start_date ?? $w->wfh_date,
                'end_date' => $w->end_date ?? $w->wfh_date,
                'type' => 'WFH',
                'status' => $w->status,
                'duration' => $w->duration_type,
                'user' => $this->userPayload($w->user, $user->id),
            ];
        }

        return response()->json([
            'data' => $events,
            'meta' => [
                'is_team_view' => $isTeamLead && !empty($memberIds),
                'team_name' => $teamName,
                'member_count' => count($memberIds),
            ],
        ]);
    }

    /**
     * Company-wide approved leave/WFH for one month (Super Admin only).
     * Feeds the per-day counts and the day side popup on the Holiday Calendar.
     */
    public function overview(Request $request)
    {
        $request->validate([
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|between:2000,2100',
        ]);

        $month = (int) $request->query('month', Carbon::now()->month);
        $year = (int) $request->query('year', Carbon::now()->year);

        $from = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $fromStr = $from->toDateString();
        $toStr = $from->copy()->endOfMonth()->toDateString();

        $userCols = 'user:id,first_name,last_name,employee_code,designation,profile_photo_path,team_id';
        $events = [];

        // WFH-named leave types are excluded; WFH lives in wfh_requests (same rule as the dashboard).
        $leaves = LeaveRequest::where('status', 'Approved')
            ->where('start_date', '<=', $toStr)
            ->whereRaw('COALESCE(end_date, start_date) >= ?', [$fromStr])
            ->whereDoesntHave('leaveType', function ($q) {
                $q->where('name', 'like', '%WFH%')
                  ->orWhere('name', 'like', '%Work From Home%');
            })
            ->with(['leaveType:id,name', $userCols, 'user.team:id,name'])
            ->get();

        foreach ($leaves as $l) {
            if (!$l->user) {
                continue;
            }
            $events[] = [
                'id' => 'l_' . $l->id,
                'type' => 'Leave',
                'title' => $l->leaveType->name ?? 'Leave',
                'start_date' => Carbon::parse($l->start_date)->toDateString(),
                'end_date' => Carbon::parse($l->end_date ?? $l->start_date)->toDateString(),
                'days' => $l->days,
                'duration' => $l->duration_type,
                'reason' => $l->reason,
                'user' => $this->overviewUserPayload($l->user),
            ];
        }

        $wfhs = WfhRequest::where('status', 'Approved')
            ->where(function ($q) use ($fromStr, $toStr) {
                $q->where(function ($r) use ($fromStr, $toStr) {
                    $r->where('start_date', '<=', $toStr)
                      ->whereRaw('COALESCE(end_date, start_date) >= ?', [$fromStr]);
                })->orWhereBetween('wfh_date', [$fromStr, $toStr]);
            })
            ->with([$userCols, 'user.team:id,name'])
            ->get();

        foreach ($wfhs as $w) {
            if (!$w->user) {
                continue;
            }
            $start = $w->start_date ?? $w->wfh_date;
            $events[] = [
                'id' => 'w_' . $w->id,
                'type' => 'WFH',
                'title' => in_array($w->duration_type, ['Half-Morning', 'Half-Afternoon']) ? 'Half Day WFH' : 'WFH',
                'start_date' => Carbon::parse($start)->toDateString(),
                'end_date' => Carbon::parse($w->end_date ?? $start)->toDateString(),
                'days' => $w->days_count,
                'duration' => $w->duration_type,
                'reason' => $w->reason,
                'user' => $this->overviewUserPayload($w->user),
            ];
        }

        return response()->json(['data' => $events]);
    }

    private function userPayload(?User $u, int $viewerId): ?array
    {
        if (!$u) {
            return null;
        }

        return [
            'id' => $u->id,
            'name' => trim($u->first_name . ' ' . $u->last_name),
            'designation' => $u->designation,
            'profile_photo_path' => $u->profile_photo_path,
            'is_self' => (int) $u->id === $viewerId,
        ];
    }

    private function overviewUserPayload(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => trim($u->first_name . ' ' . $u->last_name),
            'employee_code' => $u->employee_code,
            'designation' => $u->designation,
            'profile_photo_path' => $u->profile_photo_path,
            'team' => $u->team?->name,
        ];
    }
}
