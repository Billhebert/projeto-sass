# Email Service Implementation Guide

**Status:** ✅ Complete  
**Date:** February 3, 2024  
**Version:** 1.0.0

---

## Overview

The email service provides a robust, production-ready email sending system for the Vendata application. It handles:

- ✅ Email verification during user registration
- ✅ Password reset emails
- ✅ Welcome emails for new users
- ✅ Generic notification emails
- ✅ Multiple email provider support
- ✅ Automatic retry logic with exponential backoff
- ✅ HTML and plain text templates
- ✅ Test mode for development
- ✅ Comprehensive logging and error handling

---

## Architecture

### Email Service (`backend/services/email.js`)

The `EmailService` class manages all email operations:

```
┌─────────────────────────────────────┐
│   Email Service (Singleton)         │
├─────────────────────────────────────┤
│ • Nodemailer Transporter Setup      │
│ • Template Generation               │
│ • Retry Logic & Error Handling      │
│ • Logging & Monitoring              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   Email Providers                   │
├─────────────────────────────────────┤
│ • SMTP (Custom)                     │
│ • Gmail                             │
│ • SendGrid                          │
│ • Test Mode                         │
└─────────────────────────────────────┘
```

### Integration Points

1. **User Registration** → Email Verification Email
2. **Forgot Password** → Password Reset Email
3. **Resend Verification** → Verification Email
4. **Account Creation** → Welcome Email (optional)

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Email Provider Configuration
EMAIL_PROVIDER=smtp                    # Options: smtp, gmail, sendgrid, test
EMAIL_FROM=noreply@vendata.com.br     # From email address

# SMTP Configuration (if using EMAIL_PROVIDER=smtp)
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_SECURE=false                      # true for port 465, false for 587

# Gmail Configuration (if using EMAIL_PROVIDER=gmail)
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password   # Use App-specific password, not regular password

# SendGrid Configuration (if using EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=your_sendgrid_api_key

# Frontend URLs
FRONTEND_URL=https://vendata.com.br    # Used in email links
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install nodemailer@^6.9.7
```

### 2. Configure Environment

Update your `.env` file with email provider credentials:

#### Option A: SMTP (Recommended for Production)

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_USER=noreply@vendata.com.br
SMTP_PASSWORD=your_secure_password
SMTP_SECURE=false
```

#### Option B: Gmail

```bash
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=noreply@gmail.com
GMAIL_APP_PASSWORD=your_app_specific_password
```

**Important:** Use an [App-Specific Password](https://support.google.com/accounts/answer/185833) for Gmail, not your regular password.

#### Option C: SendGrid

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_api_key
```

#### Option D: Test Mode (Development)

```bash
EMAIL_PROVIDER=test
# Emails will be logged but not sent
```

### 3. Update Auth Routes

The email service is already integrated into:
- `POST /api/auth/register` - Sends verification email
- `POST /api/auth/forgot-password` - Sends reset email
- `POST /api/auth/resend-verification-email` - Resends verification email

---

## API Methods

### Email Service Methods

#### `sendVerificationEmail(email, verificationToken, userName)`

Sends email verification to new user.

```javascript
const emailService = require('../services/email');

await emailService.sendVerificationEmail(
  'user@example.com',
  'verification_token_here',
  'John Doe'
);
```

**Returns:** `{ success: true, messageId: '...' }`

---

#### `sendPasswordResetEmail(email, resetToken, userName)`

Sends password reset email to user.

```javascript
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'reset_token_here',
  'John Doe'
);
```

---

#### `sendWelcomeEmail(email, userName)`

Sends welcome email to new user.

```javascript
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);
```

---

#### `sendNotificationEmail(email, subject, content)`

Sends custom notification email.

```javascript
await emailService.sendNotificationEmail(
  'user@example.com',
  'Your Account Alert',
  '<h1>Alert Message</h1><p>Details...</p>'
);
```

---

#### `sendEmail(mailOptions, retries)`

Core sending function (internal use).

```javascript
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test</p>',
  text: 'Test'
}, 3);  // Retry up to 3 times
```

---

#### `isReady()`

Check if email service is initialized.

```javascript
if (emailService.isReady()) {
  console.log('Email service ready');
}
```

---

#### `getStatus()`

Get email service status information.

```javascript
const status = emailService.getStatus();
// Returns: { initialized: true, provider: 'smtp', from: '...' }
```

---

## Email Templates

### Verification Email

**Subject:** 🔐 Confirme seu email - Vendata

**Features:**
- Personalized greeting
- Verification link button
- Backup link (copy-paste)
- 24-hour expiration notice
- Support contact information
- HTML and plain text versions

**Template Location:** `EmailService.getVerificationEmailTemplate()`

### Password Reset Email

**Subject:** 🔑 Redefinir sua senha - Vendata

**Features:**
- Reset link button
- Backup link (copy-paste)
- 30-minute expiration notice
- Security warning
- Password strength recommendations
- HTML and plain text versions

**Template Location:** `EmailService.getPasswordResetEmailTemplate()`

### Welcome Email

**Subject:** 👋 Bem-vindo ao Vendata!

**Features:**
- Feature highlights list
- Dashboard access button
- Support information
- HTML and plain text versions

**Template Location:** `EmailService.getWelcomeEmailTemplate()`

---

## Retry Logic

The email service implements automatic retry with exponential backoff:

- **First attempt:** Immediate
- **Second attempt:** After 1 second (if first fails)
- **Third attempt:** After 2 seconds (if second fails)
- **Fourth attempt:** After 4 seconds (if third fails)

Maximum 3 retries by default. Configure in method call:

```javascript
await emailService.sendEmail(mailOptions, 5);  // Up to 5 retries
```

---

## Error Handling

### Email Service Won't Initialize

**Symptoms:**
```
Email service initialized in TEST mode. Emails will be logged but not sent.
```

**Solution:**
1. Check `EMAIL_PROVIDER` environment variable
2. Verify credentials for chosen provider
3. Check SMTP/API endpoints are accessible
4. Review logs for specific errors

### Emails Not Sending

**Check:**
1. Email service status: `emailService.getStatus()`
2. Environment variables are correct
3. Provider credentials are valid
4. Network/firewall allows email transmission
5. Check application logs for errors

### Resend Verification Link

**New endpoint available:**
```
POST /api/auth/resend-verification-email
Body: { "email": "user@example.com" }
```

---

## Testing

### Test Mode

For development, use test mode:

```bash
EMAIL_PROVIDER=test
```

Emails are logged but not sent:

```
✓ EMAIL_TEST_MODE
  to: user@example.com
  subject: Verificação de Email...
