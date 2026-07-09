#!/bin/bash

# Run all biometric-related regression tests
# CRITICAL VERIFICATIONS:
# 1. TEST A - Orphan Recovery
# 2. TEST F - Invalid_Sequence Dependency Recovery (NEW)
# 3. TEST D - Exact 8-event Employee 272 Production Sequence (NEW)
# 4. TEST B - Current-Day Reopen
# 5. TEST C - Idempotency (run twice)
# 6. TEST D2 - Controlled 7-event (regression)
# 7. TEST E - Duplicate/Delayed Safety

echo "=========================================================================="
echo "COMPREHENSIVE BIOMETRIC RECONCILIATION TEST SUITE"
echo "=========================================================================="

echo ""
echo "[TEST SUITE] Running all regression tests..."
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_orphan_recovery_on_employee_creation" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_invalid_sequence_dependent_recovery" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_exact_employee_272_8_event_production_sequence" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_current_day_reopen_clears_checkout" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_idempotent_reprocessing" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_controlled_7_event_sequence_unchanged" \
    --no-coverage 2>&1 | head -200

echo ""
echo "---"
echo ""

php artisan test tests/Feature/BiometricReconciliationTest.php \
    --filter="test_duplicate_and_delayed_events_safety" \
    --no-coverage 2>&1 | head -200

echo ""
echo "=========================================================================="
echo "ALL TESTS COMPLETE"
echo "=========================================================================="
