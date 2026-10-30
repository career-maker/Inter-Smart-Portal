<?php

namespace App\Http\Controllers\Api\Work;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\MeetingAction;
use App\Services\Email\EmailService;
use App\Support\Notify;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Part\Multipart\AlternativePart;
use Symfony\Component\Mime\Part\TextPart;

/**
 * Meetings, client and internal. Anyone can organise one. Organiser and attendees see it; the organiser (or a Super Admin)
 * edits it, records minutes and cancels. Attendees get an in-app notice and an email with a calendar (.ics) invite.
 */
class MeetingController extends Controller
{
    private function refuse(string $message)
    {
        return response()->json(['message' => $message, 'errors' => ['meeting' => [$message]]], 403);
    }

    private function canSee($user, Meeting $m): bool
    {
        return $user->hasRole('Super Admin') || $m->organizer_id === $user->id || $m->attendees()->where('users.id', $user->id)->exists();
    }

    private function canManage($user, Meeting $m): bool
    {
        return $user->hasRole('Super Admin') || $m->organizer_id === $user->id;
    }

    private function load(Meeting $m): Meeting
    {
        return $m->load(['organizer:id,first_name,last_name', 'attendees:id,first_name,last_name,email', 'actions.owner:id,first_name,last_name']);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $q = Meeting::with(['organizer:id,first_name,last_name', 'attendees:id,first_name,last_name'])->orderBy('starts_at');
        if (! $user->hasRole('Super Admin')) {
            $q->where(fn ($w) => $w->where('organizer_id', $user->id)->orWhereHas('attendees', fn ($a) => $a->where('users.id', $user->id)));
        }

        return response()->json(['data' => $q->get()]);
    }

    /** Active people to invite (id and name only). */
    public function people()
    {
        return response()->json(['data' => \App\Models\User::where('status', 'Active')->orderBy('first_name')->get(['id', 'first_name', 'last_name'])]);
    }

    public function show(Request $request, Meeting $meeting)
    {
        if (! $this->canSee($request->user(), $meeting)) {
            return $this->refuse('You are not part of this meeting.');
        }

        return response()->json(['data' => $this->load($meeting)]);
    }

