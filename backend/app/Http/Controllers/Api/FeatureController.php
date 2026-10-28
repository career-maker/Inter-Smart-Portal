<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Access;
use App\Support\Feature;
use App\Support\WorkAccess;
use Illuminate\Http\Request;

/**
 * Which optional modules are on AND usable by the signed-in person, so menus only show
 * what that person can open.
 */
class FeatureController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'accounts' => Feature::enabled('accounts') && Access::accounts($request->user()),
            'sales' => Feature::enabled('sales') && Access::sales($request->user()),
            'pmo' => Feature::enabled('pmo') && Access::pmo($request->user()),
            'appreciation' => Feature::enabled('appreciation') && $request->user() && (Access::appreciationNominator($request->user()) || Access::appreciationApprover($request->user())),
            'customer_feedback' => Feature::enabled('customer_feedback') && $request->user() && (Access::hr($request->user()) || Access::pmoManager($request->user())),
            'meetings' => Feature::enabled('meetings') && $request->user() !== null,
            'workflow' => Feature::enabled('workflow') && ($request->user() ? WorkAccess::hasAnyWork($request->user()) : false),
        ]);
    }
}
