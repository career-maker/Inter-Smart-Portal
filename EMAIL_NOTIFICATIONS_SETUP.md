# Email Notifications System - Setup Guide

## Overview

The Inter Smart Employee Portal now includes an **isolated email notification system** for Leave and Work From Home (WFH) requests. This system:

- ✅ Sends professional HTML emails to Team Leads and HR
- ✅ Never blocks leave/WFH request creation if email fails
- ✅ Logs all email activity for debugging
- ✅ Completely separate from core business logic
- ✅ Fully backward compatible
- ✅ Production-ready with error handling

---

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# SMTP Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="Intersmart HR Portal"

# Frontend URL for approval links
FRONTEND_URL=http://localhost:3000
# Production: https://intersmart-portal.vercel.app
```

### Gmail Setup (Recommended)

#### Option 1: Using App Password (More Secure - Recommended)

1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** and **Windows Computer** (or your device)
3. Click **Generate**
4. Google will show a 16-character password
5. Copy the password and paste into `MAIL_PASSWORD` in `.env`

```env
MAIL_USERNAME=career@intersmart.in
MAIL_PASSWORD=xxxx xxxx xxxx xxxx  # (16-char app password)
```

#### Option 2: Using Regular Password (Less Secure)

1. Go to: https://myaccount.google.com/lesssecureapps
2. Toggle **ON** - "Allow less secure apps"
3. Wait 1-2 minutes
4. Use your regular Gmail password:

```env
MAIL_USERNAME=career@intersmart.in
MAIL_PASSWORD=YourGmailPassword123
```

### Other Email Providers

#### Outlook / Office 365

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your-email@company.com
MAIL_PASSWORD=your-password
```

#### SendGrid

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxx
```

---

## Email Types

### 1. Single-Day / Half-Day Leave

**Trigger:** When an employee applies for single-day or half-day leave

**Recipients:**
- **To:** Employee's Team Lead
- **CC:** hr@intersmart.in, admin@intersmart.in

**Subject:**
```
Leave Request | [Employee Name] | [Leave Type] | [Date]
```

**Example:**
```
Leave Request | Aswathi M Ashok | Casual Leave | 20 Jul 2026
```

**Content:**
- Professional HTML email with employee and leave details
- Reason for leave
- Approval buttons linking to portal

---

### 2. Multiple-Day Leave

**Trigger:** When an employee applies for 2+ days of leave

**Recipients:**
- **To:** Employee's Team Lead
- **CC:** hr@intersmart.in, admin@intersmart.in

**Subject:**
```
Leave Request | [Employee Name] | [Leave Type] | [Start Date] - [End Date]
```

**Example:**
```
Leave Request | Aswathi M Ashok | Casual Leave | 20 Jul 2026 - 25 Jul 2026
```

---

### 3. Work From Home (WFH)

**Trigger:** When an employee submits a WFH request

**Recipients:**
- **To:** Employee's Team Lead
- **CC:** hr@intersmart.in, admin@intersmart.in

**Subject:**
```
WFH Request | [Employee Name] | [Date]
```

**Example:**
```
WFH Request | Aswathi M Ashok | 20 Jul 2026
```

---

## Email Content

All emails include:

### Employee Information
- Name
- Employee ID
- Department
- Designation

### Request Details
- Leave/WFH Type
- Date(s)
- Duration
- Reason
- Applied Date
- Reference Number (e.g., LR-12345, WFH-67890)

### Action Buttons
- **Approve Button** - Links to approval page
- **Reject Button** - Links to approval page
- Portal doesn't perform approval directly from email
- Portal handles authentication and authorization

### Design Features
- ✅ Mobile responsive
- ✅ Works in Gmail, Outlook, Apple Mail
- ✅ Professional branding (Intersmart logo & colors)
- ✅ Inline CSS for compatibility
- ✅ Clean card layout
- ✅ Easy-to-read typography

---

## File Structure

```
backend/
├── app/
│   ├── Services/
│   │   └── Email/
│   │       └── EmailService.php          # Main email service
│   └── Mail/
│       ├── LeaveRequestMail.php          # Leave email mailable
│       └── WfhRequestMail.php            # WFH email mailable
│
├── resources/views/emails/
│   ├── leave-request.blade.php           # Leave email template
│   └── wfh-request.blade.php             # WFH email template
│
├── Http/Controllers/Api/
│   ├── LeaveRequestController.php        # Updated: calls EmailService
│   └── WfhRequestController.php          # Updated: calls EmailService
│
└── EMAIL_NOTIFICATIONS_SETUP.md          # This file
```

---

## How It Works

### Leave Request Flow

1. Employee submits leave via API
2. LeaveRequestController validates and creates LeaveRequest
3. Transaction is committed (request is now saved)
4. In-app notifications are sent
5. **EmailService::sendLeaveRequestEmail()** is called
6. Email is sent to Team Lead + CC'd to HR/Admin
7. If email fails → logged as warning, request remains created
8. Response returned to frontend with success message

### WFH Request Flow

1. Employee submits WFH via API
2. WfhRequestController validates and creates WfhRequest
3. In-app notifications are sent (if pending)
4. **EmailService::sendWfhRequestEmail()** is called
5. Email is sent to Team Lead + CC'd to HR/Admin
6. If email fails → logged as warning, request remains created
7. Response returned to frontend with success message

---

## Error Handling

### Email Failures Don't Block Requests

```php
try {
    EmailService::sendLeaveRequestEmail($leaveRequest);
} catch (\Exception $e) {
    Log::warning('Email notification failed: ' . $e->getMessage());
    // Leave/WFH request is still saved - request continues
}
```

### Logging

All email activity is logged to `storage/logs/laravel.log`:

```
[INFO] Leave email sent - recipient: teamlead@email.com, request_id: 123
[WARNING] Failed to send leave email - error: Connection timeout
[ERROR] Email service error - error: Invalid email format
```

---

## Testing Locally

### 1. Test Email Configuration

```bash
cd backend
php artisan config:show mail
```

Expected output:
```
MAIL_DRIVER: smtp
MAIL_HOST: smtp.gmail.com
MAIL_PORT: 587
MAIL_ENCRYPTION: tls
MAIL_USERNAME: your-email@gmail.com
MAIL_PASSWORD: ••••••••••••••••
```

### 2. Send Test Email

```bash
cd backend
php artisan mail:test your-email@gmail.com
```

You should receive a test email in 30 seconds.

### 3. Test Leave Request Email

1. Log in to the portal
2. Navigate to "Apply Leave"
3. Fill in leave details
4. Click "Review & Submit"
5. Check email for both:
   - Your personal inbox (Team Lead email)
   - hr@intersmart.in CC'd email

### 4. Check Logs

```bash
tail -f storage/logs/laravel.log | grep -i "email\|mail"
```

---

## Troubleshooting

### No Emails Received

**Check 1: Is MAIL_MAILER set to 'smtp'?**
```bash
grep MAIL_MAILER backend/.env
```
Should show: `MAIL_MAILER=smtp` (not `log`)

**Check 2: Is Gmail App Password correct?**
- Go to https://myaccount.google.com/apppasswords
- Regenerate and copy the exact 16-character password
- Paste into `.env` MAIL_PASSWORD

**Check 3: Are emails in spam folder?**
- Check Gmail spam/promotions folder
- Add hr@intersmart.in to contacts to improve deliverability

**Check 4: Is FRONTEND_URL configured?**
```bash
grep FRONTEND_URL backend/.env
```
Should show valid URL for approval links

### "Connection timeout" Error

Port 587 might be blocked by firewall:
```bash
# Windows
telnet smtp.gmail.com 587

