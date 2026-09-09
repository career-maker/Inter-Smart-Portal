<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BugzillaProject extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_projects';

    protected $fillable = [
        'portal_project_id',
        'name',
        'description',
        'status',
        'default_assignee_id',
        'created_by',
    ];

    public function portalProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'portal_project_id');
    }

    public function defaultAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_assignee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function components(): HasMany
    {
        return $this->hasMany(BugzillaComponent::class, 'bugzilla_project_id');
    }

    public function bugs(): HasMany
    {
        return $this->hasMany(BugzillaBug::class, 'bugzilla_project_id');
    }
}
