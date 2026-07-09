<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthdayWish extends Model
{
    protected $guarded = [];
    protected $casts = [
        'wished_at' => 'datetime',
    ];

    public function birthdayUser()
    {
        return $this->belongsTo(User::class, 'birthday_user_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
