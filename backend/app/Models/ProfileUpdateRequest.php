<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProfileUpdateRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'requested_data',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'requested_data' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
