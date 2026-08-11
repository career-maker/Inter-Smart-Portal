# cPanel Backend Migration - Step-by-Step Guide
## Quick Start Guide for Intersmart Employee Portal

**Time Required:** 30-45 minutes  
**Difficulty:** Medium  
**Downtime:** ~5 minutes (DNS only)

---

## PART 1: cPanel Database Setup (5 minutes)

### Step 1.1: Create PostgreSQL Database

1. **Log in to cPanel:**
   - URL: `https://workplace.intersmart.in:2083` (or your cPanel URL)
   - Username: `workplaceintersm`
   - Password: (your cPanel password)

2. **Navigate to Databases:**
   - Left menu → **Databases** → **PostgreSQL Databases**

3. **Create new database:**
   - Database Name: `intersmart_portal`
   - Click **Create Database**
   - Note the database name

4. **Create database user:**
   - Still in PostgreSQL section → **PostgreSQL Users**
   - Username: `intersmart_user`
   - Password: (Create a strong password - save it!)
   - Click **Create User**

5. **Grant privileges:**
   - Go to **PostgreSQL Database Privileges**
   - Database: `intersmart_portal`
   - User: `intersmart_user`
   - Select **ALL** privileges
   - Click **Add Privilege**

**✅ Database is ready!**

---

## PART 2: Connect via SSH (5 minutes)

### Step 2.1: Open Terminal on Your PC

**On Windows:**
- Press `Win + R`
- Type `powershell`
- Press Enter

### Step 2.2: Connect to cPanel Server

**In PowerShell, type:**
```powershell
ssh workplaceintersm@workplace.intersmart.in
```

Or use the IP address from cPanel:
```powershell
ssh workplaceintersm@173.249.159.38
```

**When prompted:**
- Type: `yes`
- Enter: Your cPanel password

**You should see:**
```
workplaceintersm@cPanel-Server:~$
```

**✅ You're now connected to the server!**

---

## PART 3: Clone Backend Code (5 minutes)

### Step 3.1: Navigate to Public HTML

```bash
cd /home/workplaceintersm/public_html
```

**What you see:**
```
workplaceintersm@cPanel-Server:~/public_html$
```

### Step 3.2: Create API Directory

```bash
mkdir -p api
cd api
```

### Step 3.3: Clone the Repository

```bash
git clone https://github.com/career-maker/Inter-Smart-Portal.git .
```

