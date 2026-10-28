<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_api_answers_carry_the_safe_headers_and_hsts_only_over_https(): void
    {
        $r = $this->getJson('/api/ping');
        $r->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $this->assertFalse($r->headers->has('Strict-Transport-Security'));
        $this->assertFalse($r->headers->has('X-Frame-Options'));

        $secure = $this->getJson('https://localhost/api/ping');
        $secure->assertHeader('Strict-Transport-Security', 'max-age=31536000');
    }
}
