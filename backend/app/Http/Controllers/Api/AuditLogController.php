<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc');

        if ($request->has('action')) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $logs = $query->paginate(50);
        return response()->json($logs);
    }
}
