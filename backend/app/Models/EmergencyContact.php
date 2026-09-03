<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmergencyContact extends Model
{
    use HasFactory;

    protected $table = 'emergency_contacts';

    protected $fillable = [
        'name',
        'role',
        'email',
        'phone',
        'department',
        'avatar_bg',
        'initials',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order'     => 'integer',
    ];

    /**
     * Get computed initials if initials column is empty.
     */
    public function getEffectiveInitialsAttribute(): string
    {
        if (!empty($this->initials)) {
            return strtoupper($this->initials);
        }

        $parts = preg_split('/[\s,]+/', trim($this->name));
        if (count($parts) >= 2) {
            return strtoupper(substr($parts[0], 0, 1) . substr($parts[1], 0, 1));
        }

        return strtoupper(substr($this->name, 0, 2)) ?: 'EC';
    }
}
