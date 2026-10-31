<?php

namespace App\Services;

use App\Models\Meeting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Puts a meeting straight onto the invitees' Google Calendars (Workspace service account with domain-wide delegation),
 * so the event appears without anyone opening the email. Off until services.google_calendar.credentials points at the
 * service-account JSON key (kept outside the repo). Event id is derived from the meeting id, so updates and cancels
 * need no extra column. Google sends no mail of its own (sendUpdates=none): the portal's invite email stays the
 * notice, and external clients still get it.
 */
class GoogleCalendar
{
    private const SCOPE = 'https://www.googleapis.com/auth/calendar';
    private const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    public static function enabled(): bool
    {
        $path = config('services.google_calendar.credentials');

        return $path && is_readable($path);
    }

    public static function eventId(Meeting $m): string
    {
        // Google event ids allow only a-v and 0-9
        return 'ismeeting' . $m->id;
    }

    /** Create or update the event ($cancel false) or remove it ($cancel true). Throws on a real failure. */
    public static function sync(Meeting $m, bool $cancel = false): void
    {
        $m->loadMissing('organizer', 'attendees');
        $subject = config('services.google_calendar.subject') ?: $m->organizer?->email;
        $token = self::token($subject);
        $url = self::API . '/' . self::eventId($m) . '?sendUpdates=none';
        $http = Http::withToken($token)->acceptJson();

        if ($cancel) {
            $r = $http->delete($url);
            if (! $r->successful() && ! in_array($r->status(), [404, 410])) {
                $r->throw();
            }

            return;
        }

        $link = preg_match('#^https?://#i', trim((string) $m->location)) ? trim($m->location) : null;
        $body = [
            'summary' => $m->title,
            'location' => $m->location,
            'description' => trim(($m->agenda ?: '') . ($link ? "\n\nJoin: {$link}" : '')),
            'start' => ['dateTime' => $m->starts_at->copy()->utc()->format('Y-m-d\TH:i:s\Z')],
            'end' => ['dateTime' => $m->ends_at->copy()->utc()->format('Y-m-d\TH:i:s\Z')],
            'attendees' => $m->attendees->pluck('email')->merge($m->external_emails ?? [])->filter()->unique()
                ->map(fn ($e) => ['email' => $e])->values()->all(),
            'status' => 'confirmed',
        ];
        $r = $http->put($url, $body);
        if ($r->status() === 404 || $r->status() === 410) {
            // not created yet (or removed on Google's side): insert with our own id
            $r = $http->post(self::API . '?sendUpdates=none', $body + ['id' => self::eventId($m)]);
        }
        $r->throw();
    }

    private static function token(?string $subject): string
    {
        $key = json_decode(file_get_contents(config('services.google_calendar.credentials')), true);

        return Cache::remember('gcal-token-' . md5((string) $subject), 3000, function () use ($key, $subject) {
            $b64 = fn ($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
            $now = time();
            $unsigned = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . $b64(json_encode([
                'iss' => $key['client_email'], 'sub' => $subject, 'scope' => self::SCOPE,
                'aud' => $key['token_uri'] ?? 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600,
            ]));
            openssl_sign($unsigned, $sig, $key['private_key'], 'sha256WithRSAEncryption');
            $r = Http::asForm()->post($key['token_uri'] ?? 'https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $unsigned . '.' . $b64($sig),
            ])->throw();

            return $r->json('access_token');
        });
    }
}
