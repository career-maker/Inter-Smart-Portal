<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StickyNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class StickyNoteController extends Controller
{
    /**
     * Ensure the sticky_notes table exists before operating.
     */
    protected function ensureTableExists(): void
    {
        try {
            if (!Schema::hasTable('sticky_notes')) {
                Schema::create('sticky_notes', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('user_id');
                    $table->string('title')->nullable();
                    $table->longText('content')->nullable();
                    $table->string('color', 30)->default('amber');
                    $table->boolean('is_pinned')->default(false);
                    $table->integer('order_index')->default(0);
                    $table->timestamps();

                    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                    $table->index(['user_id', 'is_pinned']);
                });
            }
        } catch (\Throwable $e) {
            \Log::warning('Could not auto-create sticky_notes table: ' . $e->getMessage());
        }
    }

    /**
     * Get all sticky notes for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $this->ensureTableExists();

        if (!Schema::hasTable('sticky_notes')) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $userId = Auth::id();

        $notes = StickyNote::where('user_id', $userId)
            ->orderBy('is_pinned', 'desc')
            ->orderBy('order_index', 'asc')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notes,
        ]);
    }

    /**
     * Create a new sticky note.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureTableExists();

        $validated = $request->validate([
            'title' => 'nullable|string|max:190',
            'content' => 'nullable|string',
            'color' => 'nullable|string|max:30',
            'is_pinned' => 'nullable|boolean',
        ]);

        $userId = Auth::id();

        $note = StickyNote::create([
            'user_id' => $userId,
            'title' => $validated['title'] ?? 'Untitled Note',
            'content' => $validated['content'] ?? '',
            'color' => $validated['color'] ?? 'amber',
            'is_pinned' => $validated['is_pinned'] ?? false,
            'order_index' => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sticky note created successfully.',
            'data' => $note,
        ], 201);
    }

    /**
     * Update an existing sticky note.
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        $this->ensureTableExists();

        $userId = Auth::id();
        $note = StickyNote::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$note) {
            return response()->json([
                'success' => false,
                'message' => 'Sticky note not found or unauthorized.',
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:190',
            'content' => 'nullable|string',
            'color' => 'nullable|string|max:30',
            'is_pinned' => 'nullable|boolean',
            'order_index' => 'nullable|integer',
        ]);

        $note->update(array_filter($validated, fn($val) => $val !== null));

        return response()->json([
            'success' => true,
            'message' => 'Sticky note updated successfully.',
            'data' => $note->fresh(),
        ]);
    }

    /**
     * Delete a sticky note.
     */
    public function destroy(int|string $id): JsonResponse
    {
        $this->ensureTableExists();

        $userId = Auth::id();
        $note = StickyNote::where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$note) {
            return response()->json([
                'success' => false,
                'message' => 'Sticky note not found or unauthorized.',
            ], 404);
        }

        $note->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sticky note deleted successfully.',
        ]);
    }

    /**
     * Clear all sticky notes for the current user.
     */
    public function clear(): JsonResponse
    {
        $this->ensureTableExists();

        $userId = Auth::id();
        StickyNote::where('user_id', $userId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'All sticky notes cleared successfully.',
        ]);
    }
}