# Mac/Linux
nc -zv smtp.gmail.com 587
```

If timeout → contact network admin or use mobile hotspot for testing

### "Authentication failed" Error

Wrong credentials:
- Verify email: career@intersmart.in
- Verify app password (16 characters from Google)
- NOT the regular Gmail password

### "Duplicate index" Error

Migration error (already fixed):
```bash
cd backend
php artisan migrate --force
```

---

## Production Deployment

### Render Environment Variables

1. Go to Render Dashboard
2. Select backend service
3. Go to "Environment" tab
4. Add these variables:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=career@intersmart.in
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM_ADDRESS=career@intersmart.in
MAIL_FROM_NAME=Intersmart HR Portal
FRONTEND_URL=https://intersmart-portal.vercel.app
```

5. Click "Deploy"
6. Wait for deployment to complete
7. Test by submitting a leave request from production

---

## Security

### Credential Protection
- ✅ Never commit `.env` to git
- ✅ Credentials stored in environment variables only
- ✅ Render dashboard is password protected
- ✅ Use app passwords (more secure than regular passwords)

### Email Security
- ✅ TLS encryption on port 587
- ✅ HTML is escaped to prevent injection
- ✅ Email addresses are validated
- ✅ No sensitive data in email subject line

### Approval Links
- ✅ Portal handles authentication
- ✅ Approval role not encoded in email link
- ✅ Portal verifies user permissions before allowing approval

---

## Architecture

### Service Isolation

The email system is completely isolated from core logic:

```
LeaveRequestController (existing)
    ↓
LeaveRequest saved ✓
    ↓
In-app notifications sent ✓
    ↓
EmailService.sendLeaveRequestEmail() [ISOLATED]
    ↓ (try-catch wraps entire call)
    ├─ Log success or error
    ├─ Never blocks request
    └─ Never rollbacks database
```

### Zero Impact on Existing Logic

- No changes to leave calculation
- No changes to approval workflow
- No changes to leave balance deduction
- No changes to WFH logic
- No changes to attendance
- No changes to payroll
- No database schema changes
- 100% backward compatible

---

## Future Enhancements

The system is designed to support additional email types:

- Birthday notifications
- Announcement emails
- Payslip emails
- Document approval notifications
- Clock-in/out alerts

All without modifying the existing EmailService structure.

---

## Support

### Logs Location
- **Local:** `backend/storage/logs/laravel.log`
- **Render:** Dashboard → Select service → Logs tab

### Check Email Status
```bash
# View all email-related logs
grep -i "email\|mail" storage/logs/laravel.log

# View only errors
grep -i "error\|failed" storage/logs/laravel.log | grep -i "email\|mail"
```

### Contact Information
For issues:
1. Check logs first
2. Verify environment variables
3. Test with `php artisan mail:test`
4. Check Gmail account security settings

---

## Changelog

### v1.0 (2026-07-15)
- ✅ Initial email notification system
- ✅ Leave request emails
- ✅ WFH request emails
- ✅ Professional HTML templates
- ✅ Error handling and logging
- ✅ Gmail SMTP configuration
- ✅ Render deployment support
