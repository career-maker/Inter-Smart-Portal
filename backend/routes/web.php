<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->view('errors.404', [], 404);
});

Route::get('/ping', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});

// Biometric Agent Integration - supports direct cPanel access where /api/ alias strips the prefix
Route::withoutMiddleware([
    \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    \Illuminate\Session\Middleware\StartSession::class,
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\View\Middleware\ShareErrorsFromSession::class,
])->group(function () {
    Route::post('/v1/biometric/ingest', [\App\Http\Controllers\Api\BiometricIngestionController::class, 'ingest'])
        ->middleware(\App\Http\Middleware\VerifyBiometricAgent::class);

    Route::post('/api/v1/biometric/ingest', [\App\Http\Controllers\Api\BiometricIngestionController::class, 'ingest'])
        ->middleware(\App\Http\Middleware\VerifyBiometricAgent::class);
});

// Customization Asset delivery routes (support direct /uploads, /api/uploads, and /api/api/uploads delivery)
Route::get('uploads/customization/{filename}', [\App\Http\Controllers\Api\CustomizationController::class, 'showAsset']);
Route::get('api/uploads/customization/{filename}', [\App\Http\Controllers\Api\CustomizationController::class, 'showAsset']);
Route::get('api/api/uploads/customization/{filename}', [\App\Http\Controllers\Api\CustomizationController::class, 'showAsset']);

// Fallback for all unmatched web requests
Route::fallback(function () {
    if (request()->expectsJson()) {
        return response()->json(['message' => 'Not Found'], 404);
    }
    return response()->view('errors.404', [], 404);
});

