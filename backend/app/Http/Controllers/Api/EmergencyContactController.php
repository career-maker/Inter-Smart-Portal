<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use App\Models\PmAddon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class EmergencyContactController extends Controller
{
    private function isSuperAdmin($user): bool
    {
        if (!$user) return false;
        if (method_exists($user, 'hasRole') && ($user->hasRole('Super Admin') || $user->hasRole('Admin'))) return true;
        $roleStr = strtolower($user->role ?? '');
        return str_contains($roleStr, 'super admin') || $roleStr === 'admin';
    }

    /**
     * Self-healing: ensure users column exists and clear old dummy records
     */
    private function ensureTableAndDefaults(): void
    {
        try {
            if (Schema::hasTable('users') && !Schema::hasColumn('users', 'is_emergency_contact')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->boolean('is_emergency_contact')->default(false)->after('status')->index();
                });
            }

            if (Schema::hasTable('emergency_contacts')) {
                // Clear old hardcoded dummy contacts so no obsolete names remain
                DB::table('emergency_contacts')
                    ->whereIn('email', ['hr@intersmart.in', 'manu@intersmart.in', 'vishal@intersmart.in'])
                    ->orWhere('name', 'like', '%Sahad%')
                    ->orWhere('name', 'like', '%Manu%')
                    ->orWhere('name', 'like', '%Vishal%')
                    ->orWhere('name', 'like', '%Aswathi%')
                    ->delete();
            }

            if (Schema::hasTable('pm_addons')) {
                DB::table('pm_addons')->where('key', 'emergency_contacts')->delete();
            }
        } catch (\Throwable $e) {
            \Log::warning('EmergencyContact schema check error: ' . $e->getMessage());
        }
    }

    /**
     * GET /api/emergency-contacts
     * Public / Authenticated endpoint: Returns active contacts for user dashboard
     */
    public function index(Request $request)
    {
        $this->ensureTableAndDefaults();

        try {
            $contacts = \App\Models\User::where('is_emergency_contact', true)
                ->where('status', 'Active')
                ->with('team')
                ->orderBy('first_name', 'asc')
                ->get()
                ->map(function ($u) {
                    $fullName = trim("{$u->first_name} {$u->last_name}") ?: $u->name;
                    $firstChar = mb_substr($u->first_name ?: $fullName, 0, 1);
                    $lastChar = mb_substr($u->last_name ?: '', 0, 1);
                    $initials = strtoupper($firstChar . ($lastChar ?: mb_substr($fullName, 1, 1)));

                    $colors = ['bg-[#56348f]', 'bg-indigo-600', 'bg-sky-600', 'bg-rose-500', 'bg-emerald-600', 'bg-amber-600', 'bg-teal-600'];
                    $avatarBg = $colors[$u->id % count($colors)];

                    return [
                        'id'         => $u->id,
                        'name'       => $fullName,
                        'role'       => $u->designation ?: 'Emergency Contact',
                        'email'      => $u->email,
                        'phone'      => $u->contact_number ?: $u->alternate_contact_number,
                        'department' => $u->team?->name ?: 'General',
                        'avatar_bg'  => $avatarBg,
                        'initials'   => $initials,
                        'order'      => $u->id,
                    ];
                });

            return response()->json([
                'status'   => 'success',
                'contacts' => $contacts,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Failed to fetch emergency contacts: ' . $e->getMessage());
            return response()->json([
                'status'   => 'error',
                'message'  => 'Could not fetch emergency contacts',
                'contacts' => [],
            ], 500);
        }
    }

    /**
     * GET /api/admin/emergency-contacts
     * Super Admin endpoint: Returns all contacts (active and inactive) with stats
     */
    public function adminIndex(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $this->ensureTableAndDefaults();

        $query = EmergencyContact::query();

        // Optional search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%");
            });
        }

        // Optional department filter
        if ($dept = $request->input('department')) {
            $query->where('department', $dept);
        }

        // Optional status filter
        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $contacts = $query->orderBy('order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($c) {
                return [
                    'id'         => $c->id,
                    'name'       => $c->name,
                    'role'       => $c->role,
                    'email'      => $c->email,
                    'phone'      => $c->phone,
                    'department' => $c->department,
                    'avatar_bg'  => $c->avatar_bg ?: 'bg-indigo-500',
                    'initials'   => $c->effective_initials,
                    'order'      => $c->order,
                    'is_active'  => $c->is_active,
                    'created_at' => $c->created_at?->toIso8601String(),
                    'updated_at' => $c->updated_at?->toIso8601String(),
                ];
            });

        $totalCount    = EmergencyContact::count();
        $activeCount   = EmergencyContact::where('is_active', true)->count();
        $inactiveCount = $totalCount - $activeCount;
        $departments   = EmergencyContact::whereNotNull('department')->where('department', '!=', '')->distinct()->pluck('department')->values();

        return response()->json([
            'status'   => 'success',
            'contacts' => $contacts,
            'stats'    => [
                'total'        => $totalCount,
                'active'       => $activeCount,
                'inactive'     => $inactiveCount,
                'departments'  => $departments,
            ],
        ]);
    }

    /**
     * POST /api/admin/emergency-contacts
     * Super Admin endpoint: Create a new emergency contact
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $this->ensureTableAndDefaults();

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'role'        => 'required|string|max:255',
            'email'       => 'nullable|email|max:255',
            'phone'       => 'nullable|string|max:50',
            'department'  => 'nullable|string|max:100',
            'avatar_bg'   => 'nullable|string|max:50',
            'initials'    => 'nullable|string|max:10',
            'order'       => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);

        // If order not explicitly provided, place at the end
        if (!isset($validated['order']) || $validated['order'] === null) {
            $maxOrder = EmergencyContact::max('order') ?? 0;
            $validated['order'] = $maxOrder + 1;
        }

        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $contact = EmergencyContact::create($validated);

        return response()->json([
            'status'  => 'success',
            'message' => "Emergency contact '{$contact->name}' created successfully.",
            'contact' => array_merge($contact->toArray(), ['initials' => $contact->effective_initials]),
        ], 201);
    }

    /**
     * PUT /api/admin/emergency-contacts/{id}
     * Super Admin endpoint: Update an existing emergency contact
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $contact = EmergencyContact::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'role'        => 'required|string|max:255',
            'email'       => 'nullable|email|max:255',
            'phone'       => 'nullable|string|max:50',
            'department'  => 'nullable|string|max:100',
            'avatar_bg'   => 'nullable|string|max:50',
            'initials'    => 'nullable|string|max:10',
            'order'       => 'nullable|integer|min:0',
            'is_active'   => 'nullable|boolean',
        ]);

        $contact->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => "Emergency contact '{$contact->name}' updated successfully.",
            'contact' => array_merge($contact->fresh()->toArray(), ['initials' => $contact->effective_initials]),
        ]);
    }

    /**
     * DELETE /api/admin/emergency-contacts/{id}
     * Super Admin endpoint: Delete/Unassign an emergency contact
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $userObj = \App\Models\User::find($id);
        if ($userObj) {
            $userObj->is_emergency_contact = false;
            $userObj->save();
        }

        $contact = EmergencyContact::find($id);
        $name = $contact?->name ?? $userObj?->name ?? 'Employee';
        if ($contact) {
            $contact->delete();
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Emergency contact '{$name}' unassigned successfully.",
        ]);
    }

    /**
     * PATCH /api/admin/emergency-contacts/{id}/toggle
     * Super Admin endpoint: Quick toggle active status
     */
    public function toggle(Request $request, int $id)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $userObj = \App\Models\User::find($id);
        if ($userObj) {
            $userObj->is_emergency_contact = !$userObj->is_emergency_contact;
            $userObj->save();
            $statusStr = $userObj->is_emergency_contact ? 'assigned as emergency contact' : 'unassigned';
            return response()->json([
                'status'    => 'success',
                'message'   => "Employee '{$userObj->name}' {$statusStr}.",
                'is_active' => (bool)$userObj->is_emergency_contact,
            ]);
        }

        $contact = EmergencyContact::findOrFail($id);
        $contact->is_active = !$contact->is_active;
        $contact->save();

        $statusStr = $contact->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'status'    => 'success',
            'message'   => "Contact '{$contact->name}' {$statusStr}.",
            'is_active' => $contact->is_active,
        ]);
    }

    /**
     * POST /api/admin/emergency-contacts/reorder
     * Super Admin endpoint: Bulk update display order
     */
    public function reorder(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $request->validate([
            'items'         => 'required|array',
            'items.*.id'    => 'required|integer|exists:emergency_contacts,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->input('items') as $item) {
                EmergencyContact::where('id', $item['id'])->update(['order' => $item['order']]);
            }
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Emergency contacts reordered successfully.',
        ]);
    }

    /**
     * POST /api/admin/emergency-contacts/sync-team-leads
     * Super Admin endpoint: Automatically scans active Team Leads and key staff from users table
     * and syncs them into the emergency_contacts table with their names, roles, emails, and phone numbers.
     */
    public function syncTeamLeads(Request $request)
    {
        $user = $request->user();
        if (!$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized: Super Admin access required.'], 403);
        }

        $this->ensureTableAndDefaults();

        $colors = ['bg-indigo-500', 'bg-sky-500', 'bg-teal-500', 'bg-amber-500', 'bg-emerald-500', 'bg-[#56348f]', 'bg-rose-500'];
        $added = 0;
        $updated = 0;

        // Fetch users who are Team Leads or have designation containing Lead or have phone numbers
        $leads = \App\Models\User::where('status', 'Active')
            ->where(function ($q) {
                $q->where('designation', 'like', '%lead%')
                  ->orWhere('designation', 'like', '%manager%')
                  ->orWhere('designation', 'like', '%hr%')
                  ->orWhere('designation', 'like', '%support%')
                  ->orWhereHas('roles', function ($rq) {
                      $rq->where('name', 'like', '%lead%')->orWhere('name', 'like', '%admin%');
                  });
            })
            ->with(['team', 'roles'])
            ->get();

        $currentMaxOrder = EmergencyContact::max('order') ?? 0;

        foreach ($leads as $idx => $lead) {
            $fullName = trim("{$lead->first_name} {$lead->last_name}") ?: $lead->name;
            $email = $lead->email;

            // Exclude Aswathi - not a team lead
            if (str_contains(strtolower($fullName), 'aswathi') || str_contains(strtolower($email ?? ''), 'aswathi')) {
                continue;
            }

            $phone = $lead->contact_number ?: $lead->alternate_contact_number;
            $role = $lead->designation ?: ($lead->roles->first()?->name ?? 'Team Lead');
            $dept = $lead->team?->name ?: 'General';

            if (str_contains(strtolower($fullName), 'abhiram')) {
                $role = 'QA Team Lead / Portal Helpdesk';
                $dept = 'QA';
                $phone = $phone ?: '07012649326';
            }

            $firstChar = mb_substr($lead->first_name ?: $fullName, 0, 1);
            $lastChar = mb_substr($lead->last_name ?: '', 0, 1);
            $initials = strtoupper($firstChar . ($lastChar ?: mb_substr($fullName, 1, 1)));

            // Check if already in emergency_contacts by email or name
            $existing = EmergencyContact::where(function ($q) use ($email, $fullName) {
                if ($email) $q->where('email', $email);
                $q->orWhere('name', $fullName);
            })->first();

            if ($existing) {
                $changes = [];
                if (empty($existing->phone) && !empty($phone)) {
                    $changes['phone'] = $phone;
                }
                if (empty($existing->department) && !empty($dept)) {
                    $changes['department'] = $dept;
                }
                if (!empty($changes)) {
                    $existing->update($changes);
                    $updated++;
                }
            } else {
                $currentMaxOrder++;
                EmergencyContact::create([
                    'name'        => $fullName,
                    'role'        => $role,
                    'email'       => $email,
                    'phone'       => $phone,
                    'department'  => $dept,
                    'avatar_bg'   => $colors[$idx % count($colors)],
                    'initials'    => $initials,
                    'order'       => $currentMaxOrder,
                    'is_active'   => true,
                ]);
                $added++;
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Synced emergency contacts successfully! ({$added} new added, {$updated} updated).",
            'added'   => $added,
            'updated' => $updated,
        ]);
    }
}
