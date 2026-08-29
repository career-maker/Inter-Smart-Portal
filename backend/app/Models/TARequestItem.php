<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TARequestItem extends Model
{
    protected $table = 'ta_request_items';

    protected $fillable = [
        'ta_request_id',
        'category',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function taRequest(): BelongsTo
    {
        return $this->belongsTo(TARequest::class);
    }
}
