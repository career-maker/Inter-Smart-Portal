<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles, HasApiTokens;

    protected $guarded = [];

    public function team() {
        return $this->belongsTo(Team::class);
    }
    
    public function leaveBalances() {
        return $this->hasOne(LeaveBalance::class);
    }
    
    // Alias for eager-loading in admin contexts
    public function leaveBalance() {
        return $this->hasOne(LeaveBalance::class);
    }
    
    public function leaveRequests() {
        return $this->hasMany(LeaveRequest::class);
    }
    
    public function wfhRequests() {
        return $this->hasMany(WfhRequest::class);
    }
    



    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
