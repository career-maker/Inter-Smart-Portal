<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$tls = User::where('role', 'Team Lead')->orWhere('is_team_lead', 1)->get();
echo "Total Team Leads: " . $tls->count() . "\n";
foreach ($tls as $tl) {
    echo "ID: {$tl->id}, Name: {$tl->first_name} {$tl->last_name}, Email: {$tl->email}, Role: {$tl->role}, Designation: {$tl->designation}\n";
}
