# Biometric Event Ingestion Setup Guide

## Overview

The Intersmart Employee Portal includes a biometric punch time system that captures employee check-in and check-out times from biometric devices (ESSL, ZKTeco, etc.).

## How It Works

### 1. **Event Ingestion** (`/api/v1/biometric/ingest`)
- Biometric devices send punch events via HTTP POST
- Events are stored in the `biometric_events` table
- Events are immediately synced to the `attendances` table

### 2. **Event Processing** (Scheduled command: `biometric:process`)
- Runs every 5 minutes via Laravel scheduler
- Builds complete daily timeline from all punch events
- Handles break detection and working hours calculation
- Updates attendance records with comprehensive data

### 3. **Data Flow**
```
Biometric Device
    ↓
POST /api/v1/biometric/ingest (with Bearer token)
    ↓
BiometricIngestionController::ingest()
    ↓ (validates & stores)
biometric_events table
    ↓ (immediate sync)
attendances table (check-in/check-out populated)
    ↓ (scheduled processing every 5 min)
BiometricProcessorService (builds timeline)
    ↓
attendances table (with breaks, working minutes, etc.)
```

## Configuration

### Step 1: Set Biometric Agent Secret

Edit `backend/.env`:
```env
# Development (plaintext secret)
BIOMETRIC_AGENT_SECRET=biometric-secret-key

# Production (bcrypt hash - optional)
BIOMETRIC_AGENT_SECRET_HASH=$2y$12$xxxxx...
```

### Step 2: Ensure Employee Codes Match

Biometric events include an `employee_code`. This **must match** the `employee_code` in the `users` table for events to be processed.

Example:
```sql
SELECT id, first_name, employee_code FROM users LIMIT 5;
```

## Testing Biometric Ingestion

### Option 1: Using Test Script (Windows)
```bash
cd backend
test_biometric_ingestion.bat
```

### Option 2: Using cURL

**Bash:**
```bash
curl -X POST "http://localhost:8765/api/v1/biometric/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer biometric-secret-key" \
  -d '{
    "events": [
      {
        "source_table": "DeviceLogs_7_2026",
        "source_event_id": "event001",
        "employee_code": "EMP001",
        "device_id": "20",
        "direction": "in",
        "local_punch_time": "2026-08-11 09:00:00"
      },
      {
        "source_table": "DeviceLogs_7_2026",
        "source_event_id": "event002",
        "employee_code": "EMP001",
        "device_id": "20",
        "direction": "out",
        "local_punch_time": "2026-08-11 18:00:00"
      }
    ]
  }'
```

**PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer biometric-secret-key"
    "Content-Type" = "application/json"
}

