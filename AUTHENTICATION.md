# User Authentication System

Complete guide to the user authentication system for Projeto SASS Dashboard.

## Features

- User registration with email verification
- Secure login with JWT tokens
- Password reset and change functionality
- Account management (profile, deletion)
- Account lockout protection (after 5 failed attempts)
- Session management
- API key generation and revocation
- Two-factor authentication support
- Role-based access control (RBAC)
- Comprehensive audit logging

## Installation & Setup

### 1. Install Additional Dependencies

The authentication system uses `jsonwebtoken` which is already included. Verify it's installed:

```bash
npm list jsonwebtoken

# If missing:
npm install jsonwebtoken
```

### 2. Configure Environment Variables

Add these to your `backend/.env`:

```env
# JWT Secret (minimum 32 characters)
JWT_SECRET=your_secure_jwt_secret_min_32_characters_long_1234567890

# JWT Expiration
JWT_EXPIRES_IN=24h

# Email Service (for verification and reset emails)
SENDGRID_API_KEY=SG.your_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Or SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Database Initialization

Run database migrations to create the users collection:

```bash
npm run db:migrate

# Or manually:
node backend/db/migrate.js
```

This creates the `users` collection with proper indexes.

## API Endpoints

### Authentication

#### POST `/api/auth/register`

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "status": "active",
      "createdAt": "2024-01-25T10:00:00Z"
    },
    "verificationRequired": true
  }
}
```

---

#### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "lastLogin": "2024-01-25T10:00:00Z",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

---

#### POST `/api/auth/logout`

Logout user and invalidate session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST `/api/auth/verify-email`

Verify email address using verification token (sent via email).

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
}
```

---

#### POST `/api/auth/forgot-password`

Request password reset token (sent via email).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists, password reset instructions have been sent."
}
```

---

#### POST `/api/auth/reset-password/:token`

Reset password using token from email.

**Request:**
```json
{
  "password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

#### POST `/api/auth/change-password`

Change password when logged in.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Profile Management

#### GET `/api/auth/profile`

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "phone": "+55 11 98765-4321",
      "company": "My Company",
      "avatar": "https://...",
      "emailVerified": true,
      "status": "active",
      "preferences": {
        "language": "pt",
        "timezone": "America/Sao_Paulo",
        "notificationsEnabled": true
      },
      "lastLogin": "2024-01-25T10:00:00Z",
      "role": "user",
      "plan": "professional",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

---

#### PUT `/api/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+55 11 98765-4321",
  "company": "My Company",
  "avatar": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { /* updated profile */ }
  }
}
```

---

#### DELETE `/api/auth/account`

Delete (soft-delete) user account.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Integration with Existing Routes

### Step 1: Update `backend/server.js`

Add authentication routes to your Express app:

```javascript
const authUserRoutes = require('./routes/auth-user');

// ... other middleware

// User authentication routes
app.use('/api/auth', authUserRoutes);

// ... other routes
```

### Step 2: Protect Existing Routes

Use the authentication middleware to protect routes:

```javascript
const { authenticateToken, requireRole, requireAdmin } = require('./middleware/auth');

// Protected route - requires authentication
app.get('/api/accounts', authenticateToken, async (req, res) => {
  // User ID available at req.user.userId
  // ...
});

// Protected route - requires admin role
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  // ...
});

// Protected route - multiple roles
const { requireRole } = require('./middleware/auth');
app.get('/api/admin/dashboard', requireRole(['admin', 'moderator']), async (req, res) => {
  // ...
});
```

## Frontend Integration

### Basic Login Example

```javascript
// Send login request
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
  }),
});

const data = await response.json();

