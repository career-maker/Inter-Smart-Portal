<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Audit 15 Nov 2026, findings H-01 and H-02: HR policy upload/archive and document-request
 * fulfilment were open to every logged-in employee. Only Super Admin / Admin / HR may do them.
 */
class PolicyAndDocumentAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role): User
    {
        Role::firstOrCreate(['name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);
        $this->app['auth']->forgetGuards();

        return $user;
    }

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken);
    }

    private function policyPayload(): array
    {
        return ['title' => 'Test policy', 'category' => 'HR', 'version' => '1', 'file' => UploadedFile::fake()->create('p.pdf', 10, 'application/pdf')];
    }

    public function test_employee_cannot_upload_or_archive_an_hr_policy(): void
    {
        Storage::fake('public');
        $employee = $this->actor('Employee');

        $this->as($employee)->post('/api/hr-policies', $this->policyPayload(), ['Accept' => 'application/json'])->assertStatus(403);
        $this->assertDatabaseCount('hr_policies', 0);

        $id = DB::table('hr_policies')->insertGetId(['title' => 'Existing', 'category' => 'HR', 'file_path' => 'policies/x.pdf', 'created_at' => now(), 'updated_at' => now()]);
        $this->as($employee)->deleteJson("/api/hr-policies/{$id}")->assertStatus(403);
        $this->assertDatabaseHas('hr_policies', ['id' => $id, 'is_archived' => false]);
    }

    public function test_hr_and_super_admin_can_manage_policies_and_employee_can_still_read_them(): void
    {
        Storage::fake('public');

        $this->as($this->actor('HR'))->post('/api/hr-policies', $this->policyPayload(), ['Accept' => 'application/json'])->assertStatus(201);
        $this->as($this->actor('Super Admin'))->post('/api/hr-policies', $this->policyPayload(), ['Accept' => 'application/json'])->assertStatus(201);
        $this->as($this->actor('Employee'))->getJson('/api/hr-policies')->assertOk();
    }

    public function test_employee_cannot_fulfil_a_document_request_but_hr_can(): void
    {
        Storage::fake('public');
        Notification::fake();
        $owner = $this->actor('Employee');
        $other = $this->actor('Employee');
        $requestId = DB::table('document_requests')->insertGetId(['user_id' => $owner->id, 'request_number' => 'REQ-T-1', 'subject' => 'Letter', 'status' => 'Pending', 'created_at' => now(), 'updated_at' => now()]);

        $this->as($other)->postJson("/api/document-requests/{$requestId}/upload", ['document_url' => 'https://example.com/x'])->assertStatus(403);
        $this->assertDatabaseHas('document_requests', ['id' => $requestId, 'status' => 'Pending']);

        $this->as($this->actor('HR'))->postJson("/api/document-requests/{$requestId}/upload", ['document_url' => 'https://example.com/x'])->assertOk();
        $this->assertDatabaseHas('document_requests', ['id' => $requestId, 'status' => 'Uploaded']);
    }
}
