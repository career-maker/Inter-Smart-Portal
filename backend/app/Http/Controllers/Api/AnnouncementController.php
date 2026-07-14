<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AnnouncementController extends Controller
{
    /**
     * List active (non-expired, scheduled-or-past) announcements.
     * Pinned announcements appear first.
     */
    public function index(Request $request)
    {
        $now = Carbon::now();

        $announcements = Announcement::query()
            ->where(function ($q) use ($now) {
                // Scheduled: either no scheduled_at, or scheduled_at is in the past
                $q->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                // Not expired: either no expires_at, or expires_at is in the future
                $q->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->with('author:id,first_name,last_name')
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json(['data' => $announcements]);
    }

    /**
     * Admin: Create a new announcement.
     */
    public function store(Request $request)
    {
        $rules = [
            'title'        => ['required', 'string', 'max:255'],
            'content'      => ['required', 'string'],
            'category'     => ['required', 'string'],
            'is_pinned'    => ['boolean'],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i', 'nullable'],
            'expires_at'   => ['nullable', 'date_format:Y-m-d\TH:i', 'nullable'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ];

        if ($request->filled('scheduled_at') && $request->filled('expires_at')) {
            $rules['expires_at'][] = 'after:scheduled_at';
        } elseif ($request->filled('expires_at')) {
            $rules['expires_at'][] = 'after:now';
        }

        $data = $request->validate($rules);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('announcements', 'public');
        }

        // Normalize datetime-local format (Y-m-d\TH:i -> Y-m-d H:i)
        $scheduledAt = null;
        if ($data['scheduled_at'] ?? null) {
            $scheduledAt = str_replace('T', ' ', $data['scheduled_at']);
        }
        $expiresAt = null;
        if ($data['expires_at'] ?? null) {
            $expiresAt = str_replace('T', ' ', $data['expires_at']);
        }

        $announcement = Announcement::create([
            'title'        => $data['title'],
            'content'      => $data['content'],
            'category'     => $data['category'],
            'is_pinned'    => $data['is_pinned'] ?? false,
            'scheduled_at' => $scheduledAt,
            'expires_at'   => $expiresAt,
            'image_path'   => $imagePath,
            'created_by'   => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Announcement created successfully.',
            'data'    => $announcement,
        ], 201);
    }

    /**
     * Admin: Update an existing announcement.
     */
    public function update(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'content'      => ['sometimes', 'string'],
            'category'     => ['sometimes', 'string'],
            'is_pinned'    => ['sometimes', 'boolean'],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d\TH:i', 'nullable'],
            'expires_at'   => ['nullable', 'date_format:Y-m-d\TH:i', 'nullable'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('announcements', 'public');
        }

        // Normalize datetime-local format (Y-m-d\TH:i -> Y-m-d H:i)
        if ($data['scheduled_at'] ?? null) {
            $data['scheduled_at'] = str_replace('T', ' ', $data['scheduled_at']);
        }
        if ($data['expires_at'] ?? null) {
            $data['expires_at'] = str_replace('T', ' ', $data['expires_at']);
        }

        $data['updated_by'] = $request->user()->id;
        $announcement->update($data);

        return response()->json([
            'message' => 'Announcement updated.',
            'data'    => $announcement,
        ]);
    }

    /**
     * Admin: Delete an announcement.
     */
    public function destroy(Announcement $announcement)
    {
        $announcement->delete();
        return response()->json(['message' => 'Announcement deleted.']);
    }
}
