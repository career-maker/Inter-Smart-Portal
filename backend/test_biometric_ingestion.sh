#!/bin/bash
# Test script to verify biometric event ingestion

# Configuration
BACKEND_URL="http://localhost:8765"
BIOMETRIC_SECRET="biometric-secret-key"
EMPLOYEE_CODE="EMP001"  # Change this to a valid employee code
DEVICE_ID="20"

# Generate test event payload
read -r -d '' PAYLOAD << EOF
{
  "events": [
    {
      "source_table": "DeviceLogs_7_2026",
      "source_event_id": "test_$(date +%s)_in",
      "employee_code": "$EMPLOYEE_CODE",
      "device_id": "$DEVICE_ID",
      "direction": "in",
      "local_punch_time": "$(date '+%Y-%m-%d %H:%M:%S')"
    },
    {
      "source_table": "DeviceLogs_7_2026",
      "source_event_id": "test_$(date +%s)_out",
      "employee_code": "$EMPLOYEE_CODE",
      "device_id": "$DEVICE_ID",
      "direction": "out",
      "local_punch_time": "$(date -d '+1 hour' '+%Y-%m-%d %H:%M:%S')"
    }
  ]
}
EOF

echo "Testing biometric event ingestion..."
echo "Endpoint: $BACKEND_URL/api/v1/biometric/ingest"
echo "Employee Code: $EMPLOYEE_CODE"
echo ""

# Send request
curl -X POST "$BACKEND_URL/api/v1/biometric/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BIOMETRIC_SECRET" \
  -d "$PAYLOAD" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""
echo "If you see status 207, events were successfully ingested!"
echo "If you see status 401, check BIOMETRIC_AGENT_SECRET in .env"
echo ""
echo "To verify events were stored, run:"
echo "  php artisan tinker"
echo "  App\Models\BiometricEvent::latest()->take(5)->get()"
