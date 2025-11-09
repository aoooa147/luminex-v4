# Security Implementation Guide

## Overview

This document describes the security features implemented in the Luminex application, including input validation, output encoding, CSRF protection, security headers, and security monitoring.

## Security Features

### 1. Input Validation and Sanitization

#### Location: `lib/security/sanitization.ts`

The application includes comprehensive input sanitization utilities:

- **`sanitizeString()`**: Removes dangerous characters and prevents XSS attacks
- **`sanitizeHTML()`**: Aggressively removes HTML tags and scripts
- **`sanitizeNumber()`**: Validates and sanitizes numeric inputs
- **`sanitizeAddress()`**: Validates Ethereum wallet addresses
- **`sanitizeURL()`**: Validates and sanitizes URLs
- **`sanitizeObject()`**: Recursively sanitizes objects
- **`sanitizeSQL()`**: Basic SQL injection prevention (always use parameterized queries with Prisma)

#### Usage Example:

```typescript
import { sanitizeString, sanitizeAddress } from '@/lib/security/sanitization';

// Sanitize user input
const cleanInput = sanitizeString(userInput, 1000);

// Validate wallet address
const address = sanitizeAddress(userAddress);
if (!address) {
  return createErrorResponse('Invalid address format', 'INVALID_ADDRESS', 400);
}
```

### 2. Output Encoding

#### Location: `lib/security/sanitization.ts`

Output encoding utilities prevent XSS attacks when rendering user data:

- **`encodeHTML()`**: HTML entity encoding
- **`encodeJS()`**: JavaScript string encoding
- **`encodeURL()`**: URL encoding

#### Usage Example:

```typescript
import { encodeHTML, encodeJS } from '@/lib/security/sanitization';

// Encode HTML output
const safeHTML = encodeHTML(userContent);

// Encode JavaScript output
const safeJS = encodeJS(userString);
```

### 3. CSRF Protection

#### Location: `lib/security/csrf.ts`

CSRF protection is implemented using token-based validation:

- **Token Generation**: Secure random tokens using `crypto.getRandomValues()`
- **Token Validation**: Constant-time comparison to prevent timing attacks
- **API Endpoint**: `/api/csrf-token` for token generation

#### Usage Example:

```typescript
import { requireCSRFToken } from '@/lib/security/csrf';

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Validate CSRF token
  const csrfCheck = requireCSRFToken(req);
  if (!csrfCheck.valid) {
    return createErrorResponse(csrfCheck.error || 'Invalid CSRF token', 'CSRF_TOKEN_INVALID', 403);
  }
  
  // Continue with request processing
  // ...
});
```

#### Client-Side Usage:

```typescript
// Fetch CSRF token
const response = await fetch('/api/csrf-token');
const { token } = await response.json();

// Include token in request headers
fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': token,
  },
  body: JSON.stringify({ data: '...' }),
});
```

### 4. Security Headers

#### Location: `next.config.js`

Security headers are configured globally:

- **Content-Security-Policy (CSP)**: Restricts resource loading
- **Strict-Transport-Security (HSTS)**: Forces HTTPS in production
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables XSS filtering
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

### 5. Security Monitoring

#### Location: `lib/security/monitoring.ts`

Security event monitoring and logging:

- **Event Logging**: Tracks security events (SQL injection, XSS, CSRF, rate limits, etc.)
- **IP Flagging**: Identifies suspicious IP addresses
- **Statistics API**: `/api/security/stats` for security statistics
- **Integration**: Integrates with logger and external monitoring services

#### Usage Example:

```typescript
import { logSecurityEvent } from '@/lib/security/monitoring';

// Log security event
logSecurityEvent(req, 'sql_injection', 'high', 'SQL injection attempt detected', {
  payload: userInput,
  endpoint: req.nextUrl.pathname,
});
```

### 6. Security Middleware

#### Location: `lib/security/middleware.ts`

Security middleware for API routes:

- **CSRF Protection**: Optional CSRF token validation
- **Input Sanitization**: Automatic input sanitization
- **Body Size Limits**: Prevents large payload attacks
- **Method Validation**: Restricts allowed HTTP methods
- **Suspicious Activity Detection**: Detects suspicious request patterns

#### Usage Example:

```typescript
import { withSecurity } from '@/lib/security/middleware';

export const POST = withSecurity(
  async (req: NextRequest) => {
    // Your handler logic
  },
  {
    requireCSRF: true,
    sanitizeInput: true,
    maxBodySize: 1024 * 1024, // 1MB
    allowedMethods: ['POST'],
  }
);
```

## Security Tests

### Location: `app/api/__tests__/security/`

Comprehensive security tests:

1. **SQL Injection Tests** (`sql-injection.test.ts`): Tests for SQL injection prevention
2. **XSS Tests** (`xss.test.ts`): Tests for XSS prevention
3. **CSRF Tests** (`csrf.test.ts`): Tests for CSRF protection
4. **Rate Limit Bypass Tests** (`rate-limit-bypass.test.ts`): Tests for rate limit enforcement
5. **Authentication Tests** (`authentication.test.ts`): Tests for authentication and authorization

### Running Security Tests:

```bash
# Run all security tests
npm test -- app/api/__tests__/security

# Run specific test
npm test -- app/api/__tests__/security/sql-injection.test.ts
```

## Best Practices

### 1. Always Validate Input

```typescript
// ❌ Bad: No validation
const userInput = req.body.input;

// ✅ Good: Validate and sanitize
const userInput = sanitizeString(req.body.input, 1000);
if (!userInput) {
  return createErrorResponse('Invalid input', 'INVALID_INPUT', 400);
}
```

### 2. Use Parameterized Queries

```typescript
// ❌ Bad: SQL injection risk
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good: Use Prisma (parameterized queries)
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### 3. Encode Output

```typescript
// ❌ Bad: XSS risk
<div>{userContent}</div>

// ✅ Good: Encode output
<div>{encodeHTML(userContent)}</div>
```

### 4. Use CSRF Protection for State-Changing Operations

```typescript
// ✅ Good: Require CSRF token for POST/PUT/DELETE
export const POST = withSecurity(
  async (req: NextRequest) => {
    // Handler logic
  },
  { requireCSRF: true }
);
```

### 5. Log Security Events

```typescript
// ✅ Good: Log security events
if (detectedAttack) {
  logSecurityEvent(req, 'sql_injection', 'high', 'SQL injection attempt', {
    payload: userInput,
  });
  return createErrorResponse('Invalid input', 'INVALID_INPUT', 400);
}
```

## Security Checklist

- [x] Input validation and sanitization
- [x] Output encoding
- [x] CSRF protection
- [x] Security headers
- [x] Rate limiting
- [x] Security monitoring
- [x] SQL injection prevention
- [x] XSS prevention
- [x] Authentication and authorization
- [x] Security tests

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

