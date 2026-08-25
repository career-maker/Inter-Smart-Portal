<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * pm_checklist_items — the reusable, named checklist definitions.
 * Finalized 2-table checklist model (Decision 5): flat items, no
 * sections/sub-items. `category` is a display-grouping label only.
 */
class ProjectChecklistItem extends Model
{
    protected $table = 'pm_checklist_items';

    public const APPLIES_TO = ['project', 'task'];

    protected $fillable = [
        'label',
        'description',
        'applies_to',
        'category',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ProjectChecklistAssignment::class, 'checklist_item_id');
    }
}
