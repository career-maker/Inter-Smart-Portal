<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\WfhRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CalendarController extends Controller
{
    /**
     * Get an aggregated list of events for the user's personal leave calendar.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $month = $request->query('month', Carbon::now()->month);
        $year = $request->query('year', Carbon::now()->year);

        // Calculate start and end date for filtering (just broad strokes to cover the month)
        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth()->subDays(15);
        $endOfMonth = Carbon::createFromDate($year, $month, 1)->endOfMonth()->addDays(15);

        $events = [];

        // 1. Company Holidays
        $holidays = Holiday::whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])->get();
        foreach ($holidays as $h) {
            $events[] = [
                'id' => 'h_' . $h->id,
                'title' => $h->name,
                'date' => $h->date,
                'type' => 'Holiday',
                'status' => 'Approved', // implicitly
            ];
        }

        // 2. Leave Requests
        $leaves = LeaveRequest::where('user_id', $user->id)
            ->where(function($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('start_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                  ->orWhereBetween('end_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
            })
            ->with('leaveType:id,name')
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
            ];
        }

        // 3. WFH Requests
        $wfhs = WfhRequest::where('user_id', $user->id)
            ->where(function($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('start_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                  ->orWhereBetween('end_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
            })
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
            ];
        }

        return response()->json(['data' => $events]);
    }
}
