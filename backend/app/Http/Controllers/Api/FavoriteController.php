<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserFavorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FavoriteController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $favorites = $user->favorites()
            ->orderByDesc('created_at')
            ->get(['page_href', 'page_label', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $favorites,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_href' => 'required|string|max:255',
            'page_label' => 'required|string|max:255',
        ]);

        $user = Auth::user();

        // Check if already exists
        $existing = $user->favorites()
            ->where('page_href', $validated['page_href'])
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'This page is already in favorites',
            ], 409);
        }

        // Create new favorite
        $favorite = $user->favorites()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $favorite,
        ], 201);
    }

    public function destroy(string $pageHref): JsonResponse
    {
        $user = Auth::user();

        $deleted = $user->favorites()
            ->where('page_href', $pageHref)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Favorite removed',
        ]);
    }

    public function check(string $pageHref): JsonResponse
    {
        $user = Auth::user();

        $isFavorited = $user->favorites()
            ->where('page_href', $pageHref)
            ->exists();

        return response()->json([
            'success' => true,
            'is_favorited' => $isFavorited,
        ]);
    }
}
