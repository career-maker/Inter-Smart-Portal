<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        $data['password'] = Hash::make($data['password']);

        $role = $data['role'] ?? 'Employee';
        unset($data['role']);

        $user = User::create($data);
        $user->assignRole($role);

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
        if (isset($data['role'])) {
            unset($data['role']);
        }
        $employee->update($data);

        if ($request->has('role')) {
            $employee->syncRoles([$request->role]);
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

        if ($employee->profile_photo_path) {
            Storage::disk('public')->delete($employee->profile_photo_path);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        $employee->update(['profile_photo_path' => $path]);

        $webPath = str_replace('\\', '/', $path);
        
        return response()->json([
            'message' => 'Photo updated successfully.',
            'profile_photo_path' => request()->getSchemeAndHttpHost() . '/api/photos/' . $webPath
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
