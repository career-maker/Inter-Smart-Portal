<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Feature;

/** Tells the frontend which optional modules are switched on, so menus hide switched-off modules. */
class FeatureController extends Controller
{
    private const MODULES = ['accounts'];

    public function index()
    {
        return response()->json(collect(self::MODULES)->mapWithKeys(fn ($m) => [$m => Feature::enabled($m)]));
    }
}
