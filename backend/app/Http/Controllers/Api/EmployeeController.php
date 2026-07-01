<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class EmployeeController extends Controller
{
    public function showPhoto($path)
    {
        $fullPath = storage_path('app/public/' . $path);
        if (!file_exists($fullPath)) {
            abort(404);
        }
        return response()->file($fullPath);
    }

    public function index(Request $request)
    {
        $query = User::with(['team', 'roles']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('team_id')) {
            $query->where('team_id', $request->team_id);
        }

        if ($request->has('role')) {
            $query->role($request->role);
        }

        return EmployeeResource::collection($query->paginate(10));
    }

    public function store(StoreEmployeeRequest $request)
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password'] ?? 'Password@123');

        $role = $data['role'] ?? 'Employee';
        unset($data['role']);

        // Auto-calculate probation end date if not provided
        if (empty($data['probation_end_date']) && !empty($data['joining_date'])) {
            $data['probation_end_date'] = \Carbon\Carbon::parse($data['joining_date'])->addMonths(6)->toDateString();
        }

        $user = User::create($data);
        $user->assignRole($role);

        // Create a zero leave balance record for the new employee
        \App\Models\LeaveBalance::firstOrCreate(
            ['user_id' => $user->id],
            ['casual_leave_balance' => 0, 'sick_leave_balance' => 0, 'cl_carry_forward' => 0, 'total_leaves_taken' => 0]
        );

        // TODO: Fire EmployeeCreated event to send welcome email

        return new EmployeeResource($user->load(['team', 'roles']));
    }

    public function show(User $employee)
    {
        return new EmployeeResource($employee->load(['team', 'roles']));
    }

    public function update(UpdateEmployeeRequest $request, User $employee)
    {
        $data = $request->validated();
        $role = $data['role'] ?? null;
        unset($data['role']);

        // Remove null values so we don't overwrite existing DB values with null
        $data = array_filter($data, fn($v) => !is_null($v));

        $employee->update($data);

        if ($role) {
            $employee->syncRoles([$role]);
        }

        return new EmployeeResource($employee->load(['team', 'roles']));
    }

    public function destroy(User $employee)
    {
        // For actual production, consider soft deletes if there are related records
        $employee->delete();
        return response()->json(['message' => 'Employee deleted successfully.']);
    }

    public function updatePassword(Request $request, User $employee)
    {
        $request->validate([
            'password' => 'required|string|min:6|confirmed'
        ]);

        $employee->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function updatePhoto(Request $request, User $employee)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $supabaseUrl = config('services.supabase.url');
        $serviceKey  = config('services.supabase.service_key');
        $bucket      = config('services.supabase.storage_bucket');

        if ($supabaseUrl && $serviceKey && $bucket) {
            // Delete old photo from Supabase Storage
            if ($employee->profile_photo_path) {
                $oldPath = str_replace('\\', '/', $employee->profile_photo_path);
                Http::withHeaders(['Authorization' => 'Bearer ' . $serviceKey])
                    ->delete("{$supabaseUrl}/storage/v1/object/{$bucket}/{$oldPath}");
            }

            $ext      = $request->file('photo')->getClientOriginalExtension();
            $fileName = 'profile-photos/' . uniqid() . '.' . $ext;
            $mime     = $request->file('photo')->getMimeType();
            $contents = file_get_contents($request->file('photo')->getRealPath());

            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $serviceKey,
                'Content-Type'  => $mime,
                'x-upsert'      => 'true',
            ])->withBody($contents, $mime)
              ->post("{$supabaseUrl}/storage/v1/object/{$bucket}/{$fileName}");

            if (!$res->successful()) {
                return response()->json(['message' => 'Failed to upload photo to storage: ' . $res->body()], 500);
            }

            $employee->update(['profile_photo_path' => $fileName]);

            return response()->json([
                'message'           => 'Photo updated successfully.',
                'profile_photo_path' => $employee->profilePhotoUrl(),
            ]);
        }

        // Local dev fallback — store on public disk
        if ($employee->profile_photo_path) {
            Storage::disk('public')->delete($employee->profile_photo_path);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        $employee->update(['profile_photo_path' => $path]);

        return response()->json([
            'message'           => 'Photo updated successfully.',
            'profile_photo_path' => $employee->profilePhotoUrl(),
        ]);
    }

    public function updatePhotoUrl(Request $request, User $employee)
    {
        $request->validate([
            'photo_url' => 'required|url|max:1000',
        ]);

        $employee->update(['profile_photo_path' => $request->photo_url]);

        return response()->json([
            'message'            => 'Photo URL saved successfully.',
            'profile_photo_path' => $employee->profilePhotoUrl(),
        ]);
    }

    public function updateStatus(Request $request, User $employee)
    {
        $request->validate([
            'status' => 'required|in:Active,Disabled'
        ]);

        $employee->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Status updated successfully.',
            'status' => $employee->status
        ]);
    }
}
