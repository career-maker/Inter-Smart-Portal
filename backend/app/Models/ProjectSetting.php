<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_settings — PM's own key-value config store, deliberately separate
 * from the existing generic `system_settings` table (see design doc §5).
 */
class ProjectSetting extends Model
{
    protected $table = 'pm_settings';

    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
