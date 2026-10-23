<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_token_older_than_90_days_is_rejected_but_recent_one_works(): void
    {
        $user = User::factory()->create();

        $old = $user->createToken('old');
        $old->accessToken->forceFill(['created_at' => now()->subDays(91)])->save();
        $recent = $user->createToken('recent');
        $recent->accessToken->forceFill(['created_at' => now()->subDays(89)])->save();

        $this->withHeader('Authorization', 'Bearer ' . $old->plainTextToken)->getJson('/api/me')->assertStatus(401);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $recent->plainTextToken)->getJson('/api/me')->assertOk();
    }

    public function test_authenticated_api_has_a_300_per_minute_limit(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer ' . $user->createToken('t')->plainTextToken)
            ->getJson('/api/me')
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit', '300');
    }
}
