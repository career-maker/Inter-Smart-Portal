<?php
// Clean local test data: one user per role, all with the same test password. LOCAL DATABASE ONLY.
use App\Models\Team;
use App\Models\User;
use App\Support\Feature;
use Spatie\Permission\Models\Role;

foreach (['Super Admin', 'Employee', 'Team Lead'] as $r) {
    Role::firstOrCreate(['name' => $r]);
}
$sales = Team::create(['name' => 'Sales', 'code' => 'SALE-1']);
$acc = Team::create(['name' => 'Accounts', 'code' => 'ACCO-1']);
$pmo = Team::create(['name' => 'PMO 1', 'code' => 'PMO-1']);
Team::create(['name' => 'Design', 'code' => 'DESI-1']);
Team::create(['name' => 'HTML', 'code' => 'HTML-1']);
$hr = Team::create(['name' => 'HR', 'code' => 'HR-1']);
$html = Team::where('name', 'HTML')->first();
$design = Team::where('name', 'Design')->first();

$mk = function ($first, $email, $teamId, $role, $code) {
    $u = User::create(['first_name' => $first, 'last_name' => 'Test', 'email' => $email, 'password' => bcrypt('Test@12345'),
        'status' => 'Active', 'employee_code' => $code, 'team_id' => $teamId, 'joining_date' => '2024-01-01']);
    $u->assignRole($role);

    return $u;
};
$admin = $mk('Admin', 'admin@test.local', null, 'Super Admin', 'E1');
$ann = $mk('Ann', 'ann@test.local', $sales->id, 'Employee', 'E2');
$ameesha = $mk('Ameesha', 'ameesha@test.local', $acc->id, 'Employee', 'E3');
$pm = $mk('Priya', 'pm@test.local', $pmo->id, 'Employee', 'E4');
$pc = $mk('Meera', 'pc@test.local', $pmo->id, 'Employee', 'E5');
$mk('Hari', 'emp@test.local', $html->id, 'Employee', 'E6');
$uilead = $mk('Uma', 'uilead@test.local', $design->id, 'Employee', 'E7');
$mk('Dina', 'designer@test.local', $design->id, 'Employee', 'E8');
$design->update(['team_lead_id' => $uilead->id]);
$htmllead = $mk('Hema', 'htmllead@test.local', $html->id, 'Employee', 'E9');
$html->update(['team_lead_id' => $htmllead->id]);
$mk('Hana', 'hr@test.local', $hr->id, 'Employee', 'E10');
$sales->update(['team_lead_id' => $ann->id]);
$pmo->update(['team_lead_id' => $pm->id]);

foreach (['accounts', 'sales', 'pmo', 'workflow', 'appreciation', 'meetings', 'customer_feedback', 'hr_performance'] as $f) {
    Feature::set($f, true);
}
echo "seeded " . User::count() . " users, " . Team::count() . " teams\n";
