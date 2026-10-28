<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Sales\CompletedProjectController;
use App\Models\AmcContract;
use App\Models\Project;
use App\Models\ProjectFinance;
use App\Models\User;
use App\Support\Feature;
use App\Support\Notify;
use Illuminate\Console\Command;

/** Daily: tell the salesperson once when a project's AMC is 30 days or less from its renewal date. */
class SendAmcReminders extends Command
{
    protected $signature = 'sales:amc-reminders';

    protected $description = 'Remind Sales before an AMC expires';

    public function handle(): int
    {
        if (! Feature::enabled('sales')) {
            return self::SUCCESS;
        }
        $limit = now('Asia/Kolkata')->addDays(CompletedProjectController::REMIND_DAYS)->toDateString();
        $due = AmcContract::where('status', 'Active')->whereNull('reminded_at')->where('end_date', '>=', now('Asia/Kolkata')->toDateString())->where('end_date', '<=', $limit)->get();

        foreach ($due as $a) {
            $project = Project::find($a->project_id);
            $sales = User::find(ProjectFinance::where('project_id', $a->project_id)->value('sales_user_id'));
            if ($project && $sales) {
                $day = $a->end_date->toDateString();
                Notify::users([$sales], 'AMC renewal due', "The AMC for \"{$project->name}\" expires on {$day}. Please speak to the client about renewing.", 'amc_expiring', $project->id);
            }
            $a->update(['reminded_at' => now()]);
        }
        $this->info($due->count() . ' reminder(s) sent.');

        return self::SUCCESS;
    }
}
