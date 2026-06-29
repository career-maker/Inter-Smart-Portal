---
name: dev-environment
description: Local development environment setup — PHP ini, MySQL port, server start commands
metadata:
  type: project
---

## PHP Setup
- PHP binary: `C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php.exe`
- PHP ini: `C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php-cli-aiswarya.ini`
- Composer: `D:\iss\Inter Smart-Employee-Portal\composer.phar`
- MUST use `-c $ini` flag AND clear `$env:PHPRC` for ALL php/composer commands
- PHP server must be launched from PowerShell (not Git Bash) for ini to load correctly

## MySQL Setup
- MySQL binary: `C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\mysql-8.4.0\bin\win64\bin\mysql.exe`
- Port: **10053** (Local WP Claras2 site's MySQL — dedicated for this project)
- Credentials: `root / root`
- Main DB: `intersmart_portal`
- Test DB: `intersmart_portal_test`

## Starting Backend (PowerShell)
```powershell
$php = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php.exe"
$ini = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php-cli-aiswarya.ini"
$env:PHPRC = ""
Set-Location "D:\iss\Inter Smart-Employee-Portal\backend"

# Start server
Start-Process -FilePath $php -ArgumentList "-c `"$ini`" -S 127.0.0.1:8002 -t `"D:\iss\Inter Smart-Employee-Portal\backend\public`"" -WorkingDirectory "D:\iss\Inter Smart-Employee-Portal\backend" -PassThru -WindowStyle Hidden
```

## Starting Frontend
```powershell
Set-Location "D:\iss\Inter Smart-Employee-Portal\frontend"
Start-Process -FilePath "cmd" -ArgumentList "/c pnpm dev" -WorkingDirectory "D:\iss\Inter Smart-Employee-Portal\frontend" -PassThru -WindowStyle Hidden
# Listens on http://localhost:3000
```

## Running Artisan Commands
```powershell
$php = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php.exe"
$ini = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php-cli-aiswarya.ini"
$env:PHPRC = ""
& $php -c $ini artisan <command>
```

## Running Composer
```powershell
$php = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php.exe"
$ini = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php-cli-aiswarya.ini"
$composer = "D:\iss\Inter Smart-Employee-Portal\composer.phar"
$env:PHPRC = ""
& $php -c $ini $composer <command>
```

## Running Tests
```powershell
$php = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php.exe"
$ini = "C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\php-8.2.29+0\bin\win64\php-cli-aiswarya.ini"
$env:PHPRC = ""
& $php -c $ini artisan test --ansi
```

## Super Admin Credentials
- Email: admin@intersmart.in
- Password: Admin@123456

## pnpm Notes
- Package manager: pnpm
- Frontend directory: `D:\iss\Inter Smart-Employee-Portal\frontend`
- Run: `pnpm dev` (port 3000)
- `pnpm-workspace.yaml` must have `allowBuilds: true` for esbuild, sharp, unrs-resolver
- `pnpm.onlyBuiltDependencies` in package.json is deprecated in pnpm 11 (ignored)
