<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PmTeamAddon extends Model
{
    use HasFactory;

    protected $table = 'pm_team_addons';

    protected $fillable = [
        'addon_id',
        'team_id',
    ];

    public function addon(): BelongsTo
    {
        return $this->belongsTo(PmAddon::class, 'addon_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }
}
