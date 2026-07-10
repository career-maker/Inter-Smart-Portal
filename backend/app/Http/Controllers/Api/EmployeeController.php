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
        try {
            $data = $request->validated();

            // Log the incoming data for debugging
            \Log::info('Employee creation request', ['data' => $data]);

            // Ensure required fields have values
            if (empty($data['first_name'])) {
                return response()->json([
                    'message' => 'First name is required',
                    'error' => 'first_name_required'
                ], 422);
            }

            if (empty($data['email'])) {
                return response()->json([
                    'message' => 'Email is required',
                    'error' => 'email_required'
                ], 422);
            }

            // Provide default for last_name if empty (database doesn't allow null)
            if (empty($data['last_name'])) {
                $data['last_name'] = $data['first_name']; // Use first name as fallback
            }

            $data['password'] = Hash::make($data['password'] ?? 'Password@123');

            $role = $data['role'] ?? 'Employee';
            unset($data['role']);

            // Auto-calculate probation end date if not provided
            if (empty($data['probation_end_date']) && !empty($data['joining_date'])) {
                try {
                    $data['probation_end_date'] = \Carbon\Carbon::parse($data['joining_date'])->addMonths(6)->toDateString();
                } catch (\Exception $dateErr) {
                    \Log::error('Invalid joining date', ['date' => $data['joining_date'] ?? 'null']);
                    return response()->json([
                        'message' => 'Invalid joining date format',
                        'error' => 'invalid_joining_date'
                    ], 422);
                }
            }

            $user = User::create($data);
            $user->assignRole($role);

            // If employee is Team Lead and belongs to a team, update team's team_lead_id
            if ($role === 'Team Lead' && !empty($data['team_id'])) {
                \App\Models\Team::where('id', $data['team_id'])->update(['team_lead_id' => $user->id]);
            }

            // Create a zero leave balance record for the new employee
            \App\Models\LeaveBalance::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'casual_leave_balance'       => 0,
                    'sick_leave_balance'         => 0,
                    'cl_carry_forward'           => 0,
                    'total_leaves_taken'         => 0,
                    'probation_leaves_allocated' => false
                ]
            );

            // Recover orphaned biometric events for this employee_code
            // (if events arrived before the employee was created in portal)
            if (!empty($user->employee_code)) {
                try {
                    $processor = app(\App\Services\BiometricProcessorService::class);
                    $processor->recoverOrphanedEventsForEmployeeCode($user->employee_code);
                } catch (\Exception $e) {
                    // Log but don't fail on orphaned event recovery
                    \Log::warning("Failed to recover orphaned events for {$user->employee_code}", ['error' => $e->getMessage()]);
                }
            }

            \Log::info('Employee created successfully', ['user_id' => $user->id, 'email' => $user->email]);

            return new EmployeeResource($user->load(['team', 'roles']));
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            \Log::error('Unique constraint violation when creating employee', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Email or employee code already exists',
                'error' => 'duplicate_email_or_code'
            ], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Database error when creating employee', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Database error. Please check your input.',
                'error' => 'database_error'
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Unexpected error when creating employee', ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return response()->json([
                'message' => 'An unexpected error occurred: ' . $e->getMessage(),
                'error' => 'server_error'
            ], 500);
        }
    }

    public function show(User $employee)
    {
        return new EmployeeResource($employee->load(['team', 'roles']));
    }

    public function publicProfile(User $employee)
    {
        return response()->json([
            'data' => [
                'id' => $employee->id,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'email' => $employee->email,
                'designation' => $employee->designation,
                'employee_code' => $employee->employee_code,
                'profile_photo_path' => $employee->profilePhotoUrl(),
                'team' => $employee->team->name ?? 'Unassigned',
                'joining_date' => $employee->joining_date,
                'role' => $employee->roles->first()?->name ?? 'Employee',
            ]
        ]);
    }

    public function update(UpdateEmployeeRequest $request, User $employee)
    {
        $data = $request->validated();
        $role = $data['role'] ?? null;
        unset($data['role']);

        // Treat empty strings as null (blank form fields) then strip nulls
        // so we never overwrite existing DB values with empty/null
        $data = array_map(fn($v) => ($v === '' ? null : $v), $data);
        $data = array_filter($data, fn($v) => !is_null($v));

        // Check if employee_code is being updated
        $employeeCodeChanged = isset($data['employee_code']) && $data['employee_code'] !== $employee->employee_code;
        $newEmployeeCode = $employeeCodeChanged ? $data['employee_code'] : null;

        $employee->update($data);

        if ($role) {
            $employee->syncRoles([$role]);

            // If employee is Team Lead and belongs to a team, update team's team_lead_id
            if ($role === 'Team Lead' && !empty($employee->team_id)) {
                \App\Models\Team::where('id', $employee->team_id)->update(['team_lead_id' => $employee->id]);
            } elseif ($role !== 'Team Lead') {
                // If role is no longer Team Lead, remove from teams that had them as lead
                \App\Models\Team::where('team_lead_id', $employee->id)->update(['team_lead_id' => null]);
            }
        }

        // Recover orphaned biometric events if employee_code was changed
        if ($employeeCodeChanged && !empty($newEmployeeCode)) {
            $processor = app(\App\Services\BiometricProcessorService::class);
            $processor->recoverOrphanedEventsForEmployeeCode($newEmployeeCode);
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

        // Local dev fallback â€” store on public disk
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

    public function sampleCSV()
    {
        $headers = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@intersmart.in',
            'personal_email' => 'john.doe@gmail.com',
            'employee_code' => 'EMP001',
            'designation' => 'Software Engineer',
            'team_id' => '1',
            'joining_date' => '2024-01-15',
            'dob' => '1990-05-20',
            'gender' => 'Male',
            'blood_group' => 'O+',
            'marital_status' => 'Single',
            'contact_number' => '9876543210',
            'alternate_contact_number' => '9876543211',
            'permanent_address' => '123 Main St, City',
            'current_address' => '456 Work St, City',
            'password' => 'Password@123',
            'role' => 'Employee'
        ];

        $filename = 'employee-import-sample-' . date('Y-m-d') . '.csv';
        $handle = fopen('php://memory', 'r+');

        // Write header
        fputcsv($handle, array_keys($headers));
        // Write sample row
        fputcsv($handle, array_values($headers));

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=$filename");
    }

    private function convertDateFormat($dateStr)
    {
        if (empty($dateStr)) return null;

        // Try parsing DD-MM-YYYY format
        try {
            $date = \Carbon\Carbon::createFromFormat('d-m-Y', $dateStr);
            return $date->toDateString(); // Returns YYYY-MM-DD
        } catch (\Exception $e) {
            // Try YYYY-MM-DD format
            try {
                $date = \Carbon\Carbon::createFromFormat('Y-m-d', $dateStr);
                return $date->toDateString();
            } catch (\Exception $e2) {
                return null;
            }
        }
    }

    public function importCSV(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120'
        ]);

        try {
            $file = $request->file('file');
            $path = $file->getRealPath();
            $data = array_map('str_getcsv', file($path));
            $headers = array_shift($data);

            $results = [
                'imported' => 0,
                'failed' => 0,
                'errors' => []
            ];

            $validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other'];

            foreach ($data as $index => $row) {
                if (empty(array_filter($row))) continue;

                $employee = array_combine($headers, $row);

                try {
                    // Validate required fields
                    $firstName = trim($employee['first_name'] ?? '');
                    $email = trim($employee['email'] ?? '');

                    if (empty($firstName) || empty($email)) {
                        $results['errors'][] = "Row " . ($index + 2) . ": first_name and email are required";
                        $results['failed']++;
                        continue;
                    }

                    // Check if email already exists
                    if (User::where('email', $email)->exists()) {
                        $results['errors'][] = "Row " . ($index + 2) . ": Email already exists";
                        $results['failed']++;
                        continue;
                    }

                    // Convert date formats
                    $joiningDate = $this->convertDateFormat($employee['joining_date'] ?? '');
                    $dob = $this->convertDateFormat($employee['dob'] ?? '');

                    // Validate and sanitize gender
                    $gender = trim($employee['gender'] ?? '');
                    if (!empty($gender) && !in_array($gender, $validGenders)) {
                        $results['errors'][] = "Row " . ($index + 2) . ": Invalid gender. Must be Male, Female, or Other";
                        $results['failed']++;
                        continue;
                    }

                    // Prepare data
                    $empData = [
                        'first_name' => $firstName,
                        'last_name' => trim($employee['last_name'] ?? '') ?: $firstName,
                        'email' => $email,
                        'personal_email' => trim($employee['personal_email'] ?? '') ?: null,
                        'employee_code' => trim($employee['employee_code'] ?? '') ?: null,
                        'designation' => trim($employee['designation'] ?? '') ?: null,
                        'team_id' => !empty($employee['team_id']) ? intval($employee['team_id']) : null,
                        'joining_date' => $joiningDate,
                        'dob' => $dob,
                        'gender' => !empty($gender) ? ucfirst($gender) : null,
                        'blood_group' => trim($employee['blood_group'] ?? '') ?: null,
                        'marital_status' => trim($employee['marital_status'] ?? '') ?: null,
                        'contact_number' => trim($employee['contact_number'] ?? '') ?: null,
                        'alternate_contact_number' => trim($employee['alternate_contact_number'] ?? '') ?: null,
                        'permanent_address' => trim($employee['permanent_address'] ?? '') ?: null,
                        'current_address' => trim($employee['current_address'] ?? '') ?: null,
                        'password' => Hash::make(trim($employee['password'] ?? 'Password@123')),
                        'status' => 'Active'
                    ];

                    $user = User::create($empData);
                    $role = trim($employee['role'] ?? 'Employee');
                    $user->assignRole($role);

                    \App\Models\LeaveBalance::firstOrCreate(
                        ['user_id' => $user->id],
                        [
                            'casual_leave_balance' => 0,
                            'sick_leave_balance' => 0,
                            'cl_carry_forward' => 0,
                            'total_leaves_taken' => 0,
                            'probation_leaves_allocated' => false
                        ]
                    );

                    $results['imported']++;
                } catch (\Exception $e) {
                    $results['errors'][] = "Row " . ($index + 2) . ": " . $e->getMessage();
                    $results['failed']++;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Imported {$results['imported']} employees, {$results['failed']} failed",
                'results' => $results
            ], $results['failed'] > 0 ? 207 : 200);
        } catch (\Exception $e) {
            \Log::error('CSV import error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Error processing CSV: ' . $e->getMessage()
            ], 500);
        }
    }
}

