<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TARequest extends Model
{
    use SoftDeletes;

    protected $table = 'ta_requests';

    protected $fillable = [
        'user_id',
        'reason',
        'date_travelled',
        'total_amount',
        'approved_amount',
        'bill_link',
        'status',
        'approver_id',
        'approval_notes',
        'receipt_number',
        'payment_receipt_link',
        'payment_mode',
        'is_paid',
        'paid_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_travelled' => 'date',
        'total_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'is_paid' => 'boolean',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TARequestItem::class, 'ta_request_id');
    }
}
