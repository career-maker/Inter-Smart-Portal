<?php

namespace Tests\Feature;

use App\Support\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class FeatureFlagTest extends TestCase
{
    use RefreshDatabase;

    public function test_module_is_off_by_default_and_can_be_switched_on_and_off(): void
    {
        $this->assertFalse(Feature::enabled('accounts'));

        Feature::set('accounts', true);
        $this->assertTrue(Feature::enabled('accounts'));

        Feature::set('accounts', false);
        $this->assertFalse(Feature::enabled('accounts'));
    }

    public function test_feature_middleware_hides_route_until_enabled(): void
    {
        Route::middleware('feature:accounts')->get('/api/_feature_probe', fn () => response()->json(['ok' => true]));

        $this->getJson('/api/_feature_probe')->assertStatus(404);

        Feature::set('accounts', true);
        $this->getJson('/api/_feature_probe')->assertOk()->assertJson(['ok' => true]);
    }
}
