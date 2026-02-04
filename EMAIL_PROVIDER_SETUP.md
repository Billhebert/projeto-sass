# Email Provider Integration Guide

This guide explains how to configure email providers for the Projeto SASS production environment.

## Current Status

**Email Mode**: `test` (emails logged but not sent)

This is perfect for development and testing. When ready for production, switch to a real email provider.

---

## Option 1: Gmail (Recommended for Small/Medium Projects)

### Prerequisites

- Google Account
- Gmail enabled on your account

### Setup Steps

#### Step 1: Enable 2-Factor Authentication (Required)

1. Go to https://myaccount.google.com
2. Click "Security" in the left menu
3. Enable "2-Step Verification"

#### Step 2: Create an App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Windows Computer" (or your device)
4. Click "Generate"
5. Copy the 16-character password provided

#### Step 3: Update .env.production

```bash
EMAIL_MODE=gmail
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=seu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=seu-email@gmail.com
EMAIL_FROM_NAME=Projeto SASS
```

#### Step 4: Restart API

```bash
docker compose restart api
```

### Testing

```bash
curl -X POST http://localhost:3011/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

The user should receive a verification email.

### Limits

- Sending limit: 500 emails/day for personal accounts
- Perfect for development and small-scale deployments

---

## Option 2: SendGrid (Best for Production)

### Prerequisites

- SendGrid Account (https://sendgrid.com)
- Free tier: 100 emails/day
- Paid plans: Up to 100K+ emails/month

### Setup Steps

#### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free account
3. Verify your email

#### Step 2: Get API Key

1. In SendGrid Dashboard, go to "Settings" → "API Keys"
2. Click "Create API Key"
3. Name it "Projeto SASS Production"
4. Select "Restricted Access"
5. Enable only: Mail Send
6. Click "Create & View"
7. Copy the API key (you won't see it again)

#### Step 3: Verify Sender Email

1. Go to "Settings" → "Sender Authentication"
2. Click "Verify a Single Sender"
3. Add your email address
4. Verify the email by clicking the link SendGrid sends

#### Step 4: Update .env.production

```bash
EMAIL_MODE=sendgrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx_xxxxxxxxxxxxxx
EMAIL_FROM=seu-email@vendata.com.br
EMAIL_FROM_NAME=Projeto SASS
```

#### Step 5: Restart API

```bash
docker compose restart api
```

### Testing

```bash
curl -X POST http://localhost:3011/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Monitoring

- Check SendGrid Dashboard for delivery status
- Setup webhook notifications (optional)
- Track bounce rates and complaints

---

## Option 3: AWS SES (For High Volume)

### Prerequisites

- AWS Account
- Verified email address in AWS SES
- Access Key and Secret Key

### Setup Steps

#### Step 1: Verify Email in AWS SES

1. Go to AWS Console → SES
2. In "Verified identities", add your email
3. Verify by clicking the confirmation link in email

#### Step 2: Request Production Access (if using free tier)

1. In SES Console, click "Send Limits"
2. Click "Edit your sending limits"
3. Request production access
4. Provide use case details

#### Step 3: Create IAM User (Recommended)

1. Go to IAM Dashboard
2. Create new user "projeto-sass-ses"
3. Attach policy: `AmazonSESFullAccess`
4. Create Access Keys
5. Copy Access Key ID and Secret Access Key

#### Step 4: Update .env.production

```bash
EMAIL_MODE=ses
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
EMAIL_FROM=seu-email@vendata.com.br
EMAIL_FROM_NAME=Projeto SASS
```

#### Step 5: Restart API

```bash
docker compose restart api
```

### Monitoring

- Check AWS SES Dashboard for bounce rates
- Setup SNS for delivery notifications
- Track complaint and rejection rates

---

## Testing Email Configuration

### Test Script

```bash
#!/bin/bash

# Register a test user
TIMESTAMP=$(date +%s)
EMAIL="test${TIMESTAMP}@example.com"

response=$(curl -s -X POST http://localhost:3011/api/user/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "Response: $response"

# Check API logs for email sending
docker compose logs api | grep -i "email\|verification" | tail -20
```

### What to Look For

- Email is sent successfully
- No errors in API logs
- User receives email (check spam folder)
- Email contains valid verification link

---

## Troubleshooting

### "Email service not initialized"

- Ensure EMAIL_PROVIDER is set in .env.production
- Check API logs: `docker compose logs api | grep -i email`
- Verify credentials are correct

### "Invalid credentials"

- Gmail: Ensure you used App Password, not regular password
- SendGrid: Double-check API key (no spaces)
- AWS SES: Verify Access Key ID and Secret Key

### "Email bounced"

- Check sender email is verified
- Verify domain ownership (for custom domains)
- Check DKIM/SPF records

### "User not receiving emails"

- Check spam/promotions folder
- Verify email address is correct
- Check provider bounce/complaint rates
- Test with a different email address

---

## Production Recommendations

### For Small Projects (< 1000 users)

**Use**: Gmail

- Free, easy to set up
- Good for development and testing
- Limited to 500/day for free accounts

### For Medium Projects (1K - 10K users)

**Use**: SendGrid Free or Pro

- Reliable delivery
- Good infrastructure
- 100/day free, paid plans available
- Excellent customer support

### For Large Projects (10K+ users)

**Use**: AWS SES

- Best pricing at scale
- High volume support
- Enterprise features
- Requires more setup

---

## Email Template Configuration

All email templates are in `/backend/services/email.js`.

### Customizing Templates

Edit the email templates in the email service:

```javascript
// Example: Verification Email Template
const verificationTemplate = {
  subject: "Verify Your Email",
  html: `
    <h1>Welcome to Projeto SASS!</h1>
    <p>Click the link below to verify your email:</p>
    <a href="${verificationLink}">Verify Email</a>
  `,
};
```

Restart API after changes:

```bash
docker compose restart api
```

---

## Email Logs

### View Email Logs (TEST mode)

```bash
# All email-related logs
docker compose logs api | grep -i email

# Specific user verification emails
docker compose logs api | grep "VERIFICATION_EMAIL_FAILED"
```

### Production Monitoring

**Gmail**:

- Check GMail Activity Log
- Monitor sending quota

**SendGrid**:

- Dashboard → Activity
- Setup alerts for bounces/complaints

**AWS SES**:

- CloudWatch Metrics
- SNS notifications

---

## Next Steps

1. Choose an email provider
2. Update `.env.production` with credentials
3. Test email sending
4. Monitor delivery rates
5. Setup alerts for failures
6. Configure bounce/complaint handling

---

## Support

For issues:

1. Check API logs: `docker compose logs api -f`
2. Verify credentials
3. Test with curl command
4. Check email provider dashboard
5. Review troubleshooting section above
