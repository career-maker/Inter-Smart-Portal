# Git Branch Strategy for Dual Deployments

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Repository                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  office branch (PRODUCTION - LIVE)                          │
│  ├── Frontend: Vercel (intersmart-portal.vercel.app)       │
│  ├── Backend: Render API                                    │
│  └── Database: Supabase                                     │
│      (Live system, currently running in production)         │
│                                                              │
│  main branch (TESTING & STAGING)                            │
│  ├── Frontend: Vercel (workplace.intersmart.in)            │
│  ├── Backend: cPanel (173.249.159.38)                      │
│  └── Database: Office PostgreSQL                            │
│      (New office server setup, testing phase)               │
│                                                              │
│  feature/* branches (Development)                           │
│  ├── Create from: main branch (for new features)            │
│  ├── Test on: main deployment (workplace.intersmart.in)    │
│  ├── PR into: main branch                                   │
│  └── After stable testing, PR into: office branch           │
│      (Only merge to office when production-ready)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Initial Setup

### 1.1 Create office branch from main
```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create office branch
git checkout -b office
git push -u origin office
```

### 1.2 Protect Branches in GitHub
1. **Go to GitHub Repository Settings → Branches**
2. **Add branch protection for `main`:**
   - Require pull request reviews (1 approval)
   - Require status checks to pass
   - Include administrators
3. **Add branch protection for `office`:**
   - Require pull request reviews (optional)
   - Require status checks to pass

---

## 2. Vercel Configuration

### 2.1 Production Vercel Project (office branch - LIVE)
**Project Name:** intersmart-portal
- **Connected Branch:** office
- **Domain:** intersmart-portal.vercel.app
- **Environment Variables:**
  ```
  NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api
  ```
- **Auto-deploy:** Enabled on push to office (LIVE system)

### 2.2 Testing Vercel Project (main branch - TESTING)
**Project Name:** intersmart-office
- **Connected Branch:** main
- **Domain:** workplace.intersmart.in
- **Environment Variables:**
  ```
  NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
  ```
- **Auto-deploy:** Enabled on push to main (Testing/Staging)

### 2.3 Create New Vercel Project for Testing/Office Server
```bash
# Create new project in Vercel
1. Go to vercel.com/dashboard
2. Click "New Project"
3. Import same GitHub repo
4. Root directory: frontend
5. Select branch: main (Testing branch)
6. Name project: intersmart-office (or similar)
7. Add environment variable: NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
8. Deploy (will be at workplace.intersmart.in after DNS setup)
```

---

## 3. Backend Environment Configuration

### 3.1 Create Separate .env files per branch

#### On `office` branch (Production - LIVE)
**File:** `backend/.env.production`
```env
APP_NAME="Intersmart Employee Portal"
APP_ENV=production
APP_KEY=<existing-production-key>
APP_URL=https://your-render-api.onrender.com/api

DB_CONNECTION=pgsql
DB_HOST=<supabase-host>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=<supabase-password>

MAIL_MAILER=smtp
MAIL_HOST=<company-smtp>
MAIL_PORT=587
MAIL_USERNAME=<noreply-email>
MAIL_PASSWORD=<password>
MAIL_FROM_ADDRESS="noreply@intersmart.in"

SANCTUM_STATEFUL_DOMAINS=intersmart-portal.vercel.app
SESSION_DRIVER=cookie
```

#### On `main` branch (Testing - Office Server Setup)
**File:** `backend/.env.testing`
```env
APP_NAME="Intersmart Employee Portal - Testing"
APP_ENV=production
APP_KEY=<generate-new-key>
APP_URL=https://workplace.intersmart.in/api

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=intersmart_office
DB_USERNAME=intersmart_user
DB_PASSWORD=<office-db-password>

MAIL_MAILER=smtp
MAIL_HOST=<company-smtp>
MAIL_PORT=587
MAIL_USERNAME=<noreply-email>
MAIL_PASSWORD=<password>
MAIL_FROM_ADDRESS="noreply@intersmart.in"

SANCTUM_STATEFUL_DOMAINS=workplace.intersmart.in
SESSION_DRIVER=cookie
```

### 3.2 .gitignore (Don't commit .env files)
```bash
# Already in .gitignore (verify)
backend/.env
backend/.env.local
backend/.env.*.local
backend/.env.production
backend/.env.office
```

---

## 4. Workflow: Feature Development & Testing

### 4.1 Create Feature Branch
```bash
# Always create from main branch (testing/staging branch)
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/new-feature
# or
git checkout -b feature/fix-bug
```

### 4.2 Make Changes & Commit
```bash
# Make your changes
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push -u origin feature/new-feature
```

### 4.3 Create Pull Request to main branch
```bash
# In GitHub:
1. Go to Pull requests
2. Click "New Pull Request"
3. Base: main (Testing branch)
4. Compare: feature/new-feature
5. Create PR
6. Add description and details
```

### 4.4 Test on Testing/Staging Version
```
1. Vercel auto-deploys to workplace.intersmart.in when PR is created
2. Test the changes on main (workplace.intersmart.in)
3. Verify in logs: tail -f ~/public_html/api/storage/logs/laravel.log
4. Test API functionality
5. Test database operations
6. Test thoroughly before merging
```

### 4.5 Merge to main branch (after testing)
```bash
# In GitHub:
1. Review PR
2. If tests pass: Click "Squash and merge" or "Merge"
3. Delete feature branch
4. Vercel auto-deploys to workplace.intersmart.in (testing version)
```

### 4.6 Merge to office branch (production) - ONLY WHEN STABLE
```bash
# After main version is stable for 24-48 hours:
1. Go to "New Pull Request"
2. Base: office (Production)
3. Compare: main
4. Create PR (title: "Merge main → office (Production Release)")
5. Review changes carefully (this is production!)
6. Merge to office
7. Vercel auto-deploys to intersmart-portal.vercel.app (LIVE)
8. Render backend auto-deploys (if any backend changes)
```

---

## 5. Branch Workflow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Create Feature Branch from main (Testing)                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                    git checkout -b feature/xyz
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Make Changes & Push                                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                   git push origin feature/xyz
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Create PR: feature/xyz → main (Testing)                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
        Vercel auto-deploys to workplace.intersmart.in
        (Test on staging/office server!)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Testing & Code Review (24-48 hours minimum)                 │
│  - Test on main deployment (workplace.intersmart.in)         │
│  - Check logs                                                │
│  - Verify functionality                                      │
│  - Get approval                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
            ✅ Stable & Ready?
                         │
                    git merge (or GitHub UI)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Merged into main (Testing/Staging)                          │
│  Vercel auto-deploys to workplace.intersmart.in              │
│  (Staging version updated)                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
      (Wait 24-48 hours, monitor closely)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Create PR: main → office (Production)                       │
│  ⚠️ THIS IS PRODUCTION ⚠️                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
        Review changes carefully (LIVE system!)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Merge to office (Production)                                │
│  Vercel auto-deploys to intersmart-portal.vercel.app         │
│  Render auto-deploys backend                                 │
│  (LIVE Production system updated)                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Quick Commands Reference

### Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Push Changes
```bash
git add .
git commit -m "feat: description of change"
git push -u origin feature/your-feature-name
```

### Update main branch (Testing)
```bash
git checkout main
git pull origin main
```

### Update office branch (Production - when stable)
```bash
git checkout office
git pull origin office
git fetch origin main  # Fetch latest from main
git merge origin/main  # Merge main into office
git push origin office
```

### Delete feature branch after merge
```bash
# Via GitHub UI or:
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## 7. Environment Variables per Branch

### GitHub Secrets (if using GitHub Actions)
- `VERCEL_TOKEN` (for deployments)
- `API_KEY` (if needed)

### Vercel Environment Variables

**Production Project (intersmart-portal):**
```
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api
```

**Office Project (intersmart-office):**
```
NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
```

### Backend Environment Files (manual deployment)

On cPanel:
```bash
# Use appropriate .env for office branch
cp backend/.env.office backend/.env
php artisan config:cache
```

On Render:
```bash
# Use appropriate .env for main branch
# Already configured via Render environment variables
```

---

## 8. Typical Development Cycle

### Scenario 1: Bug Fix
```
1. git checkout office
2. git checkout -b feature/fix-login-bug
3. Fix the code
4. git push -u origin feature/fix-login-bug
5. Create PR: feature/fix-login-bug → office
6. Vercel deploys to workplace.intersmart.in
7. Test the fix on office version
8. Merge to office
9. After verification, create PR: office → main
10. Merge to main (production updated)
```

### Scenario 2: New Feature
```
1. git checkout office
2. git checkout -b feature/new-leave-type
3. Implement feature
4. git push -u origin feature/new-leave-type
5. Create PR: feature/new-leave-type → office
6. Vercel deploys to workplace.intersmart.in
7. Test on office for a few days
8. Get team feedback
9. Merge to office
10. Monitor office version
11. When stable, create PR: office → main
12. Merge to main (production updated)
```

### Scenario 3: Database Migration
```
1. Create migration on feature branch
2. Test on office database
3. Merge to office
4. Run migration: php artisan migrate --force
5. Test functionality
6. Once verified, merge office → main
7. Migration auto-runs on Render via startup script
```

---

## 9. Rollback Strategy

### If office deployment has issues:
```bash
# Revert last commit on office branch
git checkout office
git revert HEAD
git push origin office
# Vercel auto-deploys reverted version
```

### If main deployment has issues:
```bash
# Revert last commit on main branch
git checkout main
git revert HEAD
git push origin main
# Vercel + Render auto-deploy reverted version
```

---

## 10. Monitoring Both Deployments

### Office Version (workplace.intersmart.in)
```bash
# SSH into cPanel
ssh workplaceintersm@173.249.159.38

# Monitor logs
tail -f ~/public_html/api/storage/logs/laravel.log

# Check database
psql -U intersmart_user -d intersmart_office -c "SELECT COUNT(*) FROM users;"
```

### Production Version (intersmart-portal.vercel.app)
```bash
# Check Vercel deployment logs
# Go to vercel.com/dashboard → intersmart-portal → Deployments

# Check Render backend logs
# Go to render.com → Your Backend App → Logs
```

---

## 11. Best Practices

✅ **DO:**
- Create features from `office` branch
- Test on office before merging to main
- Use descriptive commit messages
- Keep branches up to date with their base
- Delete feature branches after merge
- Tag releases on main: `git tag -a v1.0 -m "Release 1.0"`

❌ **DON'T:**
- Push directly to main or office (always use PRs)
- Commit .env files
- Force push to main or office
- Skip testing on office version
- Merge large, untested changes

---

## 12. Branch Protection Rules

### For `main` branch:
- ✅ Require PR reviews (1 approval)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators

### For `office` branch:
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ⚠️ PR reviews (optional, for fast testing)

---

## 13. GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main, office]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }} --scope intersmart-portal
          elif [ "${{ github.ref }}" = "refs/heads/office" ]; then
            vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }} --scope intersmart-office
          fi
```

---

## 14. Deployment Checklist

### For office branch deployments:
- [ ] Feature branch created from office
- [ ] Changes tested locally
- [ ] PR created to office
- [ ] Vercel deploys to workplace.intersmart.in
- [ ] Tested on office deployment
- [ ] Merged to office
- [ ] Office version stable for 24-48 hours
- [ ] Ready for production?
- [ ] Create PR: office → main
- [ ] Merged to main
- [ ] Production version updated

### For production (main) deployments:
- [ ] All office testing complete
- [ ] Changes PR'd from office → main
- [ ] Code reviewed
- [ ] Merged to main
- [ ] Vercel auto-deploys to intersmart-portal.vercel.app
- [ ] Render auto-deploys backend
- [ ] Monitor production logs
- [ ] Tag release: `git tag -a v1.x.x`
- [ ] Done! ✅

---

## 15. Summary

| Aspect | office | main |
|--------|--------|------|
| **Purpose** | Production (LIVE) | Testing/Staging |
| **Frontend** | intersmart-portal.vercel.app | workplace.intersmart.in |
| **Backend** | Render API | cPanel (173.249.159.38) |
| **Database** | Supabase | Office PostgreSQL |
| **Status** | Live & Running | Pre-production & Testing |
| **PRs from** | main only (after stable) | feature branches |
| **Testing** | Minimal (only hotfixes) | Full testing (24-48h minimum) |
| **Deployment** | Auto-deploy on push | Auto-deploy on push |

This strategy gives you:
✅ Safe testing environment (main = office server setup)
✅ Stable production (office = current live system)
✅ Clear workflow for features: feature → main → office
✅ Thorough testing before production updates
✅ Easy rollback if needed
✅ Automated deployments