    private function rules(): array
    {
        return [
            'kind' => ['required', 'in:client,internal'],
            'title' => ['required', 'string', 'max:255'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'ends_at' => ['required', 'date_format:Y-m-d H:i', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'agenda' => ['nullable', 'string', 'max:3000'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'lead_id' => ['nullable', 'integer'],
            'attendee_ids' => ['nullable', 'array'],
            'attendee_ids.*' => ['exists:users,id'],
            'external_emails' => ['nullable', 'array'],
            'external_emails.*' => ['email'],
        ];
    }

    /** Times arrive as India time (the portal's working time zone) and are stored in UTC. */
    private function utc(string $v): Carbon
    {
        return Carbon::createFromFormat('Y-m-d H:i', $v, 'Asia/Kolkata')->utc();
    }

    /** Create a meeting and send the invites. Also used when Sales asks for a meeting about an out-of-scope request. $d has the same keys as the store request. */
    public function schedule($organizer, array $d): Meeting
    {
        $m = Meeting::create([
            'kind' => $d['kind'], 'title' => $d['title'], 'organizer_id' => $organizer->id,
            'project_id' => $d['project_id'] ?? null, 'lead_id' => $d['lead_id'] ?? null,
            'starts_at' => $this->utc($d['starts_at']), 'ends_at' => $this->utc($d['ends_at']),
            'location' => $d['location'] ?? null, 'agenda' => $d['agenda'] ?? null,
            'external_emails' => array_values(array_unique($d['external_emails'] ?? [])),
        ]);
        $m->attendees()->sync($d['attendee_ids'] ?? []);
        $this->invite($m, 'REQUEST', $organizer);

        return $m;
    }

    public function store(Request $request)
    {
        $d = $request->validate($this->rules());
        $m = $this->schedule($request->user(), $d);

        return response()->json(['message' => 'Meeting scheduled and invites sent.', 'data' => $this->load($m)], 201);
    }

    public function update(Request $request, Meeting $meeting)
    {
        if (! $this->canManage($request->user(), $meeting)) {
            return $this->refuse('Only the organiser can change this meeting.');
        }
        if ($meeting->status !== 'Scheduled') {
            return $this->refuse('Only a scheduled meeting can be changed.');
        }
        $d = $request->validate($this->rules());
        $meeting->update([
            'kind' => $d['kind'], 'title' => $d['title'], 'project_id' => $d['project_id'] ?? null, 'lead_id' => $d['lead_id'] ?? null,
            'starts_at' => $this->utc($d['starts_at']), 'ends_at' => $this->utc($d['ends_at']),
            'location' => $d['location'] ?? null, 'agenda' => $d['agenda'] ?? null,
            'external_emails' => array_values(array_unique($d['external_emails'] ?? [])),
        ]);
        $meeting->attendees()->sync($d['attendee_ids'] ?? []);
        $this->invite($meeting, 'REQUEST', $request->user());

        return response()->json(['message' => 'Meeting updated and invites resent.', 'data' => $this->load($meeting)]);
    }

    public function minutes(Request $request, Meeting $meeting)
    {
        if (! $this->canManage($request->user(), $meeting)) {
            return $this->refuse('Only the organiser can record minutes.');
        }
        $d = $request->validate(['minutes' => ['required', 'string', 'max:10000']]);
        $meeting->update(['minutes' => $d['minutes'], 'status' => $meeting->status === 'Cancelled' ? 'Cancelled' : 'Done']);

        return response()->json(['message' => 'Minutes saved.', 'data' => $this->load($meeting)]);
    }

    public function cancel(Request $request, Meeting $meeting)
    {
        if (! $this->canManage($request->user(), $meeting)) {
            return $this->refuse('Only the organiser can cancel this meeting.');
        }
        if ($meeting->status !== 'Scheduled') {
            return $this->refuse('Only a scheduled meeting can be cancelled.');
        }
        $meeting->update(['status' => 'Cancelled']);
        $this->invite($meeting, 'CANCEL', $request->user());

        return response()->json(['message' => 'Meeting cancelled.', 'data' => $this->load($meeting)]);
    }

    public function addAction(Request $request, Meeting $meeting)
    {
        if (! $this->canManage($request->user(), $meeting)) {
            return $this->refuse('Only the organiser can add follow-up actions.');
        }
        $d = $request->validate(['text' => ['required', 'string', 'max:255'], 'owner_id' => ['nullable', 'exists:users,id'], 'due_date' => ['nullable', 'date']]);
        $a = $meeting->actions()->create($d);
        if ($a->owner_id) {
            Notify::users([$a->owner], 'Meeting follow-up', "{$meeting->title}: {$a->text}", 'meeting.action', null, $request->user());
        }

        return response()->json(['message' => 'Follow-up added.', 'data' => $a], 201);
    }

    public function toggleAction(Request $request, MeetingAction $action)
    {
        $user = $request->user();
        if (! ($this->canManage($user, $action->meeting) || $action->owner_id === $user->id)) {
            return $this->refuse('Only the organiser or the person it is assigned to can tick this off.');
        }
        $action->update(['done' => ! $action->done]);

        return response()->json(['data' => $action]);
    }

    public function ics(Request $request, Meeting $meeting)
    {
        if (! $this->canSee($request->user(), $meeting)) {
            return $this->refuse('You are not part of this meeting.');
        }

        return response($this->buildIcs($meeting, $meeting->status === 'Cancelled' ? 'CANCEL' : 'REQUEST'), 200, ['Content-Type' => 'text/calendar; charset=utf-8', 'Content-Disposition' => 'attachment; filename="meeting.ics"']);
    }

    /** In-app notice to attendees and an email with the .ics invite to attendees and client addresses. Mail trouble never blocks the meeting. */
    private function invite(Meeting $m, string $method, $actor): void
    {
        $m->load('attendees');
        $when = $m->starts_at->copy()->setTimezone('Asia/Kolkata')->format('d M Y, H:i') . ' IST';
        $verb = $method === 'CANCEL' ? 'cancelled' : 'scheduled';
        Notify::users($m->attendees, 'Meeting ' . $verb, "{$m->title}, {$when}", 'meeting.' . $verb, null, $actor);

        $to = $m->attendees->pluck('email')->merge($m->external_emails ?? [])->filter()->unique()->values();
        if ($to->isEmpty()) {
            return;
        }
        // Sent after the response goes out, so a slow SMTP server never holds the page up.
        dispatch(function () use ($m, $to, $method, $verb, $when) {
        try {
            EmailService::applySmtpConfig();
            $ics = $this->buildIcs($m, $method);
            $m->loadMissing('organizer:id,first_name,last_name');
            $body = view('emails.meeting-invite', ['meeting' => $m, 'verb' => $verb, 'when' => $when])->render();
            foreach ($to as $email) {
                Mail::html($body, function ($msg) use ($email, $m, $ics, $method, $verb) {
                    $msg->to($email)->subject("Meeting {$verb}: {$m->title}");
                    // Gmail and Outlook only treat the mail as a real invitation (and add it to the calendar) when the
                    // calendar data is a body alternative with its method set, not just an attachment.
                    $cal = new TextPart($ics, 'utf-8', 'calendar', '8bit');
                    $cal->getHeaders()->get('Content-Type')->setParameter('method', $method);
                    $msg->getSymfonyMessage()->setBody(new AlternativePart(
                        new TextPart("Meeting {$verb}: {$m->title}\nWhen: " . $m->starts_at->copy()->setTimezone('Asia/Kolkata')->format('d M Y, H:i') . " IST\nWhere: " . ($m->location ?: 'to be shared')),
                        new TextPart($body, 'utf-8', 'html'),
                        $cal
                    ));
                });
            }
        } catch (\Throwable $e) {
            \Log::warning('Meeting invite email failed: ' . $e->getMessage());
        }
        })->afterResponse();
    }

    private function buildIcs(Meeting $m, string $method): string
    {
        $esc = fn ($s) => str_replace(["\\", ';', ',', "\r\n", "\n"], ['\\\\', '\;', '\,', '\n', '\n'], (string) $s);
        $fmt = fn (Carbon $c) => $c->copy()->utc()->format('Ymd\THis\Z');
        $organizer = $m->organizer ?? $m->load('organizer')->organizer;
        $m->loadMissing('attendees');
        $link = preg_match('#^https?://#i', trim((string) $m->location)) ? trim($m->location) : null;
        $desc = trim(($m->agenda ?: '') . ($link ? "

Join: {$link}" : ''));
        // One ATTENDEE per invitee: mail apps only treat the message as an invitation (and add it to the calendar) when the recipient is listed
        $attendees = [];
        foreach ($m->attendees as $a) {
            if ($a->email) {
                $attendees[] = 'ATTENDEE;CN=' . $esc("{$a->first_name} {$a->last_name}") . ';ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:' . $a->email;
            }
        }
        foreach ($m->external_emails ?? [] as $e) {
            $attendees[] = 'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:' . $e;
        }
        $lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Intersmart//Portal//EN', 'METHOD:' . $method,
            'BEGIN:VEVENT',
            "UID:meeting-{$m->id}@intersmart.in",
            'DTSTAMP:' . $fmt(now()),
            'DTSTART:' . $fmt($m->starts_at),
            'DTEND:' . $fmt($m->ends_at),
            'SUMMARY:' . $esc($m->title),
            'LOCATION:' . $esc($m->location),
            'DESCRIPTION:' . $esc($desc),
            ...($link ? ['URL:' . $link] : []),
            ...$attendees,
            'ORGANIZER;CN=' . $esc("{$organizer->first_name} {$organizer->last_name}") . ':mailto:' . $organizer->email,
            'SEQUENCE:' . max(0, $m->updated_at->timestamp - $m->created_at->timestamp), // grows with every change so calendars take the update
            'STATUS:' . ($method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'),
            'END:VEVENT', 'END:VCALENDAR',
        ];

        return implode("\r\n", $lines) . "\r\n";
    }
}
