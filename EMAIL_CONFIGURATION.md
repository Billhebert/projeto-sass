# Email Configuration - Environment Variables

**Date:** February 3, 2024  
**Status:** ✅ Ready for Configuration

---

## Quick Setup

### For Development (Test Mode)

```bash
# .env file - Test mode (emails logged, not sent)
EMAIL_PROVIDER=test
EMAIL_FROM=noreply@vendata.com.br
FRONTEND_URL=https://vendata.com.br
```

### For Production (SMTP)

```bash
# .env file - Production SMTP
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@vendata.com.br
SMTP_HOST=your-mail-server.com
SMTP_PORT=587
SMTP_USER=noreply@vendata.com.br
SMTP_PASSWORD=your_secure_password
SMTP_SECURE=false
FRONTEND_URL=https://vendata.com.br
```

---

## Environment Variables Reference

### Core Email Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | `test` | Email provider: `smtp`, `gmail`, `sendgrid`, or `test` |
| `EMAIL_FROM` | No | `noreply@vendata.com.br` | Email address emails are sent from |
| `FRONTEND_URL` | Yes | None | Frontend base URL for email links |

### SMTP Configuration (EMAIL_PROVIDER=smtp)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes | None | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | Yes | None | SMTP authentication username |
| `SMTP_PASSWORD` | Yes | None | SMTP authentication password |
| `SMTP_SECURE` | No | `false` | Use SSL/TLS (true for 465, false for 587) |

### Gmail Configuration (EMAIL_PROVIDER=gmail)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GMAIL_ADDRESS` | Yes | None | Gmail email address |
| `GMAIL_APP_PASSWORD` | Yes | None | Gmail App-Specific Password (16 characters) |

