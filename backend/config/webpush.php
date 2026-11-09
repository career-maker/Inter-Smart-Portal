<?php

/*
 * Web Push (VAPID). Generate the key pair once on the server with `php artisan webpush:keys`,
 * which writes VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY into .env. Push is simply skipped while they are empty.
 */
return [
    'public_key' => env('VAPID_PUBLIC_KEY'),
    'private_key' => env('VAPID_PRIVATE_KEY'),
    'subject' => env('VAPID_SUBJECT', 'mailto:hr@intersmart.in'),
];
