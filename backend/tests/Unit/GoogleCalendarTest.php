<?php

namespace Tests\Unit;

use App\Models\Meeting;
use App\Models\User;
use App\Services\GoogleCalendar;
use Carbon\Carbon;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleCalendarTest extends TestCase
{
    public function test_sync_creates_updates_and_cancels_the_event_as_the_organiser(): void
    {
        openssl_pkey_export(openssl_pkey_new(['private_key_bits' => 2048]), $pem);
        $file = tempnam(sys_get_temp_dir(), 'gcal');
        file_put_contents($file, json_encode(['client_email' => 'svc@x.iam.gserviceaccount.com', 'private_key' => $pem, 'token_uri' => 'https://oauth2.googleapis.com/token']));
        config(['services.google_calendar.credentials' => $file, 'services.google_calendar.subject' => null, 'cache.default' => 'array']);
        Cache::flush();

        $m = new Meeting(['title' => 'Kickoff', 'location' => 'https://meet.google.com/abc', 'starts_at' => Carbon::parse('2026-11-02 04:30', 'UTC'),
            'ends_at' => Carbon::parse('2026-11-02 05:30', 'UTC'), 'external_emails' => ['client@example.com']]);
        $m->id = 7;
        $m->setRelation('organizer', new User(['email' => 'boss@intersmart.in']));
        $m->setRelation('attendees', collect([new User(['email' => 'a@intersmart.in'])]));

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'tok']),
            '*/events/ismeeting7*' => Http::sequence()->push([], 404)->push(['id' => 'ismeeting7'])->push([], 404),
            '*/events?*' => Http::response(['id' => 'ismeeting7']),
        ]);

        $this->assertTrue(GoogleCalendar::enabled());
        GoogleCalendar::sync($m);            // PUT 404 -> POST insert
        GoogleCalendar::sync($m, true);      // DELETE 404 is fine

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && str_contains($r->url(), '/events?sendUpdates=none')
            && $r['id'] === 'ismeeting7' && $r['start']['dateTime'] === '2026-11-02T04:30:00Z'
            && collect($r['attendees'])->pluck('email')->all() === ['a@intersmart.in', 'client@example.com']);
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE');
        unlink($file);
    }
}
