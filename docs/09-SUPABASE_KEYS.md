# Supabase Keys & Configuration

This document stores the Supabase database connection details so you don't need to enter them manually again.

These details are used in the Laravel backend `.env` file to connect to the hosted Supabase PostgreSQL instance.

```env
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.shczwbwsrnrygmmvyeue
DB_PASSWORD="Abhihere1234@"
```

## Note
Any schema migrations applied via Laravel (`php artisan migrate`) are automatically reflected in this Supabase database.
