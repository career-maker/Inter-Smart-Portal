<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;

class SchedulerEndpointTest extends TestCase
{
    public function test_missing_configured_secret_fails_closed()
    {
        Config::set('services.scheduler_secret', null);
        
        $response = $this->postJson('/api/system/scheduler/run');
        
        $response->assertStatus(500);
    }

    public function test_missing_bearer_token_returns_unauthorized()
    {
        Config::set('services.scheduler_secret', 'secret-token');
        
        $response = $this->postJson('/api/system/scheduler/run');
        
        $response->assertStatus(401);
    }

    public function test_incorrect_token_returns_unauthorized()
    {
        Config::set('services.scheduler_secret', 'secret-token');
        
        $response = $this->withToken('wrong-token')->postJson('/api/system/scheduler/run');
        
        $response->assertStatus(401);
    }

    public function test_correct_token_invokes_schedule_run()
    {
        Config::set('services.scheduler_secret', 'secret-token');
        
        // Register a fake command to avoid running real schedule
        Artisan::command('schedule:run', function () {
            $this->info('Fake schedule run');
        });
        
        $response = $this->withToken('secret-token')->postJson('/api/system/scheduler/run');
        
        $response->assertStatus(200);
        $response->assertJson(['status' => 'scheduler_invoked']);
    }

    public function test_endpoint_is_post_only()
    {
        $response = $this->get('/api/system/scheduler/run');
        
        $response->assertStatus(405);
    }
}
