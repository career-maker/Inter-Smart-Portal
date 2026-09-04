<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/ping', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});

// Biometric Agent Integration - supports direct cPanel access where /api/ alias strips the prefix
Route::post('/v1/biometric/ingest', [\App\Http\Controllers\Api\BiometricIngestionController::class, 'ingest'])
    ->middleware(\App\Http\Middleware\VerifyBiometricAgent::class);

Route::post('/api/v1/biometric/ingest', [\App\Http\Controllers\Api\BiometricIngestionController::class, 'ingest'])
    ->middleware(\App\Http\Middleware\VerifyBiometricAgent::class);