**Wait for it to finish** (you'll see files downloading)

### Step 3.4: Navigate to Backend

```bash
cd backend
```

**You should now see:**
```
workplaceintersm@cPanel-Server:~/public_html/api/backend$
```

**✅ Code is on the server!**

---

## PART 4: Install PHP Dependencies (5 minutes)

### Step 4.1: Install Composer Dependencies

```bash
composer install --optimize-autoloader --no-dev
```

**Wait for this to complete** (might take 2-3 minutes)

You'll see progress like:
```
Loading composer repositories...
Installing dependencies...
...
[thousands of files]
```

When done, you'll see:
```
17 packages in x.xxs
```

**✅ All PHP packages installed!**

---

## PART 5: Generate Application Key (2 minutes)

### Step 5.1: Generate Key

```bash
php artisan key:generate
```

**You should see:**
```
Application key set successfully.
```

**✅ App key generated!**

---

## PART 6: Create Environment File (10 minutes)

### Step 6.1: Copy Example .env

```bash
cp .env.example .env
```

### Step 6.2: Edit .env File

```bash
nano .env
```

**The file opens in nano editor** (black screen with white text)

### Step 6.3: Update Values

**Find and change these sections:**

#### Section 1: Application Settings

Find:
```
APP_NAME="Laravel"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost
```

Change to:
```
APP_NAME="Intersmart Employee Portal"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://workplace.intersmart.in/api
```

#### Section 2: Database Configuration

Find:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=
```

Change to:
```
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=intersmart_portal
DB_USERNAME=intersmart_user
DB_PASSWORD=YourDatabasePassword123
```

(Use the password you created in Step 1.4)

#### Section 3: Frontend URL

Find:
```
FRONTEND_URL=http://localhost:3000
```

Change to:
```
FRONTEND_URL=https://intersmart-portal.vercel.app
```

#### Section 4: Sanctum (Authentication)

Find:
```
SANCTUM_STATEFUL_DOMAINS=localhost
```

Change to:
```
SANCTUM_STATEFUL_DOMAINS=workplace.intersmart.in,intersmart-portal.vercel.app,localhost:3000
SESSION_DOMAIN=.workplace.intersmart.in
```

#### Section 5: Biometric Agent

Find:
```
BIOMETRIC_AGENT_SECRET_HASH=
```

Change to:
```
BIOMETRIC_AGENT_SECRET=biometric-secret-key
BIOMETRIC_AGENT_SECRET_HASH=
```

#### Section 6: Mail Configuration

Find:
```
MAIL_MAILER=log
```

Change to:
```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=career@intersmart.in
MAIL_PASSWORD=heftskdbcjvmzinq
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=career@intersmart.in
MAIL_FROM_NAME="Intersmart HR Portal"
```

#### Section 7: Scheduler Secret (Add at end)

Scroll to bottom and add:
```
SCHEDULER_SECRET=your-scheduler-secret-key
```

### Step 6.4: Save the File

**In nano editor:**
- Press: `Ctrl + O`
- Press: `Enter`
- Press: `Ctrl + X`

**You're back to terminal:**
```
workplaceintersm@cPanel-Server:~/public_html/api/backend$
```

**✅ Environment file configured!**

---

## PART 7: Run Database Migrations (5 minutes)

### Step 7.1: Run Migrations

```bash
php artisan migrate --force
```

**You should see:**
```
Migration table created successfully.
Migrated: 2024_01_01_000000_create_users_table
Migrated: 2024_01_01_000001_create_migrations_table
[many more migrations]
```

When done:
```
Migrated successfully.
```

**✅ Database tables created!**

---

## PART 8: Create Storage Link (2 minutes)

### Step 8.1: Create Symlink

```bash
php artisan storage:link --force
```

**You should see:**
```
The [public/storage] link has been connected to [storage/app/public].
```

**✅ File storage linked!**

---

## PART 9: Set File Permissions (3 minutes)

### Step 9.1: Set Permissions

```bash
chmod -R 755 /home/workplaceintersm/public_html/api
```

### Step 9.2: Set Storage Permissions

```bash
chmod -R 755 /home/workplaceintersm/public_html/api/storage
chmod -R 755 /home/workplaceintersm/public_html/api/bootstrap/cache
```

**No output means success** ✅

---

## PART 10: Test the API (5 minutes)

### Step 10.1: Test Health Endpoint

**On your local PC (PowerShell):**
```powershell
curl https://workplace.intersmart.in/api/ping
```

**Expected output:**
```json
{"status":"alive"}
```

**If you get SSL error:**
```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
curl https://workplace.intersmart.in/api/ping
```

**✅ API is working!**

---

## PART 11: Update Biometric Agent (5 minutes)

### Step 11.1: On Your Office PC

**Open file:**
```
C:\essl-agent\.env
```

### Step 11.2: Update These Lines

Find:
```env
API_URL=https://production-portal.com/api/v1/biometric/ingest
API_SECRET=your_plaintext_secret_here
DRY_RUN=true
```

Change to:
```env
API_URL=https://workplace.intersmart.in/api/v1/biometric/ingest
API_SECRET=biometric-secret-key
DRY_RUN=false
```

### Step 11.3: Save File

Press `Ctrl + S`

**✅ Agent configuration updated!**

---

## PART 12: Test Biometric Agent (5 minutes)

### Step 12.1: Run Agent

**On office PC, open PowerShell:**
```powershell
cd "C:\essl-agent"
node agent.js
```

**You should see:**
```
[AGENT] Live Production Mode: CONTROLLED_TEST_MODE is OFF
[AGENT] Starting checkpoint-based sync... DRY_RUN: false
[AGENT] Fetched X events from database
[AGENT] Processing X valid events
[API] Sending batch 1/X...
[API] Batch 1 successful. Status: 207
[API] Sending batch 2/X...
[API] Batch 2 successful. Status: 207
...
[AGENT] Sync complete. X/X batches succeeded.
```

**If you see timeouts:**
- This is Render's issue (slow server)
- On cPanel it should process without timeouts

**✅ Biometric agent is sending data!**

---

## PART 13: Verify Frontend Still Works (2 minutes)

### Step 13.1: Open Dashboard

**In browser:**
```
https://intersmart-portal.vercel.app/dashboard
```

**Should work without errors** ✅

### Step 13.2: Check Attendance Report

- Click **Attendance Report**
- Select **Today**
- Should show employees with punch times

**✅ Everything connected!**

---

## Troubleshooting

### Problem: "Connection refused"

**Solution:**
```bash
# Check if database is created
psql -h localhost -U postgres -c "\l"

# If intersmart_portal not listed, re-create in cPanel GUI
```

### Problem: "Unknown database"

**Solution:**
```bash
# Verify credentials in .env
# Make sure DB_PASSWORD matches what you set in cPanel
```

### Problem: "API returns 500 error"

**Solution:**
```bash
# Check error logs
tail -f /home/workplaceintersm/public_html/api/storage/logs/laravel.log

# Clear cache
php artisan cache:clear
php artisan config:clear
```

### Problem: "Agent times out"

**Solution:**
- This shouldn't happen on cPanel (faster than Render)
- If it does, reduce BATCH_SIZE in agent .env to 25

### Problem: SSL Certificate Issues

**Solution:**
```bash
# Use HTTP for local testing
curl http://workplace.intersmart.in/api/ping

# For HTTPS, issue cert in cPanel:
# cPanel → SSL/TLS Status → Issue SSL
```

---

## Summary Checklist

- [ ] Step 1: Created PostgreSQL database & user
- [ ] Step 2: Connected to cPanel via SSH
- [ ] Step 3: Cloned repository
- [ ] Step 4: Installed dependencies (composer install)
- [ ] Step 5: Generated app key
- [ ] Step 6: Created and configured .env file
- [ ] Step 7: Ran migrations
- [ ] Step 8: Created storage link
- [ ] Step 9: Set file permissions
- [ ] Step 10: Tested API health endpoint
- [ ] Step 11: Updated biometric agent .env
- [ ] Step 12: Tested agent (all batches succeeded)
- [ ] Step 13: Verified frontend works

---

## You're Done! 🎉

Your backend is now running on **cPanel** instead of Render!

**Benefits:**
✅ No more timeouts (faster server)  
✅ All biometric events process correctly  
✅ Local infrastructure (office network)  
✅ No Render costs  
✅ Full control over the server  

**Next Steps:**
- Monitor logs for 24 hours
- Set up automatic backups in cPanel
- Disable Render if everything is stable

---

## Questions?

If you get stuck on any step, screenshot the error and I'll help troubleshoot!
