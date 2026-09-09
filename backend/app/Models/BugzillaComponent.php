<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BugzillaComponent extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_components';

    protected $fillable = [
        'bugzilla_project_id',
        'name',
        'description',
        'default_assignee_id',
        'status',
    ];

    public function bugzillaProject(): BelongsTo
    {
        return $this->belongsTo(BugzillaProject::class, 'bugzilla_project_id');
    }

    public function defaultAssignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_assignee_id');
    }

    public function bugs(): HasMany
    {
        return $this->hasMany(BugzillaBug::class, 'component_id');
    }
}
