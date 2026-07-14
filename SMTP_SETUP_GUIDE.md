# SMTP Setup Guide for Inter Smart Employee Portal

## What is SMTP?
SMTP (Simple Mail Transfer Protocol) is the protocol used to send emails. We need to configure it so the system can send leave application emails to Team Leads, HR, and Admins.

---

## Option 1: Using Your Company Mail Server (Recommended)

### Step 1: Get Company Mail Server Details
Contact your IT/Network administrator and ask for:
- **Mail Server Host** (e.g., mail.intersmart.in, smtp.company.com, or an IP address)
- **Port Number** (Usually 587 for TLS or 25 for plain)
- **Username** (Usually an email like noreply@intersmart.in)
- **Password** (The password for that email account)
- **Encryption** (TLS or STARTTLS - ask your admin)

### Step 2: Update .env File
Edit `backend/.env` and replace the MAIL section:

```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=mail.intersmart.in          # Replace with your server
MAIL_PORT=587                          # Replace if different
MAIL_USERNAME=noreply@intersmart.in   # Replace with your email
MAIL_PASSWORD=your-password-here       # Replace with actual password
MAIL_ENCRYPTION=tls                    # or 'null' if no encryption
MAIL_FROM_ADDRESS="noreply@intersmart.in"
MAIL_FROM_NAME="Intersmart Employee Portal"
```

### Step 3: Test the Configuration
Run this command in the backend folder:
```bash
php artisan tinker
```

Then run:
```php
Mail::raw('Test email', function($message) {
    $message->to('your-email@intersmart.in')
            ->subject('SMTP Test');
});
```

If successful, you'll see: `=> null` (which means it sent)

---

## Option 2: Using Gmail (Easy for Testing)

### Step 1: Enable 2-Factor Authentication (Required)
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click "Security" on the left
3. Enable "2-Step Verification"

### Step 2: Create App Password
1. Go back to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select:
   - **App**: Mail
   - **Device**: Windows Computer (or your OS)
3. Google will generate a 16-character password
4. Copy this password (you'll use it once)

### Step 3: Update .env File
```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx    # The 16-char password from Step 2
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="Intersmart Employee Portal"
```

**Note**: Gmail has rate limits (~300 emails/hour), so it's only good for testing.

---

## Option 3: Using Mailtrap (Free Testing Service)

### Step 1: Create Mailtrap Account
1. Go to [mailtrap.io](https://mailtrap.io)
2. Sign up with your email
3. Create a new Inbox (e.g., "Intersmart Testing")

### Step 2: Get SMTP Credentials
1. Click on your Inbox
2. Click "Integrations" → "Laravel"
3. Copy the credentials shown

### Step 3: Update .env File
```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465                    # or 587
MAIL_USERNAME=your-username      # From Mailtrap
MAIL_PASSWORD=your-password      # From Mailtrap
MAIL_ENCRYPTION=tls              # or ssl for 465
MAIL_FROM_ADDRESS="noreply@intersmart.in"
MAIL_FROM_NAME="Intersmart Employee Portal"
```

**Advantage**: All emails go to your Mailtrap inbox for testing. No real emails sent.

---

## Option 4: AWS SES (For Production)

### Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Create an account if you don't have one

### Step 2: Set Up SES
1. Go to AWS Console → SES (Simple Email Service)
2. Verify your domain or email
3. Create SMTP credentials
4. Request production access (initially limited to 1 email/second in sandbox mode)

### Step 3: Update .env File
```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=email-smtp.region.amazonaws.com  # e.g., email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@intersmart.in"
MAIL_FROM_NAME="Intersmart Employee Portal"
```

---

## Step-by-Step Configuration (For Your Situation)

### Best Approach for Intersmart:

1. **Ask IT Admin** for your company mail server details
2. **Update backend/.env** with the details
3. **Test with a leave application** - it should send an email
4. **Verify email arrives** in Team Lead's inbox

### If Company Mail Server is Not Available:

**Short-term (Testing):**
- Use Mailtrap for testing (all emails go to your test inbox)

**Long-term (Production):**
- Use Gmail (if small scale)
- Use AWS SES (if large scale with many emails)

---

## Testing After Configuration

### Method 1: Via Tinker (Command Line)
```bash
cd backend
php artisan tinker
Mail::raw('Test email from SMTP', function($message) {
    $message->to('your-email@intersmart.in')->subject('Test');
});
```

### Method 2: Via Application
1. Go to https://intersmart-portal.vercel.app/leaves/apply
2. Employee applies for a leave
3. Check if email is received by Team Lead

---

## Common SMTP Issues & Fixes

### Issue 1: "Unauthorized (401)"
**Cause**: Wrong username/password
**Fix**: Double-check credentials with your IT admin

### Issue 2: "Connection refused"
**Cause**: Wrong host or port
**Fix**: Verify with `telnet mail.server.com 587`

### Issue 3: "Timeout error"
**Cause**: Firewall blocking SMTP port
**Fix**: Ask IT to open port 587 or 25

### Issue 4: "Authentication failed"
**Cause**: Server requires different encoding
**Fix**: Try changing MAIL_SCHEME to different values or ask IT

---

## Recommended Settings for Each Option

### Company Mail Server (Recommended)
```env
MAIL_MAILER=smtp
MAIL_HOST=<from-IT-admin>
MAIL_PORT=587
MAIL_USERNAME=noreply@intersmart.in
MAIL_PASSWORD=<from-IT-admin>
MAIL_ENCRYPTION=tls
```

### Gmail (Testing Only)
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=<16-char-app-password>
MAIL_ENCRYPTION=tls
```

### Mailtrap (Testing)
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465
MAIL_USERNAME=<from-mailtrap>
MAIL_PASSWORD=<from-mailtrap>
MAIL_ENCRYPTION=ssl
```

---

## After Setting Up SMTP

The system will automatically:
1. Send leave application emails to Team Leads
2. CC HR and Admin emails
3. Include approval/rejection action buttons
4. Send notifications on approvals/rejections

---

## Quick Start Checklist

- [ ] Decide which SMTP option to use
- [ ] Get the SMTP credentials
- [ ] Update `backend/.env` with SMTP details
- [ ] Test by sending a test email via Tinker
- [ ] Test by applying for a leave in the application
- [ ] Verify email is received by Team Lead
- [ ] Verify approval buttons work in the email

---

## Support

If you have issues:
1. Check `.env` file has correct values (no extra spaces)
2. Run `php artisan config:clear` to clear config cache
3. Check application logs in `backend/storage/logs/`
4. Contact your IT admin if it's a company mail server issue
