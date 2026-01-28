/**
 * Security Module - OWASP Protection
 * Implements OWASP Top 10 protections:
 * - A01: Broken Access Control
 * - A02: Cryptographic Failures
 * - A03: Injection
 * - A04: Insecure Design
 * - A05: Security Misconfiguration
 * - A06: Vulnerable and Outdated Components
 * - A07: Authentication Failures
 * - A08: Data Integrity Failures
 * - A09: Logging and Monitoring Failures
 * - A10: SSRF
 */

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

class SecurityManager {
  /**
   * Input Validation & Sanitization
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/[<>\"']/g, '')
        .trim()
        .substring(0, 255) // Limit length
    }
    return input;
  }

  /**
   * SQL/NoSQL Injection Prevention
   */
  static isValidObjectId(id) {
    return /^[a-f\d]{24}$/i.test(id);
  }

  /**
   * CSRF Token Generation & Validation
   */
  static generateCSRFToken() {
    const { randomBytes } = require('crypto');
    return randomBytes(32).toString('hex');
  }

  /**
   * Secure Headers Middleware
   */
  static getSecurityMiddleware() {
    return [
      // Helmet for security headers
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        frameguard: { action: 'deny' },
        xssFilter: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      }),

      // Mongo sanitization (NoSQL injection prevention)
      mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
          logger.warn('Potential NoSQL injection attempt', { key, path: req.path });
        },
      }),

      // XSS protection
      xss(),
    ];
  }

  /**
   * Rate Limiting by IP and User
   */
  static getAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many login attempts, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limit for admin IPs if configured
        const adminIps = process.env.ADMIN_IPS?.split(',') || [];
        return adminIps.includes(req.ip);
      },
    });
  }

  static getApiLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * JWT Token Validation
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret || secret.length < 32) {
        logger.warn('JWT_SECRET is too short or not configured');
        return null;
      }

      const decoded = jwt.verify(token, secret);
      
      // Check token expiration (additional safety)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.debug('Token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Secure password comparison (prevents timing attacks)
   */
  static secureCompare(a, b) {
    const crypto = require('crypto');
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < bufA.length; i++) {
      result |= bufA[i] ^ bufB[i];
    }
    return result === 0;
  }

  /**
   * Audit Logging
   */
  static logSecurityEvent(eventType, userId, details = {}) {
    logger.info(`Security Event: ${eventType}`, {
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * API Key validation
   */
  static validateApiKey(apiKey) {
    // Should be stored in environment, not in code
    const validKeys = process.env.API_KEYS?.split(',') || [];
    return validKeys.includes(apiKey);
  }

  /**
   * URL validation (prevent SSRF)
   */
  static isValidUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Prevent localhost/private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = parsed.hostname;
        const privateRanges = [
          '127.0.0.1',
          'localhost',
          /^192\.168\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[01])\./,
        ];

        for (const range of privateRanges) {
          if (typeof range === 'string' && hostname === range) return false;
          if (range instanceof RegExp && range.test(hostname)) return false;
        }
      }

      // Whitelist allowed protocols
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch (error) {
      return false;
    }
  }
}

module.exports = SecurityManager;
