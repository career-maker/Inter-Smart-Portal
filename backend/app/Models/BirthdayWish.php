<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirthdayWish extends Model
{
    protected $table = 'birthday_wishes';
    protected $guarded = [];
    protected $fillable = ['birthday_user_id', 'sender_id', 'message'];
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
