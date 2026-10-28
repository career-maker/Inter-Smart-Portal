<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\NotificationLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class NotificationLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_notification_opens_the_page_of_the_receivers_own_module(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $sales = User::factory()->create(['team_id' => Team::create(['name' => 'Sales'])->id]);
        $accounts = User::factory()->create(['team_id' => Team::create(['name' => 'Accounts'])->id]);
        $pmo = User::factory()->create(['team_id' => Team::create(['name' => 'PMO 1'])->id]);
        $dev = User::factory()->create(['team_id' => Team::create(['name' => 'HTML'])->id]);

        // the same project event goes to each person's own module (never the general project-management list)
        $this->assertSame('/sales/projects', NotificationLink::for('payment_approved', 7, $sales));
        $this->assertSame('/accounts', NotificationLink::for('payment_approved', 7, $accounts));
        $this->assertSame('/pmo/projects/7', NotificationLink::for('payment_approved', 7, $pmo));
        $this->assertSame('/work/projects/7', NotificationLink::for('payment_approved', 7, $dev));

        // events with one fixed home
        $this->assertSame('/sales/completed', NotificationLink::for('amc_expiring', 7, $sales));
        $this->assertSame('/sales/out-of-scope', NotificationLink::for('out_of_scope_sales_action', 7, $sales));
        $this->assertSame('/sales/out-of-scope', NotificationLink::for('out_of_scope_approved', 7, $sales));
        $this->assertSame('/pmo/approvals', NotificationLink::for('out_of_scope_approved', 7, $pmo));
        $this->assertSame('/pmo/approvals', NotificationLink::for('out_of_scope_requested', 7, $pmo));
        $this->assertSame('/accounts', NotificationLink::for('payment_requested', 7, $accounts));
        $this->assertSame('/work/go-live', NotificationLink::for('server_requested', 7, $dev));
        $this->assertSame('/work/qa', NotificationLink::for('qa_ready', 7, $dev));
        $this->assertSame('/work/projects/7', NotificationLink::for('sprint_submitted', 7, $pmo));
        $this->assertSame('/appreciation', NotificationLink::for('appreciation.nominated', null, $pmo));
        $this->assertSame('/meetings', NotificationLink::for('meeting.scheduled', null, $dev));

        foreach (['payment_approved', 'project_assigned', 'sprint_decided', 'amc_expiring'] as $event) {
            $this->assertStringNotContainsString('project-management', NotificationLink::for($event, 7, $sales));
        }
    }
}
