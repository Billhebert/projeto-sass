# 🔒 Projeto SASS - Security Documentation

## Security Overview

This document outlines the security measures implemented in Projeto SASS to protect against OWASP Top 10 vulnerabilities and industry best practices.

## OWASP Top 10 Protections

### A01: Broken Access Control
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC) in routes
- ✅ User verification on sensitive operations
- ✅ Audit logging of access attempts

### A02: Cryptographic Failures
- ✅ Bcrypt for password hashing (salt rounds: 12)
- ✅ JWT with HS256 algorithm
- ✅ HTTPS enforced in production
- ✅ Sensitive fields redacted in logs

### A03: Injection
- ✅ MongoDB sanitization (express-mongo-sanitize)
- ✅ XSS protection (xss-clean)
- ✅ Input validation and sanitization
- ✅ Parameterized queries (Mongoose)

### A04: Insecure Design
- ✅ Secure by default configuration
- ✅ Rate limiting on all endpoints
- ✅ CSRF protection ready
- ✅ Input validation before processing

### A05: Security Misconfiguration
- ✅ Security headers via Helmet.js
- ✅ CSP (Content Security Policy) configured
- ✅ CORS properly configured
- ✅ HSTS enabled in production
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff

### A06: Vulnerable and Outdated Components
- ✅ Dependencies regularly updated
- ✅ NPM audit checks in CI/CD
- ✅ Snyk security scanning
- ✅ Known vulnerabilities monitoring

### A07: Authentication Failures
- ✅ Strong password requirements
- ✅ Rate limiting on login (5 attempts / 15 min)
- ✅ JWT token expiration (24 hours)
- ✅ Secure token refresh mechanism
- ✅ Password validation regex

### A08: Data Integrity Failures
- ✅ Database transaction support
- ✅ Data validation on all inputs
- ✅ Version control for sensitive data
- ✅ Audit logs for modifications

### A09: Logging and Monitoring Failures
- ✅ Structured logging with Pino
- ✅ Security event tracking
- ✅ Health checks (/health endpoint)
- ✅ Metrics collection (/metrics endpoint)
- ✅ Request/response logging

### A10: Server-Side Request Forgery (SSRF)
- ✅ URL validation before processing
- ✅ Private IP range blocking in production
- ✅ Whitelist of allowed protocols (http/https)

## Security Configuration

### Environment Variables

```bash
# MUST be configured in production
JWT_SECRET=<min-32-character-random-string>
NODE_ENV=production

# Optional but recommended
VERIFY_SIGNATURES=true
SKIP_EMAIL_VERIFICATION=false
VERBOSE_LOGGING=false
SENTRY_DSN=<sentry-dsn>
ADMIN_IPS=<comma-separated-ips>
API_KEYS=<comma-separated-api-keys>
```

### Security Headers

All requests include:
- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Strict-Transport-Security`: HTTPS enforcement
- `Referrer-Policy`: Controls referrer information

### Rate Limiting

```
Authentication: 5 requests per 15 minutes (per IP)
API Endpoints: 100 requests per 15 minutes (per IP)
```

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

## Best Practices

### For Developers

1. **Never commit secrets**
   ```bash
   # Use .env.example for template
   # Add .env to .gitignore
   ```

2. **Validate all inputs**
   ```javascript
   const SecurityManager = require('./security');
   
   if (!SecurityManager.validateEmail(email)) {
     throw new Error('Invalid email');
   }
   ```

3. **Use parameterized queries**
   ```javascript
   // ✅ Good - uses Mongoose schema
   User.findById(userId);
   
   // ❌ Bad - direct string concatenation
   User.findOne({ $where: `this._id == ${userId}` });
   ```

4. **Log security events**
   ```javascript
   SecurityManager.logSecurityEvent('login_failed', userId, {
     reason: 'Invalid password',
     ipAddress: req.ip,
   });
   ```

### For DevOps

1. **Environment Configuration**
   - Store secrets in AWS Secrets Manager, Vault, or similar
   - Never use .env files in production
   - Rotate secrets regularly

2. **HTTPS/SSL**
   - Use valid certificates (not self-signed)
   - Enable HSTS preloading
   - Keep certificates renewed

3. **Monitoring**
   - Monitor `/health` endpoint (every 30 seconds)
   - Track `/metrics` for anomalies
   - Set up alerts for high error rates

4. **Database**
   - Enable MongoDB authentication
   - Use network segmentation
   - Enable MongoDB encryption at rest
   - Regular backups to secure storage

5. **Docker**
   - Use non-root user
   - Scan images for vulnerabilities
   - Don't store secrets in images

## Testing Security

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Metrics
curl http://localhost:3000/metrics

# API Documentation
curl http://localhost:3000/api-docs

# Invalid token
curl -H "Authorization: Bearer invalid" http://localhost:3000/api/accounts
```

### Automated Testing

```bash
# Run npm audit
npm audit

# Run Snyk scan
npx snyk test

# OWASP dependency check
npx audit-ci --moderate
```

## Incident Response

### If a Security Issue is Found

1. **Do NOT** commit or push the issue
2. Create a private security advisory
3. Contact the security team immediately
4. Follow responsible disclosure timeline
5. Document and review the incident

### Reporting Security Issues

Email: security@projeto-sass.com

Please include:
- Description of the vulnerability
- Affected component/endpoint
- Reproduction steps
- Potential impact

## Compliance

### GDPR
- ✅ Data processing agreements in place
- ✅ User consent collection
- ✅ Data deletion capability
- ✅ Privacy policy updated

### OWASP
- ✅ OWASP Top 10 protections implemented
- ✅ Regular security assessments
- ✅ Dependency vulnerability scanning

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

## Last Updated

January 2025

## Review Schedule

Security review should be conducted:
- Every 3 months
- Before major releases
- When new dependencies are added
- When security advisories are published
