<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'supabase' => [
        'url'            => env('SUPABASE_URL'),           // e.g. https://xyz.supabase.co
        'service_key'    => env('SUPABASE_SERVICE_KEY'),   // service_role secret key
        'storage_bucket' => env('SUPABASE_STORAGE_BUCKET', 'intersmart-portal'),
    ],

    'biometric' => [
        'agent_secret_hash' => env('BIOMETRIC_AGENT_SECRET_HASH'),
        'agent_secret' => env('BIOMETRIC_AGENT_SECRET'),
    ],

    'scheduler_secret' => env('SCHEDULER_SECRET'),

    'hubstaff' => [
        'refresh_token' => env('HUBSTAFF_REFRESH_TOKEN'),
        'personal_token' => env('HUBSTAFF_PERSONAL_TOKEN'),
        'access_token' => env('HUBSTAFF_ACCESS_TOKEN'),
        'org_id' => env('HUBSTAFF_ORG_ID', 546910),
        'base_url' => env('HUBSTAFF_BASE_URL', 'https://api.hubstaff.com/v2'),
        'auth_url' => env('HUBSTAFF_AUTH_URL', 'https://account.hubstaff.com/access_tokens'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    ],

];
