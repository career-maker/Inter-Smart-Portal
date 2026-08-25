<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Predefined Task Catalog — pm_task_catalogs.
 *
 * Managed exclusively by Super Admin / HR.
 * Consumed by Team Leads and Employees during task creation.
 */
class ProjectTaskCatalog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pm_task_catalogs';

    protected $fillable = [
        'name',
        'category',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'catalog_task_id');
    }
}
