# Email Notifications System - Setup & Documentation

## Overview

The Inter Smart Employee Portal now has a complete email notification system for Leave and Work From Home (WFH) requests. The system automatically sends professional HTML emails to relevant approvers based on the type of request.

---

## ✅ Implementation Complete

### 1. Gmail SMTP Configuration

**Status:** ✅ Configured in `.env`

```env
MAIL_MAILER=smtp
MAIL_SCHEME=tls
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=career@intersmart.in
MAIL_PASSWORD=Poloman@11
MAIL_FROM_ADDRESS="career@intersmart.in"
MAIL_FROM_NAME="Intersmart HR Portal"
```

**For Production (Render):**
Update the Render environment variables with the same values.

---

## 📧 Email Notification Workflows

### Single-Day Leave Request

**Trigger:** Employee submits leave for a single day (including Half-Day)

**Recipients:**
- **To:** Team Lead's email
- **CC:** hr@intersmart.in, admin@intersmart.in

**Approval Rule:** Either TL OR HR approval is sufficient

**Email Template:** `leave-request.blade.php`

**Subject Format:**
```
Leave Request | John Doe | Casual Leave | 20 Jul 2026
```

---

### Multiple-Day Leave Request

**Trigger:** Employee submits leave for more than one day

**Recipients:**
- **To:** Team Lead's email, HR@intersmart.in
- **CC:** None

**Approval Rule:** Sequential approval (TL → HR)

**Email Template:** `leave-request.blade.php`

**Subject Format:**
```
Leave Request | John Doe | Casual Leave | 20 Jul 2026 - 23 Jul 2026
```

---

### Work From Home (WFH) Request

**Trigger:** Employee submits WFH request (single or multiple days)

**Recipients:**
- **To:** Team Lead's email, HR@intersmart.in
- **CC:** None

**Approval Rule:** Both TL and HR must approve independently

**Email Template:** `wfh-request.blade.php`

**Subject Format:**
```
WFH Request | John Doe | 20 Jul 2026
```

or

```
WFH Request | John Doe | 20 Jul 2026 - 22 Jul 2026
```

---

## 🏗️ System Architecture

### Files Created

#### 1. **Mailable Classes**
- `app/Mail/LeaveRequestNotification.php` - Leave request email template handler
- `app/Mail/WFHRequestNotification.php` - WFH request email template handler

#### 2. **Email Templates (Blade)**
- `resources/views/emails/leave-request.blade.php` - Professional leave request form
- `resources/views/emails/wfh-request.blade.php` - Professional WFH request form

#### 3. **Service Layer**
- `app/Services/NotificationService.php` - Centralized notification logic

### Files Updated

#### 1. **Configuration**
- `config/app.php` - Added `frontend_url` configuration
- `.env` - Gmail SMTP credentials + FRONTEND_URL

#### 2. **Controllers**
- `app/Http/Controllers/Api/LeaveRequestController.php` - Updated notifyOnSubmit() to use NotificationService
- `app/Http/Controllers/Api/WfhRequestController.php` - Updated store() to send emails

---

## 📋 Email Template Features

### Leave Request Email
- **Professional gradient header** (purple) with approval icon
- **Structured form** with employee details (name, ID, team, designation)
- **Leave details** (type, dates, days, reason)
- **Application metadata** (applied date/time, reference ID)
- **Action buttons** (Approve/Reject) linking to portal
- **Responsive design** (mobile + desktop optimized)
- **Company branding** with footer

### WFH Request Email
- **Professional gradient header** (pink) with WFH icon
- **Similar structure** to leave request
- **Info box** explaining dual approval (TL + HR)
- **Same responsive design** and branding

---

## 🔗 Approval Links

Email buttons redirect to the portal for secure approval:

```
Approve: {FRONTEND_URL}/approval/leave/{requestId}?action=approve
Reject:  {FRONTEND_URL}/approval/leave/{requestId}?action=reject

Approve: {FRONTEND_URL}/approval/wfh/{requestId}?action=approve
Reject:  {FRONTEND_URL}/approval/wfh/{requestId}?action=reject
```

**Note:** Clicking links redirects to the portal where the user must authenticate before approval/rejection is processed.

---

## 🔐 Security

✅ **Secure Approval Process**
- Links redirect to portal (no direct email actions)
- User authentication required in portal
- Session-based validation
- Audit trail maintained for all approvals

✅ **Data Protection**
- All emails sent via encrypted SMTP (TLS)
- No sensitive data in subject lines
- Employee personal info only in email body (not accessible via URL)

✅ **Error Handling**
- Email failures don't block request submission
- Failures logged for monitoring
- Fallback in-app notifications always sent

---

## 🚀 How to Use

### For Local Development

1. **Test with Gmail:**
   ```bash
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=career@intersmart.in
   MAIL_PASSWORD=Poloman@11
   ```

