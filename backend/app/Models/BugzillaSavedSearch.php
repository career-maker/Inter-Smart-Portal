<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugzillaSavedSearch extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_saved_searches';

    protected $fillable = [
        'user_id',
        'name',
        'criteria',
        'is_shared',
    ];

    protected $casts = [
        'criteria' => 'array',
        'is_shared' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
