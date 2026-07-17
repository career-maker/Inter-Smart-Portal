<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFavorite extends Model
{
    protected $fillable = ['user_id', 'page_href', 'page_label'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