```

### Manual Testing

#### 1. Send Verification Email

```bash
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 2. Send Password Reset Email

```bash
curl -X POST http://localhost:3011/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com" }'
```

#### 3. Resend Verification Email

```bash
curl -X POST http://localhost:3011/api/auth/resend-verification-email \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com" }'
```

### Check Logs

```bash
docker logs -f projeto-sass-api | grep EMAIL
```

---

## Production Setup

### Recommended Configuration

For production, use a dedicated email service:

#### Option 1: SMTP with Managed Service

Use services like:
- SendGrid SMTP
- Mailgun SMTP
- AWS SES SMTP
- Custom mail server

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

#### Option 2: SendGrid API

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_api_key
```

#### Option 3: AWS SES

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_user
SMTP_PASSWORD=your_ses_password
SMTP_SECURE=false
```

### Email Sender Validation

1. **Verify Domain:**
   - Add SPF record
   - Add DKIM record
   - Add DMARC record

2. **Monitor Deliverability:**
   - Check bounce rates
   - Monitor spam complaints
   - Track delivery metrics

3. **Rate Limiting:**
   - SendGrid: 100 emails/second
   - AWS SES: Start with 1 email/second (request increase)
   - Custom SMTP: Provider-dependent

---

## Monitoring & Logging

### Log Entries

Email service logs all operations:

```
✓ EMAIL_SENT
  messageId: <...>
  to: user@example.com
  subject: Verificação de Email

✓ VERIFICATION_EMAIL_SENT
  email: user@example.com
  userId: uuid

✗ EMAIL_SEND_FAILED_DURING_REGISTER
  email: user@example.com
  error: SMTP connection timeout
```

### Check Service Status

```javascript
const status = emailService.getStatus();
console.log(status);
// Output:
// {
//   initialized: true,
//   provider: 'smtp',
//   from: 'noreply@vendata.com.br'
// }
```

---

## Customization

### Custom Email Template

Create your own template method:

```javascript
// In backend/services/email.js, add:

getCustomTemplate(data) {
  return `
    <html>
      <body>
        <h1>${data.title}</h1>
        <p>${data.content}</p>
      </body>
    </html>
  `;
}
```

Then use:

```javascript
const html = emailService.getCustomTemplate({
  title: 'Custom Title',
  content: 'Custom content'
});

await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom',
  html,
});
```

### Modify Email Content

Edit templates in `backend/services/email.js`:

- `getVerificationEmailTemplate()` - Line ~120
- `getPasswordResetEmailTemplate()` - Line ~180
- `getWelcomeEmailTemplate()` - Line ~240

---

## Troubleshooting

### "SMTP connection timeout"

**Solution:**
- Verify SMTP host is correct
- Check firewall allows port 587/465
- Verify credentials
- Test SMTP manually:

```bash
telnet smtp.example.com 587
```

### "Invalid login credentials"

**Solution:**
- Verify username/password
- For Gmail, ensure using App-Specific Password
- Check SendGrid API key format
- Regenerate credentials if needed

### "Email not received"

**Check:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check server logs for delivery errors
4. Verify SPF/DKIM/DMARC records

### "Service initialized in TEST mode"

**This is normal in development:**
- Set `EMAIL_PROVIDER` in `.env`
- Emails will be logged but not sent
- Check application logs to see what would be sent

---

## Files Modified

```
✅ backend/services/email.js          (NEW - 650 lines)
✅ backend/routes/auth-user.js        (MODIFIED - Added email integration)
✅ backend/package.json               (MODIFIED - Added nodemailer)
```

---

## Next Steps

1. ✅ Email service implemented and documented
2. ⏳ Password reset email sending (DONE - integrated)
3. ⏳ Email verification (DONE - integrated)
4. ⏳ Welcome email on account creation (optional - ready to implement)
5. ⏳ Email notification system (ready - use `sendNotificationEmail()`)
6. ⏳ Email campaign/marketing features (future)

---

## Summary

The email service is **production-ready** and supports:

- ✅ Multiple email providers (SMTP, Gmail, SendGrid)
- ✅ Automatic retry with exponential backoff
- ✅ Professional HTML email templates
- ✅ Comprehensive error handling and logging
- ✅ Test mode for development
- ✅ Integration with authentication flows
- ✅ Easy customization and extension

**Setup Time:** ~5 minutes  
**Maintenance:** Minimal (monitor deliverability metrics)  
**Reliability:** High (with proper provider configuration)