$body = @{
    events = @(
        @{
            source_table = "DeviceLogs_7_2026"
            source_event_id = "event001"
            employee_code = "EMP001"
            device_id = "20"
            direction = "in"
            local_punch_time = "2026-08-11 09:00:00"
        },
        @{
            source_table = "DeviceLogs_7_2026"
            source_event_id = "event002"
            employee_code = "EMP001"
            device_id = "20"
            direction = "out"
            local_punch_time = "2026-08-11 18:00:00"
        }
    )
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8765/api/v1/biometric/ingest" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### Step 3: Verify Ingestion

Check if events were stored:
```bash
# Using artisan tinker
php artisan tinker

# Query recent biometric events
App\Models\BiometricEvent::latest()->take(5)->get();

# Check attendance records
App\Models\Attendance::where('date', '2026-08-11')->get();
```

## Event Response Codes

When biometric events are sent, the API responds with HTTP 207 (Multi-Status):

```json
[
  {
    "source_table": "DeviceLogs_7_2026",
    "source_event_id": "event001",
    "status": "accepted"  // ✓ Mapped to employee
  },
  {
    "source_table": "DeviceLogs_7_2026",
    "source_event_id": "event002",
    "status": "accepted"  // ✓ Mapped to employee
  }
]
```

### Possible Status Values:
- `accepted` - Event was successfully ingested and mapped to an employee
- `unmapped_employee` - Employee code not found in system (event stored but not processed)
- `already_exists` - Duplicate event (same source_table, source_event_id)
- `rejected_invalid` - Event failed validation (missing/invalid fields)

## Attendance Display Timeline

1. **Immediately after ingestion** (1-2 seconds)
   - Check-in and check-out times appear in attendance table
   - Status: "Present"
   - Source: "biometric"

2. **After processor runs** (within 5 minutes)
   - Complete timeline built (handles breaks, working minutes)
   - Attendance record updated with detailed data
   - Status remains "Present"

## Troubleshooting

### Issue: 401 Unauthorized
**Cause:** Wrong or missing Bearer token  
**Fix:** 
```bash
# Check .env configuration
grep BIOMETRIC_AGENT_SECRET backend/.env

# Ensure header uses correct secret:
Authorization: Bearer biometric-secret-key
```

### Issue: All events show "unmapped_employee"
**Cause:** Employee code in event doesn't exist in users table  
**Fix:**
```bash
# Verify employee exists
SELECT * FROM users WHERE employee_code = 'EMP001';

# Create test employee if missing
php artisan tinker
App\Models\User::create([
    'employee_code' => 'EMP001',
    'first_name' => 'Test',
    'last_name' => 'Employee',
    'email' => 'test@intersmart.in',
    'password' => Hash::make('password')
]);
```

### Issue: Events stored but attendance not updated
**Cause:** 
1. Employee code mismatch
2. Processor job not running
3. Manual attendance override

**Fix:**
```bash
# Manually run processor
php artisan biometric:process

# Check for manual attendance conflicts
SELECT * FROM attendances WHERE source = 'manual' AND date = '2026-08-11';

# Process specific events
php artisan biometric:process --event-ids=1,2,3
```

### Issue: Attendance shows 0% punch-in rate
**Cause:** Biometric events never reached the API  
**Fix:**
1. Check biometric device configuration (is it sending to correct URL?)
2. Verify network connectivity from device to backend
3. Check backend logs for 401 errors
4. Verify BIOMETRIC_AGENT_SECRET is correct

## API Endpoint Details

**Endpoint:** `POST /api/v1/biometric/ingest`

**Authentication:** Bearer token (plaintext or bcrypt hash)

**Request Body:**
```json
{
  "events": [
    {
      "source_table": "DeviceLogs_M_YYYY",  // Required: Device table name
      "source_event_id": "unique_id",        // Required: Unique per device
      "employee_code": "EMP001",             // Required: Must match users.employee_code
      "device_id": "20",                     // Required: Physical device ID
      "direction": "in|out",                 // Required: 'in' or 'out'
      "local_punch_time": "YYYY-MM-DD HH:MM:SS"  // Required: Local time
    }
  ]
}
```

**Response:** HTTP 207 Multi-Status
```json
[
  {
    "source_table": "DeviceLogs_7_2026",
    "source_event_id": "event001",
    "status": "accepted|unmapped_employee|already_exists|rejected_invalid"
  }
]
```

## Production Deployment

For production, set a secure bcrypt hash:

```bash
# Generate bcrypt hash
php artisan tinker
password_hash('your-secret-key-here', PASSWORD_BCRYPT, ['cost' => 12]);

# Copy the output hash to .env
BIOMETRIC_AGENT_SECRET_HASH=$2y$12$xxxxx...

# Remove plaintext secret to force hash usage
# BIOMETRIC_AGENT_SECRET=
```

## Monitoring

### Check Event Status
```bash
# Pending events (not yet processed)
php artisan tinker
App\Models\BiometricEvent::where('processing_status', 'pending')->count();

# Events with errors
App\Models\BiometricEvent::where('processing_status', 'error')->get();

# Sync state tracking
App\Models\BiometricSyncState::all();
```

### View Scheduler Status
```bash
# Check last run
php artisan schedule:list

# Manually trigger processor
php artisan biometric:process

# View processor output
php artisan biometric:process -v
```

## Database Schema

### biometric_events
```sql
- id (PRIMARY KEY)
- source_system (varchar: 'essl', 'zkteco', etc.)
- source_table (varchar: 'DeviceLogs_M_YYYY')
- source_event_id (varchar: unique per device)
- employee_code (varchar)
- user_id (FK → users, nullable)
- device_id (varchar)
- direction (enum: 'in', 'out')
- local_punch_time (timestamp)
- utc_punch_time (timestamp)
- mapping_status (enum: 'mapped', 'unmapped')
- processing_status (enum: 'pending', 'processed', 'error', 'ignored')
- error_reason (text, nullable)
- created_at, updated_at
```

### attendances
```sql
- id (PRIMARY KEY)
- user_id (FK → users)
- date (date)
- check_in_time (timestamp, nullable)
- check_out_time (timestamp, nullable)
- total_working_minutes (int, nullable)
- status (enum: 'Present', 'Absent', 'Late', 'Half Day')
- source (enum: 'manual', 'biometric')
- created_at, updated_at
```

## Reference Links

- **Models:** `backend/app/Models/BiometricEvent.php`
- **Controller:** `backend/app/Http/Controllers/Api/BiometricIngestionController.php`
- **Service:** `backend/app/Services/BiometricProcessorService.php`
- **Middleware:** `backend/app/Http/Middleware/VerifyBiometricAgent.php`
- **Routes:** `backend/routes/api.php` (line ~398)
- **Scheduled Jobs:** `backend/routes/console.php` (line ~21)
