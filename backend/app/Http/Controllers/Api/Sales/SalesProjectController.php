<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\ProjectIntake;
use App\Models\ProjectPayment;
use App\Models\ProjectTask;
use App\Models\User;
use App\Notifications\AccountsNotification;
use App\Support\Access;
use App\Support\ProjectPaymentState;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Projects the salesperson created: create (project intake), list with payment state and progress, hold/terminate. */
class SalesProjectController extends Controller
{
    public const CATEGORIES = ['CMS', 'Ecom', 'Custom web', 'Mobile app'];

    public function index(Request $request)
    {
        $finance = ProjectFinance::query()->whereNotNull('sales_user_id');
        if (! Access::salesSeesAll($request->user())) {
            $finance->where('sales_user_id', $request->user()->id);
        }
        $finance = $finance->get()->keyBy('project_id');

        $projects = Project::whereIn('id', $finance->keys())->orderByDesc('id')->get();
        $intake = ProjectIntake::whereIn('project_id', $projects->pluck('id'))->get()->keyBy('project_id');
        $payments = ProjectPayment::whereIn('project_id', $projects->pluck('id'))->get()->groupBy('project_id');
        $tasks = ProjectTask::whereIn('project_id', $projects->pluck('id'))
            ->selectRaw('project_id, count(*) as total, sum(status = ?) as done', ['Completed'])->groupBy('project_id')->get()->keyBy('project_id');

        $rows = $projects->map(function ($p) use ($finance, $intake, $payments, $tasks) {
            $t = $tasks->get($p->id);
            $in = $intake->get($p->id);

            return [
                'id' => $p->id, 'name' => $p->name, 'status' => $p->status,
                'client_name' => $in?->client_name, 'platform' => $in?->platform, 'site_category' => $in?->site_category,
                'pages_count' => $in?->pages_count, 'quality_level' => $in?->quality_level,
                'progress_percent' => $t && $t->total > 0 ? (int) round(100 * $t->done / $t->total) : null,
                'sales_user_id' => $finance->get($p->id)->sales_user_id,
            ] + ProjectPaymentState::for($finance->get($p->id), $payments->get($p->id, collect()));
        });

        if ($request->filled('status')) {
            $rows = $rows->where('status', $request->status);
        }

        return response()->json(['data' => $rows->values()]);
    }

    /** Create a project from the sales intake. Also creates the finance record so Accounts sees it awaiting an advance. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'client_name' => 'required|string|max:255',
            'client_email' => 'nullable|email|max:255',
            'client_phone' => 'nullable|string|max:50',
            'site_category' => ['required', Rule::in(self::CATEGORIES)],
            'cms_variant' => ['nullable', Rule::in(['Copy of other website', 'AI/Custom'])],
            'platform' => 'required|string|max:100',
            'pages_count' => 'nullable|integer|min:1|max:10000',
            'quality_level' => ['nullable', Rule::in(['Basic', 'Standard', 'Premium'])],
            'budget' => 'required|numeric|min:0',
            'budget_cap' => 'nullable|numeric|min:0|max:100000000',
            'details' => 'nullable|array',
            'details.*' => 'nullable|string|max:2000',
            'overview' => 'nullable|string|max:5000',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        // Copying another website is priced on budget and page count only (sheet), so pages are required there.
        if (($data['cms_variant'] ?? null) === 'Copy of other website' && empty($data['pages_count'])) {
            return response()->json(['message' => 'Number of pages is required for a copy of another website.', 'errors' => ['pages_count' => ['Number of pages is required for a copy of another website.']]], 422);
        }

        $user = $request->user();
        $lead = isset($data['lead_id']) ? Lead::find($data['lead_id']) : null;
        if ($lead && ! Access::salesSeesAll($user) && $lead->owner_id !== $user->id) {
            return response()->json(['message' => 'This lead belongs to another salesperson.'], 403);
        }

        try {
            $project = DB::transaction(function () use ($data, $user, $lead) {
                $project = Project::create([
                    'name' => $data['name'], 'description' => $data['overview'] ?? null, 'status' => 'Planning',
                    'project_type' => $data['platform'], 'category' => $data['site_category'],
                    'start_date' => now()->toDateString(), 'created_by' => $user->id,
                ]);
                ProjectFinance::create(['project_id' => $project->id, 'contract_value' => $data['budget'], 'sales_user_id' => $user->id, 'created_by' => $user->id]);
                ProjectIntake::create([
                    'project_id' => $project->id, 'lead_id' => $lead?->id, 'sales_user_id' => $user->id,
                    'client_name' => $data['client_name'], 'client_email' => $data['client_email'] ?? null, 'client_phone' => $data['client_phone'] ?? null,
                    'site_category' => $data['site_category'], 'cms_variant' => $data['cms_variant'] ?? null, 'platform' => $data['platform'],
                    'pages_count' => $data['pages_count'] ?? null, 'quality_level' => $data['quality_level'] ?? null,
                    'budget' => $data['budget'], 'budget_cap' => $data['budget_cap'] ?? null, 'overview' => $data['overview'] ?? null,
                    'details' => $data['details'] ?? null,
                ]);
                $lead?->update(['status' => 'Won', 'converted_project_id' => $project->id]);

                return $project;
            });
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), 'UNIQUE')) {
                return response()->json(['message' => 'A project with this name already exists.', 'errors' => ['name' => ['A project with this name already exists.']]], 422);
            }
            throw $e;
        }

        $this->audit($request, $project, 'created project from sales intake', ['budget' => $data['budget'], 'client' => $data['client_name']]);
        $this->notify(Access::teamMembers(['accounts']), 'New project awaiting advance', "\"{$project->name}\" was created by Sales (" . number_format((float) $data['budget'], 2) . '). Advance payment is awaiting.', 'project_created', $project->id, $user);

        return response()->json(['data' => $project->only(['id', 'name', 'status'])], 201);
    }

    /** Sales hold / terminate / resume on its own project, with a reason. */
    public function setStatus(Request $request, Project $project)
    {
        $finance = ProjectFinance::where('project_id', $project->id)->first();
        abort_unless($finance && (Access::salesSeesAll($request->user()) || $finance->sales_user_id === $request->user()->id), 403, 'This project belongs to another salesperson.');

        $data = $request->validate(['status' => 'required|in:On Hold,Cancelled,Active', 'reason' => 'required|string|max:2000']);
        $old = $project->status;
        $project->update(['status' => $data['status']]);

        $this->audit($request, $project, 'changed project status', ['from' => $old, 'to' => $data['status'], 'reason' => $data['reason']]);
        $this->notify(
            Access::teamMembers(['accounts', 'pmo'])->merge(User::where('id', $project->project_coordinator_id)->get()),
            'Project status changed', "\"{$project->name}\" moved from {$old} to {$data['status']} by Sales. Reason: {$data['reason']}", 'project_status_changed', $project->id, $request->user()
        );

        return response()->json(['data' => $project->only(['id', 'name', 'status'])]);
    }

    private function notify($users, string $title, string $message, string $event, int $projectId, User $actor): void
    {
        foreach ($users->unique('id')->reject(fn ($u) => $u->id === $actor->id) as $user) {
            try {
                $user->notify(new AccountsNotification($title, $message, $event, $projectId));
            } catch (\Throwable $e) {
                \Log::warning('Sales notification failed: ' . $e->getMessage());
            }
        }
    }

    private function audit(Request $request, $model, string $action, array $changes): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id, 'action' => $action, 'model_type' => get_class($model),
            'model_id' => $model->id, 'changes' => json_encode($changes), 'ip_address' => $request->ip(),
        ]);
    }
}
