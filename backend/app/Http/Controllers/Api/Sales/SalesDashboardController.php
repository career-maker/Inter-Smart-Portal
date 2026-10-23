<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\SalesTarget;
use App\Support\Access;
use Illuminate\Http\Request;

/** The sales dashboard counts from the sheet. Personal for a salesperson; company-wide for Super Admin / Sales lead. */
class SalesDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $all = Access::salesSeesAll($user);
        $mine = fn ($q, $col = 'owner_id') => $all ? $q : $q->where($col, $user->id);
        $monthStart = now()->startOfMonth();

        $leads = $mine(Lead::query())->get();
        $won = $leads->where('status', 'Won')->count();
        $lost = $leads->where('status', 'Lost')->count();

        $finance = $mine(ProjectFinance::query()->whereNotNull('sales_user_id'), 'sales_user_id')->get(); // projects Accounts set up without a salesperson are not Sales numbers
        $signedThisMonth = $finance->filter(fn ($f) => $f->created_at >= $monthStart)->sum('contract_value');
        $target = $mine(SalesTarget::query(), 'user_id')->where('period', now()->format('Y-m'))->sum('target_amount');

        $done = fn ($kind) => $mine(LeadActivity::query())->where('kind', $kind)->where('status', 'Done')->where('completed_at', '>=', $monthStart)->count();

        return response()->json([
            'scope' => $all ? 'all' : 'mine',
            'leads' => [
                'follow_up' => $leads->whereIn('status', ['New', 'Follow up'])->count(),
                'hot' => $leads->where('status', 'Hot')->count(),
                'ready_to_close' => $leads->where('status', 'Ready to close')->count(),
                'ready_to_close_value' => (float) $leads->where('status', 'Ready to close')->sum('expected_value'),
            ],
            'conversion_percent' => ($won + $lost) > 0 ? round(100 * $won / ($won + $lost), 1) : null,
            'target' => ['month' => now()->format('Y-m'), 'target' => (float) $target, 'achieved' => (float) $signedThisMonth],
            'projects_ongoing' => Project::whereIn('id', $finance->pluck('project_id'))->whereIn('status', ['Planning', 'Active'])->count(),
            'pending_actions' => $mine(LeadActivity::query())->where('status', 'Open')->whereDate('due_at', '<=', now()->toDateString())->count(),
            'meetings_attended' => $done('meeting'),
            'proposals_shared' => $done('proposal'),
        ]);
    }
}
