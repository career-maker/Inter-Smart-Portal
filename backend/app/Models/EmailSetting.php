<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class EmailSetting extends Model
{
    use HasFactory;

    protected $table = 'email_settings';

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting by key, with default fallback.
     */
    public static function getByKey(string $key, mixed $default = null): mixed
    {
        try {
            if (!Schema::hasTable('email_settings')) {
                return $default;
            }
            $record = static::where('key', $key)->first();
            if (!$record || empty($record->value)) {
                return $default;
            }
            $decoded = json_decode($record->value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $record->value;
        } catch (\Throwable $e) {
            return $default;
        }
    }

    /**
     * Set / store a setting by key.
     */
    public static function setByKey(string $key, mixed $value): void
    {
        try {
            if (!Schema::hasTable('email_settings')) {
                return;
            }
            $valStr = is_string($value) ? $value : json_encode($value);
            static::updateOrInsert(
                ['key' => $key],
                ['value' => $valStr, 'updated_at' => now()]
            );
        } catch (\Throwable $e) {
            \Log::error("Failed to set EmailSetting for key '{$key}': " . $e->getMessage());
        }
    }

    /**
     * Default SMTP configuration
     */
    public static function defaultSmtp(): array
    {
        return [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'encryption' => 'tls',
            'username' => 'career@intersmart.in',
            'password' => '',
            'from_address' => 'career@intersmart.in',
            'from_name' => 'Inter Smart Portal',
        ];
    }

    /**
     * Default Global Routing Rules
     */
    public static function defaultRouting(): array
    {
        return [
            'leave_application' => [
                'name' => 'General Leave Application',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'leave_cl_short_notice' => [
                'name' => 'Casual Leave (Short Notice < X Days)',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'wfh_application' => [
                'name' => 'Work From Home (WFH) Request',
                'notify_tl' => true,
                'notify_admin' => true,
                'notify_hr' => true,
                'cc_applicant' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'recognition_award' => [
                'name' => 'Employee Awards & Recognitions',
                'notify_recipient' => true,
                'custom_to' => [],
                'custom_cc' => ['hr@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'ta_claim' => [
                'name' => 'Travel Allowance (TA) Claim Submissions',
                'notify_admin' => true,
                'custom_to' => ['HR@intersmart.in', 'Ameesha@intersmart.in'],
                'custom_cc' => ['admin@intersmart.in'],
                'enabled' => true,
            ],
            'ta_approved' => [
                'name' => 'Travel Allowance (TA) Approval & Receipt',
                'notify_recipient' => true,
                'custom_to' => [],
                'custom_cc' => ['HR@intersmart.in', 'admin@intersmart.in'],
                'enabled' => true,
            ],
            'document_request' => [
                'name' => 'HR Document & Policy Requests',
                'notify_admin' => true,
                'custom_to' => ['HR@intersmart.in'],
                'custom_cc' => ['admin@intersmart.in'],
                'enabled' => true,
            ],
        ];
    }
}