2. **Test Locally (No Real Email):**
   ```bash
   MAIL_MAILER=log  # Emails logged to storage/logs/laravel.log
   ```

3. **Mailhog (Local Testing):**
   ```bash
   MAIL_MAILER=smtp
   MAIL_HOST=127.0.0.1
   MAIL_PORT=1025
   # Access at http://localhost:8025
   ```

### For Production (Render)

1. **Set Environment Variables in Render Dashboard:**
   ```
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=career@intersmart.in
   MAIL_PASSWORD=Poloman@11
   MAIL_FROM_ADDRESS=career@intersmart.in
   MAIL_FROM_NAME=Intersmart HR Portal
   FRONTEND_URL=https://intersmart-portal.vercel.app
   ```

2. **Verify Email on Gmail:**
   - Less secure app access may need to be enabled
   - OR use Gmail App Passwords (recommended)

---

## 🧪 Testing

### Test Single-Day Leave Email

```bash
# Login to portal as employee
# Go to Leave → Apply Leave
# Select single day, submit
# Check email inbox (to: team_lead@...)
# Email should have subject: "Leave Request | Name | Casual Leave | 20 Jul 2026"
```

### Test Multi-Day Leave Email

```bash
# Login to portal as employee
# Go to Leave → Apply Leave
# Select multiple days, submit
# Check email inbox (to: team_lead@..., hr@intersmart.in)
# Email should have subject: "Leave Request | Name | Casual Leave | 20 Jul 2026 - 23 Jul 2026"
```

### Test WFH Email

```bash
# Login to portal as employee
# Go to WFH → Request WFH
# Select date(s), submit
# Check email inbox (to: team_lead@..., hr@intersmart.in)
# Email should have subject: "WFH Request | Name | 20 Jul 2026"
```

---

## 📧 Email Service (NotificationService)

### Public Methods

```php
// Send leave request emails based on type
NotificationService::notifyLeaveRequest(LeaveRequest $leaveRequest)

// Send WFH request emails to both TL and HR
NotificationService::notifyWFHRequest(WFHRequest $wfhRequest)
```

### Example Usage

```php
use App\Services\NotificationService;
use App\Models\LeaveRequest;

$leaveRequest = LeaveRequest::find(1);
NotificationService::notifyLeaveRequest($leaveRequest);
```

---

## 🐛 Troubleshooting

### Emails Not Sending

**Check 1:** Verify `.env` configuration
```bash
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
```

**Check 2:** Verify Gmail credentials
- Username: `career@intersmart.in`
- Password: `Poloman@11`
- Less Secure App Access: ENABLED (or use App Password)

**Check 3:** Check Laravel logs
```bash
tail -f storage/logs/laravel.log | grep -i mail
```

**Check 4:** Verify email addresses exist
- HR email: hr@intersmart.in
- Admin email: admin@intersmart.in
- Team Lead email: (from database)

### Approval Links Not Working

**Check 1:** Verify FRONTEND_URL in `.env`
```bash
FRONTEND_URL=https://intersmart-portal.vercel.app  # Production
FRONTEND_URL=http://localhost:3000                  # Local
```

**Check 2:** Verify portal has `/approval/leave/{id}` and `/approval/wfh/{id}` routes

**Check 3:** User must be logged in to approve (session required)

---

## 📝 Configuration Summary

| Component | File | Status |
|-----------|------|--------|
| Gmail SMTP | `.env` | ✅ Configured |
| Leave Mailable | `Mail/LeaveRequestNotification.php` | ✅ Created |
| WFH Mailable | `Mail/WFHRequestNotification.php` | ✅ Created |
| Leave Template | `views/emails/leave-request.blade.php` | ✅ Created |
| WFH Template | `views/emails/wfh-request.blade.php` | ✅ Created |
| NotificationService | `Services/NotificationService.php` | ✅ Created |
| LeaveRequestController | Updated `notifyOnSubmit()` | ✅ Updated |
| WfhRequestController | Updated `store()` | ✅ Updated |
| App Config | `config/app.php` | ✅ Updated |

---

## 🎯 Next Steps

1. **Test locally** with Mailhog or Gmail test account
2. **Deploy to Render** with proper environment variables
3. **Configure Admin email** in Render (currently hardcoded as admin@intersmart.in)
4. **Monitor logs** for any email failures
5. **Create frontend approval pages** for `/approval/leave/{id}` and `/approval/wfh/{id}`

---

## 📞 Support

For issues or questions, check:
1. Laravel logs: `storage/logs/laravel.log`
2. Gmail account settings (less secure apps)
3. Render environment variables
4. Frontend URL configuration

**Current Email:** career@intersmart.in (Gmail sender)
**Team Lead Email:** (from employee.team.team_lead.email)
**HR Email:** hr@intersmart.in
**Admin Email:** admin@intersmart.in
