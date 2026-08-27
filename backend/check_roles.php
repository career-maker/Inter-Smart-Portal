<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== ALL ROLES ===" . PHP_EOL;
foreach (\Spatie\Permission\Models\Role::all() as $r) {
    echo "Role ID " . $r->id . ": " . $r->name . PHP_EOL;
}

echo PHP_EOL . "=== TEAMS ===" . PHP_EOL;
foreach (\App\Models\Team::all() as $t) {
    echo "Team #" . $t->id . " Name: " . $t->name . " Lead ID: " . ($t->team_lead_id ?? 'NULL') . PHP_EOL;
}

echo PHP_EOL . "=== USERS WITH ROLES & TEAMS ===" . PHP_EOL;
foreach (\App\Models\User::with('roles', 'team')->get() as $u) {
    $roles = $u->roles->pluck('name')->implode(', ');
    echo "User #" . $u->id . ": " . $u->first_name . " " . $u->last_name . " (" . $u->email . ") | Roles: [" . $roles . "] | Team: #" . ($u->team_id ?? 'NULL') . " (" . ($u->team->name ?? 'None') . ")" . PHP_EOL;
}
