<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    protected $guarded = [];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($team) {
            if (!$team->code) {
                $base = strtoupper(preg_replace('/[^A-Za-z]/', '', $team->name));
                $base = substr($base, 0, 4);
                do {
                    $code = $base . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                } while (static::where('code', $code)->exists());
                $team->code = $code;
            }
        });
    }

    public function teamLead() {
        return $this->belongsTo(User::class, 'team_lead_id');
    }

    public function members() {
        return $this->hasMany(User::class);
    }
}
