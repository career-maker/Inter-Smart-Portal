<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{

    /**
     * List all announcements. Pinned announcements appear first.
     */
    public function index(Request $request)
    {
        $announcements = Announcement::query()
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
        $validated = $request->validate([
            'title'     => ['required', 'string', 'max:255'],
            'content'   => ['required', 'string'],
            'category'  => ['required', 'string'],
            'is_pinned' => ['boolean'],
            'image'     => ['nullable', 'image', 'max:5120'],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('announcements', 'public');
        }

        $announcement = Announcement::create([
            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'category'   => $validated['category'],
            'is_pinned'  => $validated['is_pinned'] ?? false,
            'image_path' => $imagePath,
            'created_by' => $request->user()->id,
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
            'title'     => ['sometimes', 'string', 'max:255'],
            'content'   => ['sometimes', 'string'],
            'category'  => ['sometimes', 'string'],
            'is_pinned' => ['sometimes', 'boolean'],
            'image'     => ['nullable', 'image', 'max:5120'],
        ]);

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
