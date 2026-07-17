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

    protected $guard_name = 'web';

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

    public function favorites() {
        return $this->hasMany(UserFavorite::class);
    }

    public function probationEndDate(): ?string
    {
        if ($this->probation_end_date) {
            return $this->probation_end_date;
        }
        if ($this->joining_date) {
            return \Carbon\Carbon::parse($this->joining_date)->addMonths(6)->toDateString();
        }
        return null;
    }

    public function isInProbation(): bool
    {
        $end = $this->probationEndDate();
        if (!$end) return false;
        return \Carbon\Carbon::parse($end)->isFuture();
    }

    public function profilePhotoUrl(): ?string
    {
        if (!$this->profile_photo_path) return null;

        $path = str_replace('\\', '/', $this->profile_photo_path);

        // If already a full URL (e.g. Google Drive public link), return as-is
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $supabaseUrl = config('services.supabase.url');
        $bucket      = config('services.supabase.storage_bucket');

        if ($supabaseUrl && $bucket) {
            return "{$supabaseUrl}/storage/v1/object/public/{$bucket}/{$path}";
        }

        // Local dev fallback — served via /api/photos/ route
        return rtrim(config('app.url'), '/') . '/api/photos/' . $path;
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
