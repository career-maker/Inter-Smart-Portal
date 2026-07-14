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
        // Get raw inputs and normalize datetime-local format (T to space)
        $rawScheduled = $request->input('scheduled_at');
        $rawExpires = $request->input('expires_at');

        $normalizedScheduled = $rawScheduled ? str_replace('T', ' ', $rawScheduled) : null;
        $normalizedExpires = $rawExpires ? str_replace('T', ' ', $rawExpires) : null;

        // Base validation rules
        $rules = [
            'title'        => ['required', 'string', 'max:255'],
            'content'      => ['required', 'string'],
            'category'     => ['required', 'string'],
            'is_pinned'    => ['boolean'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ];

        // Only validate dates if provided
        if ($normalizedScheduled) {
            $rules['scheduled_at'] = ['date_format:Y-m-d H:i'];
        }
        if ($normalizedExpires) {
            $rules['expires_at'] = ['date_format:Y-m-d H:i', 'after:now'];
        }

        // If both dates provided, expires must be after scheduled
        if ($normalizedScheduled && $normalizedExpires) {
            $rules['expires_at'] = ['date_format:Y-m-d H:i', 'after:scheduled_at'];
        }

        // Validate with normalized input
        $validated = $request->validate($rules + [
            'scheduled_at' => [],
            'expires_at' => [],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('announcements', 'public');
        }

        $scheduledAt = $normalizedScheduled;
        $expiresAt = $normalizedExpires;

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
        // Get raw inputs and normalize datetime-local format (T to space)
        $rawScheduled = $request->input('scheduled_at');
        $rawExpires = $request->input('expires_at');

        $normalizedScheduled = $rawScheduled ? str_replace('T', ' ', $rawScheduled) : null;
        $normalizedExpires = $rawExpires ? str_replace('T', ' ', $rawExpires) : null;

        $rules = [
            'title'        => ['sometimes', 'string', 'max:255'],
            'content'      => ['sometimes', 'string'],
            'category'     => ['sometimes', 'string'],
            'is_pinned'    => ['sometimes', 'boolean'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ];

        // Only validate dates if provided
        if ($normalizedScheduled) {
            $rules['scheduled_at'] = ['date_format:Y-m-d H:i'];
        }
        if ($normalizedExpires) {
            $rules['expires_at'] = ['date_format:Y-m-d H:i', 'after:now'];
        }

        // If both dates provided, expires must be after scheduled
        if ($normalizedScheduled && $normalizedExpires) {
            $rules['expires_at'] = ['date_format:Y-m-d H:i', 'after:scheduled_at'];
        }

        $data = $request->validate($rules + [
            'scheduled_at' => [],
            'expires_at' => [],
        ]);

        // Apply normalized dates
        if ($normalizedScheduled !== null) {
            $data['scheduled_at'] = $normalizedScheduled;
        }
        if ($normalizedExpires !== null) {
            $data['expires_at'] = $normalizedExpires;
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('announcements', 'public');
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