⚠️ **Important:** Use [App-Specific Password](https://support.google.com/accounts/answer/185833), NOT your regular Gmail password.

### SendGrid Configuration (EMAIL_PROVIDER=sendgrid)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | Yes | None | SendGrid API key |

---

## Configuration Examples

### Example 1: Development Environment

**File:** `backend/.env.example`

```bash
# Development - Test Mode
NODE_ENV=development
EMAIL_PROVIDER=test
EMAIL_FROM=noreply@vendata.com.br
FRONTEND_URL=http://localhost:5173

# Emails will be logged to console but not sent
# Check logs to see what emails would be sent
```

### Example 2: SMTP (Recommended for Production)

**File:** `backend/.env`

```bash
# Production - SMTP Provider
NODE_ENV=production
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@vendata.com.br
SMTP_HOST=mail.vendata.com.br
SMTP_PORT=587
SMTP_USER=noreply@vendata.com.br
SMTP_PASSWORD=your_very_secure_password_here
SMTP_SECURE=false
FRONTEND_URL=https://vendata.com.br
```

### Example 3: SendGrid

**File:** `backend/.env`

```bash
# Production - SendGrid
NODE_ENV=production
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@vendata.com.br
SENDGRID_API_KEY=SG.your_api_key_here
FRONTEND_URL=https://vendata.com.br
```

### Example 4: Gmail

**File:** `backend/.env`

```bash
# Gmail Configuration
NODE_ENV=production
EMAIL_PROVIDER=gmail
EMAIL_FROM=noreply@gmail.com
GMAIL_ADDRESS=noreply@gmail.com
GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd
FRONTEND_URL=https://vendata.com.br

# GMAIL_APP_PASSWORD should be 16 characters (with spaces)
# Generated from Google Account Security settings
```

---

## Provider Selection Guide

### Use Test Mode If:
- 🔧 Developing locally
- 🧪 Testing authentication flows
- ❌ Email credentials not ready
- 📝 Want to see emails in logs only

**Setup Time:** Instant  
**Cost:** Free  
**Emails Sent:** No (logged only)

```bash
EMAIL_PROVIDER=test
```

---

### Use SMTP If:
- 🏢 Have corporate email server
- 📧 Using custom domain email
- 💰 Want cost control
- 🔒 Security/compliance requirements

**Setup Time:** 15 minutes (get credentials from IT)  
**Cost:** Usually included with hosting/domain  
**Emails Sent:** Yes (production-ready)

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
SMTP_SECURE=false
```

**Popular SMTP Providers:**
- Hostgator, Bluehost, GoDaddy (included with hosting)
- cPanel, Plesk (corporate/VPS)
- AWS SES (enterprise)

---

### Use SendGrid If:
- 📤 Need high volume (100+ emails/day)
- 📊 Want delivery analytics
- 🌍 Global delivery optimization
- 💳 Pay-as-you-go pricing

**Setup Time:** 10 minutes (get API key)  
**Cost:** Free tier (100 emails/day), paid plans start $9.95/month  
**Emails Sent:** Yes (production-ready)

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_key_here
```

[SendGrid Signup](https://sendgrid.com/)

---

### Use Gmail If:
- 🔍 Testing with real email provider
- 📧 Using Gmail business account
- ⚡ Quick setup (10 minutes)
- ⚠️ NOT recommended for production (rate-limited)

**Setup Time:** 10 minutes (generate App Password)  
**Cost:** Free (with Gmail account)  
**Emails Sent:** Yes (limited volume)

```bash
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd
```

**Limitations:**
- Limited sending rate (24 emails/day per account)
- Not suitable for production
- Can be suspended for spam

---

## Setup Instructions by Provider

### SMTP Setup

**Step 1:** Get SMTP credentials from your email provider
- Contact your hosting provider or IT department
- Usually found in control panel (cPanel, Plesk, etc.)

**Step 2:** Add to `.env` file

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587                          # or 465 for SSL
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=YourPassword123
SMTP_SECURE=false                      # false for 587, true for 465
```

**Step 3:** Test connection

```bash
npm install  # Install nodemailer if not already installed
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'mail.yourdomain.com',
  port: 587,
  secure: false,
  auth: { user: 'noreply@yourdomain.com', pass: 'YourPassword123' }
});
transporter.verify((error, success) => {
  if (error) console.error('Error:', error);
  else console.log('SMTP OK:', success);
});
"
```

---

### SendGrid Setup

**Step 1:** Create SendGrid Account
- Go to [SendGrid.com](https://sendgrid.com/)
- Sign up for free account
- Verify sender email address

**Step 2:** Generate API Key
- Dashboard → Settings → API Keys
- Create new key with "Mail Send" permission
- Copy the key (you won't see it again!)

**Step 3:** Add to `.env` file

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

**Step 4:** Verify sender domain (optional but recommended)
- In SendGrid Dashboard: Settings → Sender Authentication
- Follow domain verification steps for better deliverability

---

### Gmail Setup

**⚠️ WARNING:** Only for testing, not production!

**Step 1:** Enable 2-Factor Authentication
- Go to [myaccount.google.com](https://myaccount.google.com/)
- Security → 2-Step Verification
- Complete setup

**Step 2:** Generate App Password
- Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Select "Mail" and "Windows Computer"
- Google generates 16-character password
- Copy it (format: `aaaa bbbb cccc dddd`)

**Step 3:** Add to `.env` file

```bash
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd
EMAIL_FROM=your-email@gmail.com
```

**Step 4:** Test by sending verification email
- Use `/api/auth/register` endpoint
- Check email inbox for verification message

---

## Verification Checklist

### Before Going to Production

- [ ] Email provider configured in `.env`
- [ ] `FRONTEND_URL` is correct (used in email links)
- [ ] `EMAIL_FROM` is set to a valid sender email
- [ ] Email sending tested with `/api/auth/register`
- [ ] Verification emails received in test inbox
- [ ] Password reset emails received
- [ ] No credentials committed to git (verify `.env` in `.gitignore`)

### Email Links Testing

1. Register user: `POST /api/auth/register`
2. Check email for verification link
3. Click link - should verify email
4. Try to login - should work now

---

## Common Issues & Solutions

### Issue: "Email service initialized in TEST mode"

**Cause:** `EMAIL_PROVIDER=test` in `.env`

**Solution:**
- Change to your actual provider (smtp, gmail, sendgrid)
- Or use test mode intentionally for development

```bash
EMAIL_PROVIDER=smtp  # Instead of 'test'
```

---

### Issue: "SMTP connection timeout"

**Cause:**
- Wrong host/port
- Firewall blocking port
- Wrong credentials

**Solution:**
1. Test SMTP manually:
```bash
telnet mail.yourdomain.com 587
```

2. Verify credentials with provider
3. Check firewall allows outbound port 587/465
4. Try different port (465 with SMTP_SECURE=true)

---

### Issue: "Invalid login credentials"

**Cause:**
- Wrong SMTP user/password
- Gmail not using App Password
- Credentials have special characters (need escaping)

**Solution:**
1. Reset password at email provider
2. For Gmail: regenerate App Password
3. For SMTP: ensure no special characters (or escape them)

---

### Issue: "Emails not received"

**Check:**
1. Check spam/junk folder
2. Verify recipient email is correct
3. Check application logs for errors:
```bash
docker logs -f projeto-sass-api | grep EMAIL
```

4. Verify DKIM/SPF records (for custom domain)

---

## Email Link Format

Emails include links back to your application. These links use `FRONTEND_URL`:

**Verification Email Link:**
```
https://vendata.com.br/verify-email/[token]
```

**Password Reset Link:**
```
https://vendata.com.br/reset-password/[token]
```

Make sure `FRONTEND_URL` is:
- ✅ Accessible from outside (not localhost)
- ✅ Uses HTTPS in production
- ✅ Matches your actual frontend URL
- ✅ Does NOT include trailing slash

**Example .env:**
```bash
FRONTEND_URL=https://vendata.com.br        # Correct
FRONTEND_URL=https://vendata.com.br/       # Wrong (trailing slash)
FRONTEND_URL=http://localhost:5173         # OK for development
```

---

## Environment File Template

Save this as `backend/.env.example` for your team:

```bash
# ============================================
# EMAIL CONFIGURATION
# ============================================

