<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementCategory;
use Illuminate\Http\Request;

class AnnouncementCategoryController extends Controller
{
    public function index()
    {
        $categories = AnnouncementCategory::orderBy('name')->get();
        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('Super Admin') && !$user->hasRole('HR')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255|unique:announcement_categories,name',
        ]);

        // Generate a random style for the new category or fallback
        $styles = [
            ['badge' => 'bg-indigo-100 text-indigo-700 border-indigo-200', 'card' => 'border-l-indigo-400'],
            ['badge' => 'bg-orange-100 text-orange-700 border-orange-200', 'card' => 'border-l-orange-400'],
            ['badge' => 'bg-lime-100 text-lime-700 border-lime-200', 'card' => 'border-l-lime-400'],
            ['badge' => 'bg-cyan-100 text-cyan-700 border-cyan-200', 'card' => 'border-l-cyan-400'],
            ['badge' => 'bg-rose-100 text-rose-700 border-rose-200', 'card' => 'border-l-rose-400'],
        ];
        $randomStyle = $styles[array_rand($styles)];

        $category = AnnouncementCategory::create([
            'name' => $request->name,
            'badge_style' => $randomStyle['badge'],
            'card_style' => $randomStyle['card'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }
}
