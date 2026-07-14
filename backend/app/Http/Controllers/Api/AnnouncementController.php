<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AnnouncementController extends Controller
{
    /**
     * Normalize datetime from various formats to Y-m-d H:i
     */
    private function normalizeDatetime($dateStr)
    {
        if (!$dateStr) return null;

        // Handle datetime-local format: YYYY-MM-DDTHH:MM
        if (str_contains($dateStr, 'T')) {
            return str_replace('T', ' ', $dateStr);
        }

        // Handle DD-MM-YYYY HH:MM or DD-MM-YYYY format
        if (preg_match('/(\d{2})-(\d{2})-(\d{4})(\s(\d{2}):(\d{2}))?/', $dateStr)) {
            $parts = preg_split('/[\s-:]/', $dateStr);
            if (count($parts) >= 3) {
                $day = $parts[0];
                $month = $parts[1];
                $year = $parts[2];
                $hour = $parts[3] ?? '00';
                $minute = $parts[4] ?? '00';
                return "$year-$month-$day $hour:$minute";
            }
        }

        // Handle YYYY-MM-DD HH:MM format
        if (str_contains($dateStr, '-') && str_contains($dateStr, ':')) {
            return $dateStr;
        }

        // Try to parse with strtotime and return formatted
        $timestamp = strtotime($dateStr);
        if ($timestamp) {
            return date('Y-m-d H:i', $timestamp);
        }

        return $dateStr;
    }

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
        // Get raw inputs
        $rawScheduled = $request->input('scheduled_at');
        $rawExpires = $request->input('expires_at');

        // Normalize datetime-local format and handle various formats
        $normalizedScheduled = null;
        $normalizedExpires = null;

        if ($rawScheduled) {
            $normalizedScheduled = $this->normalizeDatetime($rawScheduled);
            // Merge normalized value back into request for validation
            $request->merge(['scheduled_at' => $normalizedScheduled]);
        }
        if ($rawExpires) {
            $normalizedExpires = $this->normalizeDatetime($rawExpires);
            // Merge normalized value back into request for validation
            $request->merge(['expires_at' => $normalizedExpires]);
        }

        // Base validation rules - now validates the normalized values
        $rules = [
            'title'        => ['required', 'string', 'max:255'],
            'content'      => ['required', 'string'],
            'category'     => ['required', 'string'],
            'is_pinned'    => ['boolean'],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d H:i'],
            'expires_at'   => ['nullable', 'date_format:Y-m-d H:i'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ];

        // If both dates provided, expires must be after scheduled
        if ($normalizedScheduled && $normalizedExpires) {
            $rules['expires_at'][] = 'after:scheduled_at';
        } elseif ($normalizedExpires) {
            $rules['expires_at'][] = 'after:now';
        }

        $validated = $request->validate($rules);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('announcements', 'public');
        }

        $scheduledAt = $validated['scheduled_at'] ?? null;
        $expiresAt = $validated['expires_at'] ?? null;

        $announcement = Announcement::create([
            'title'        => $validated['title'],
            'content'      => $validated['content'],
            'category'     => $validated['category'],
            'is_pinned'    => $validated['is_pinned'] ?? false,
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
        // Get raw inputs
        $rawScheduled = $request->input('scheduled_at');
        $rawExpires = $request->input('expires_at');

        // Normalize datetime-local format and handle various formats
        if ($rawScheduled) {
            $normalizedScheduled = $this->normalizeDatetime($rawScheduled);
            // Merge normalized value back into request for validation
            $request->merge(['scheduled_at' => $normalizedScheduled]);
        }
        if ($rawExpires) {
            $normalizedExpires = $this->normalizeDatetime($rawExpires);
            // Merge normalized value back into request for validation
            $request->merge(['expires_at' => $normalizedExpires]);
        }

        // Base validation rules - now validates the normalized values
        $rules = [
            'title'        => ['sometimes', 'string', 'max:255'],
            'content'      => ['sometimes', 'string'],
            'category'     => ['sometimes', 'string'],
            'is_pinned'    => ['sometimes', 'boolean'],
            'scheduled_at' => ['nullable', 'date_format:Y-m-d H:i'],
            'expires_at'   => ['nullable', 'date_format:Y-m-d H:i'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ];

        // Get normalized values
        $normalizedScheduled = $request->input('scheduled_at');
        $normalizedExpires = $request->input('expires_at');

        // If both dates provided, expires must be after scheduled
        if ($normalizedScheduled && $normalizedExpires) {
            $rules['expires_at'][] = 'after:scheduled_at';
        } elseif ($normalizedExpires) {
            $rules['expires_at'][] = 'after:now';
        }

        $data = $request->validate($rules);

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
        return response()->json(['message' => 'Announcement deleted successfully.'], 200);
    }
}
