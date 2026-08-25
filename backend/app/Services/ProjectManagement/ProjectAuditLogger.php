<?php

namespace App\Services\ProjectManagement;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Writes PM mutation events into the EXISTING, generic `audit_logs`
 * table — no new table (see PROJECT_MANAGEMENT_MODULE_DESIGN.md §12).
 * That table was schema-appropriate (user_id, action, model_type,
 * model_id, changes json, ip_address) but unwritten-to by any existing
 * controller; this is a pure-additive reuse, `pm.` action-namespaced so
 * PM rows are always distinguishable/filterable from anything HR might
 * write there in the future.
 */
class ProjectAuditLogger
{
    /**
     * @param  User  $actor
     * @param  string  $action  e.g. 'pm.project.created', 'pm.task.status_changed'
     * @param  Model  $model    the PM model the action happened to
     * @param  array<string,mixed>  $previous
     * @param  array<string,mixed>  $new
     */
    public function log(User $actor, string $action, Model $model, array $previous, array $new, ?Request $request = null): void
    {
        try {
            AuditLog::create([
                'user_id' => $actor->id,
                'action' => $action,
                'model_type' => class_basename($model),
                'model_id' => $model->getKey(),
                // The existing AuditLog model has no cast for `changes` (it
                // was never written to by any existing HR code, so this was
                // never exercised) — encoding here avoids needing to add one
                // to an existing HR model file for an "array to string"
                // failure that would otherwise occur on save().
                'changes' => json_encode([
                    'previous' => $previous,
                    'new' => $new,
                ]),
                'ip_address' => $request?->ip(),
            ]);
        } catch (\Throwable $e) {
            // Audit logging must never block the underlying PM mutation —
            // matches the existing codebase's unbroken isolated-failure
            // convention for notifications/email throughout every module.
            \Log::warning('PM audit log write failed: ' . $e->getMessage(), [
                'action' => $action,
                'model_type' => class_basename($model),
                'model_id' => $model->getKey(),
            ]);
        }
    }
}