# Email Provider: test, smtp, gmail, sendgrid
EMAIL_PROVIDER=test

# Sender Email Address
EMAIL_FROM=noreply@vendata.com.br

# SMTP Configuration (if using EMAIL_PROVIDER=smtp)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your_password_here
SMTP_SECURE=false

# Gmail Configuration (if using EMAIL_PROVIDER=gmail)
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd

# SendGrid Configuration (if using EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=SG.your_api_key_here

# Frontend URL (for email links)
FRONTEND_URL=https://vendata.com.br

# Other Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=3011
```

---

## Production Checklist

**Before deploying to production:**

- [ ] Email provider configured (not `test` mode)
- [ ] Credentials stored securely (in `.env`, not in code)
- [ ] `.env` file is in `.gitignore`
- [ ] FRONTEND_URL uses HTTPS
- [ ] FRONTEND_URL is your actual domain
- [ ] Sender verification completed with provider
- [ ] SPF/DKIM/DMARC records configured (for custom domain)
- [ ] Tested email sending via API
- [ ] Verified emails delivered to inbox (not spam)
- [ ] Rate limiting appropriate for provider
- [ ] Backup email provider configured (optional)
- [ ] Monitoring/alerts set up for delivery issues

---

## Summary

| Aspect | Details |
|--------|---------|
| **Status** | ✅ Ready to configure |
| **Setup Time** | 5-15 minutes |
| **Required** | Yes (for auth emails) |
| **Recommended Provider** | SMTP or SendGrid |
| **Development Mode** | Use `EMAIL_PROVIDER=test` |
| **Production Mode** | Use `EMAIL_PROVIDER=smtp` |

Next: Configure your chosen email provider and update `.env` file.

