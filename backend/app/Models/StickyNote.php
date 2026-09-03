<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StickyNote extends Model
{
    use HasFactory;

    protected $table = 'sticky_notes';

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'color',
        'is_pinned',
        'order_index',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'order_index' => 'integer',
        'user_id' => 'integer',
    ];

    /**
     * The user who owns this sticky note.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
