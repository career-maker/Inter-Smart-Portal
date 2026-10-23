<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Smoke check: every parameter-free GET endpoint must answer without a server error
 * (5xx) for each main role. 4xx (forbidden, validation) is fine. Catches a module
 * broken by a new change before users do.
 */
class SmokeReadEndpointsTest extends TestCase
{
    use RefreshDatabase;

    /** Call external services or are health checks; not meaningful offline. */
    private const SKIP = ['api/ping', 'hubstaff', 'chat/context', 'import/'];

    public function test_get_endpoints_do_not_crash_for_each_role(): void
    {
        $uris = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($r) => in_array('GET', $r->methods(), true))
            ->map(fn ($r) => $r->uri())
            ->filter(fn ($u) => str_starts_with($u, 'api/') && ! str_contains($u, '{'))
            ->reject(fn ($u) => collect(self::SKIP)->contains(fn ($s) => str_contains($u, $s)))
            ->unique()->values();

        $this->assertGreaterThan(50, $uris->count());

        $crashed = [];
        $roles = ['Super Admin', 'Team Lead', 'Employee'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($roles as $roleName) {
            $user = User::factory()->create();
            $user->assignRole($roleName);
            $headers = ['Authorization' => 'Bearer ' . $user->createToken('smoke')->plainTextToken];

            foreach ($uris as $uri) {
                $status = $this->withHeaders($headers)->getJson('/' . $uri)->getStatusCode();
                if ($status >= 500) {
                    $crashed[] = "{$roleName} GET /{$uri} -> {$status}";
                }
            }
        }

        $this->assertSame([], $crashed, "Endpoints that crash:\n" . implode("\n", $crashed));
    }
}
