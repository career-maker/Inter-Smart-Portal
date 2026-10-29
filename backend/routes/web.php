<?php

use Illuminate\Support\Facades\Route;

Route::get('/', [\App\Http\Controllers\Api\MaintenanceController::class, 'notFound']);

Route::get('/ping', [\App\Http\Controllers\Api\MaintenanceController::class, 'webPing']);

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

// Private uploads. Apache hands every /api/storage/* request except the public media folders to Laravel
// (see public/.htaccess), so the login check in showStorageFile applies to old links too. The shared
// `token` cookie is read raw, so cookie encryption must be off for these routes.
Route::withoutMiddleware([
    \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Session\Middleware\StartSession::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\View\Middleware\ShareErrorsFromSession::class,
])->group(function () {
    Route::get('storage/{path}', [\App\Http\Controllers\Api\EmployeeController::class, 'showStorageFile'])->where('path', '.*');
});

// Fallback for all unmatched web requests
Route::fallback([\App\Http\Controllers\Api\MaintenanceController::class, 'notFound']);
