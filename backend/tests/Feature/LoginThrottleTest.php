<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_bad_logins_for_one_email_are_throttled_but_other_emails_are_not(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', ['email' => 'a@x.in', 'password' => 'bad'])->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => 'a@x.in', 'password' => 'bad'])->assertStatus(429);
        $this->postJson('/api/login', ['email' => 'b@x.in', 'password' => 'bad'])->assertStatus(401);
    }
}
