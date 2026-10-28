<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\AmcContract;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\ProjectPayment;
use App\Support\Access;
use App\Support\ProjectPaymentState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Completed (live) projects for Sales: go-live date, AMC start and renewal, AMC amount, payment status, and how soon the AMC expires. */
class CompletedProjectController extends Controller
{
    /** Days before the renewal date when Sales is reminded (and the "Expiring soon" label starts). */
    public const REMIND_DAYS = 30;

    public function index(Request $request)
    {
        $finance = ProjectFinance::query()->whereNotNull('sales_user_id');
        if (! Access::salesSeesAll($request->user())) {
            $finance->where('sales_user_id', $request->user()->id);
        }
        $finance = $finance->get()->keyBy('project_id');
        $live = DB::table('project_go_live')->where('status', 'Live')->whereIn('project_id', $finance->keys())->get()->keyBy('project_id');

        $projects = Project::whereIn('id', $finance->keys())->where(fn ($q) => $q->whereIn('id', $live->keys())->orWhere('status', 'Completed'))->orderByDesc('id')->get();
        // the project's current AMC: the latest one that is not cancelled or already renewed (Accounts keeps the same records)
        $amc = AmcContract::whereIn('project_id', $projects->pluck('id'))->whereIn('status', ['Active', 'Expired'])->orderBy('id')->get()->keyBy('project_id');
        $payments = ProjectPayment::whereIn('project_id', $projects->pluck('id'))->get()->groupBy('project_id');
        $today = now('Asia/Kolkata')->startOfDay();

        $rows = $projects->map(function ($p) use ($finance, $live, $amc, $payments, $today) {
            $a = $amc->get($p->id);
            $left = $a ? (int) $today->diffInDays(\Carbon\Carbon::parse($a->end_date->toDateString(), 'Asia/Kolkata')->startOfDay(), false) : null;

            return [
                'id' => $p->id, 'name' => $p->name,
                'go_live_date' => ($live->get($p->id)->live_at ?? null) ? substr($live->get($p->id)->live_at, 0, 10) : null,
                'amc_start' => $a?->start_date?->toDateString(), 'renewal_date' => $a?->end_date?->toDateString(), 'amc_amount' => $a ? (float) $a->amount : null, 'amc_notes' => $a?->notes,
                'days_left' => $left,
                'amc_status' => $a === null ? 'No AMC' : ($left < 0 ? 'Expired' : ($left <= self::REMIND_DAYS ? 'Expiring soon' : 'Active')),
            ] + ProjectPaymentState::for($finance->get($p->id), $payments->get($p->id, collect()));
        });

        return response()->json(['data' => $rows->values()]);
    }

    public function setAmc(Request $request, Project $project)
    {
        $finance = ProjectFinance::where('project_id', $project->id)->first();
        $mine = $finance && $finance->sales_user_id === $request->user()->id;
        if (! ($mine || Access::salesSeesAll($request->user()))) {
            $m = 'This project is not yours.';

            return response()->json(['message' => $m, 'errors' => ['amc' => [$m]]], 403);
        }
        $d = $request->validate([
            'amc_start' => ['required', 'date'],
            'renewal_date' => ['required', 'date', 'after:amc_start'],
            'amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], ['renewal_date.after' => 'The renewal date must be after the AMC start.']);

        $amc = AmcContract::where('project_id', $project->id)->whereIn('status', ['Active', 'Expired'])->latest('id')->first() ?? new AmcContract(['project_id' => $project->id, 'created_by' => $request->user()->id]);
        $newEnd = substr($d['renewal_date'], 0, 10);
        $amc->fill(['start_date' => $d['amc_start'], 'end_date' => $d['renewal_date'], 'amount' => $d['amount'], 'notes' => $d['notes'] ?? null, 'status' => 'Active']);
        if ($amc->exists && $amc->getOriginal('end_date')?->toDateString() !== $newEnd) {
            $amc->reminded_at = null; // new renewal date: remind again
        }
        $amc->save();

        return response()->json(['message' => 'AMC saved.', 'data' => $amc->fresh()]);
    }
}
