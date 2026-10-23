<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SuperAdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_dashboard_loads_widgets_including_recent_audit_logs(): void
    {
        Role::firstOrCreate(['name' => 'Super Admin']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'updated',
            'model_type' => 'App\Models\User',
            'model_id' => $admin->id,
        ]);

        $res = $this->withHeader('Authorization', 'Bearer ' . $admin->createToken('t')->plainTextToken)
            ->getJson('/api/dashboard')
            ->assertOk();

        $logs = $res->json('widgets.recent_audit_logs');
        $this->assertNotEmpty($logs);
        $this->assertSame("User #{$admin->id}", $logs[0]['description']);
    }
}