if (data.success) {
  // Store token (securely, in httpOnly cookie preferred)
  localStorage.setItem('token', data.data.token);
  
  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

### Using JWT Token in Requests

```javascript
// Get stored token
const token = localStorage.getItem('token');

// Send authenticated request
const response = await fetch('http://localhost:3000/api/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Refresh Token Pattern

For production, implement refresh tokens:

```javascript
// Access token expires in 15 minutes
// Refresh token expires in 7 days

const response = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${refreshToken}`,
  },
});

const data = await response.json();
localStorage.setItem('token', data.data.token);
```

## Security Best Practices

### 1. Store JWT Securely

**NOT RECOMMENDED:**
```javascript
localStorage.setItem('token', token); // Vulnerable to XSS
```

**RECOMMENDED:**
```javascript
// Use httpOnly cookies (server sets cookie)
// Client cannot access via JavaScript
// Protected against XSS attacks
```

### 2. HTTPS Only

Always use HTTPS in production:
```javascript
// Set cookie secure flag in production
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

### 3. Password Requirements

- Minimum 8 characters (enforced)
- Encourage: uppercase, lowercase, numbers, special characters
- Never store plain text passwords
- Use bcrypt with salt rounds 10+

### 4. Rate Limiting

Login attempts are limited to prevent brute force:
```javascript
// 5 failed login attempts → account locked for 30 minutes
// Configurable in auth routes
```

### 5. Email Verification

Email verification token:
- 32 random bytes (hashed with SHA-256)
- Expires in 24 hours
- Invalidated after use

### 6. Password Reset

Password reset token:
- 32 random bytes (hashed with SHA-256)
- Expires in 30 minutes
- Single use only
- Invalidated after successful reset

## Database Schema

The `User` model includes:

```javascript
{
  // Identification
  id: String (UUID),
  email: String (unique, indexed),
  firstName: String,
  lastName: String,

  // Authentication
  password: String (bcrypt hashed),
  emailVerified: Boolean,
  emailVerificationToken: String,
  passwordResetToken: String,
  lastPasswordChange: Date,

  // Security
  status: String (active, inactive, suspended, deleted),
  loginAttempts: Number,
  lockUntil: Date,
  twoFactorEnabled: Boolean,

  // Profile
  avatar: String,
  phone: String,
  company: String,
  preferences: Object,

  // Mercado Livre
  mlAccounts: Array,

  // Metadata
  role: String (user, admin, moderator, viewer),
  plan: String (free, starter, professional, enterprise),
  
  // Timestamps
  createdAt: Date (indexed),
  updatedAt: Date,
  lastLogin: Date,
}
```

## Troubleshooting

### Issue: "Invalid email or password"

Check:
- Email is registered
- Password is correct
- User is not soft-deleted

### Issue: "Account locked"

User exceeded 5 failed login attempts:
```javascript
// Account locked for 30 minutes
// Wait before trying again
```

### Issue: "Email not verified"

User hasn't verified email:
```javascript
// Check email for verification link
// Click link or use verify-email endpoint
```

### Issue: "Invalid or expired token"

JWT token expired or invalid:
```javascript
// Token expires after 24 hours
// Login again to get new token
```

## Advanced Features (Optional)

### Two-Factor Authentication

```javascript
// Enable 2FA
POST /api/auth/2fa/enable

// Verify 2FA code during login
POST /api/auth/2fa/verify

// Backup codes for account recovery
GET /api/auth/2fa/backup-codes
```

### API Keys

```javascript
// Generate API key
POST /api/auth/api-keys

// Revoke API key
DELETE /api/auth/api-keys/:id

// Authenticate with API key
Authorization: ApiKey <api_key>
```

### Session Management

```javascript
// List active sessions
GET /api/auth/sessions

// Revoke specific session
DELETE /api/auth/sessions/:sessionId

// Logout all other devices
POST /api/auth/logout-all
```

## Next Steps

1. **Email Integration**: Set up SendGrid or SMTP for verification/reset emails
2. **OAuth Integration**: Add Google, GitHub OAuth for easier login
3. **Dashboard**: Create admin dashboard for user management
4. **Audit Logs**: Monitor login attempts and security events
5. **Documentation**: Generate API documentation with Swagger/OpenAPI

