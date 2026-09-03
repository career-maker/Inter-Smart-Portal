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

    public function employeeLeavePolicy() {
        return $this->hasOne(EmployeeLeavePolicy::class);
    }

    public function leaveLedgers() {
        return $this->hasMany(LeaveAllocationLedger::class);
    }

    public function probationEndDate(): ?string
    {
        // If probation was manually cleared through admin action/leave addition, employee is not in probation
        if ($this->employeeLeavePolicy?->probation_cleared_manually || $this->leaveBalance?->probation_cleared_manually) {
            return null;
        }

        if ($this->probation_end_date) {
            return $this->probation_end_date;
        }

        if ($this->joining_date) {
            $months = $this->employeeLeavePolicy?->custom_probation_months 
                ?? LeavePolicySetting::current()->probation_period_months 
                ?? 6;
            return \Carbon\Carbon::parse($this->joining_date)->addMonths($months)->toDateString();
        }

        return null;
    }

    public function isInProbation(): bool
    {
        if ($this->employeeLeavePolicy?->probation_cleared_manually || $this->leaveBalance?->probation_cleared_manually) {
            return false;
        }

        $end = $this->probationEndDate();
        if (!$end) return false;

        // If today is on or before the probation end date, employee is in probation.
        // Employee becomes eligible starting the NEXT day after probation completion.
        $endDate = \Carbon\Carbon::parse($end)->endOfDay();
        return \Carbon\Carbon::now('Asia/Kolkata')->lte($endDate);
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

    public function primaryRoleName(): string
    {
        $roleNames = $this->roles ? $this->roles->pluck('name')->toArray() : [];
        if (in_array('Super Admin', $roleNames)) return 'Super Admin';
        if (in_array('HR', $roleNames)) return 'HR';
        if (in_array('Team Lead', $roleNames) || \App\Models\Team::where('team_lead_id', $this->id)->exists()) return 'Team Lead';
        if (in_array('QA Lead', $roleNames)) return 'QA Lead';
        if (in_array('QA', $roleNames)) return 'QA';
        return !empty($roleNames) ? $roleNames[0] : 'Employee';
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
