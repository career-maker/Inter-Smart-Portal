#!/bin/bash

# Run tests in Docker with PostgreSQL

set -e

echo "=== Starting Test Environment ==="

# Pull PostgreSQL image
echo "Pulling PostgreSQL 15 image..."
docker pull postgres:15 > /dev/null 2>&1 || true

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker run --rm -d \
  --name intersmart-test-db \
  -e POSTGRES_DB=hrms_test_db \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_pass \
  -p 5433:5432 \
  postgres:15 > /dev/null 2>&1

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 15

echo ""
echo "=== Running Tests ==="
echo ""

# Run tests in the intersmart-test image
docker run --rm \
  --link intersmart-test-db:test-db \
  -e APP_ENV=testing \
  -e APP_KEY=base64:QPAxiCpApR38c8nmhcDcAe8QEcHnwn7GVPVL1AodZiU= \
  -e DB_CONNECTION=pgsql \
  -e DB_HOST=test-db \
  -e DB_PORT=5432 \
  -e DB_DATABASE=hrms_test_db \
  -e DB_USERNAME=test_user \
  -e DB_PASSWORD=test_pass \
  intersmart-test:latest \
  bash -c "php artisan migrate --force --env=testing && php artisan test tests/Feature/BiometricReconciliationTest.php --no-coverage"

test_result=$?

echo ""
echo "=== Cleaning Up ==="
docker stop intersmart-test-db 2>/dev/null || true

if [ $test_result -eq 0 ]; then
  echo "✓ Tests PASSED"
  exit 0
else
  echo "✗ Tests FAILED"
  exit 1
fi
