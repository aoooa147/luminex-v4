/**
 * Security Threat Detection Utilities
 * Detects SQL injection, XSS, and other security threats
 */

import { logSecurityEvent } from './monitoring';
import { NextRequest } from 'next/server';

/**
 * SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/gi,
  /(['";]|(--|\#|\/\*|\*\/))/g,
  /(\bOR\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/gi,
  /(\bAND\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/gi,
  /(\bOR\s+['"]?1['"]?\s*=\s*['"]?1)/gi,
  /(\bUNION\s+SELECT)/gi,
  /(;\s*(DROP|DELETE|TRUNCATE|ALTER))/gi,
];

/**
 * XSS patterns to detect
 */
const XSS_PATTERNS = [
  /<script[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<img[^>]*onerror/gi,
  /<svg[^>]*onload/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /onclick\s*=/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
];

/**
 * Check if input contains SQL injection patterns
 */
export function detectSQLInjection(input: string | null | undefined): boolean {
  if (!input || typeof input !== 'string') return false;
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if input contains XSS patterns
 */
export function detectXSS(input: string | null | undefined): boolean {
  if (!input || typeof input !== 'string') return false;
  
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check request for security threats and log if detected
 */
export function checkSecurityThreats(
  req: NextRequest,
  data: Record<string, any>,
  options: {
    logEvents?: boolean;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  } = {}
): {
  hasThreat: boolean;
  threats: Array<{ type: 'sql_injection' | 'xss'; field: string; value: string }>;
} {
  const { logEvents = true, severity = 'high' } = options;
  const threats: Array<{ type: 'sql_injection' | 'xss'; field: string; value: string }> = [];
  
  // Check all string fields in data
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Check for SQL injection
      if (detectSQLInjection(value)) {
        threats.push({
          type: 'sql_injection',
          field: key,
          value: value.substring(0, 100), // Limit value length for logging
        });
        
        if (logEvents) {
          logSecurityEvent(
            req,
            'sql_injection',
            severity,
            `SQL injection attempt detected in field: ${key}`,
            {
              field: key,
              endpoint: req.nextUrl.pathname,
              method: req.method,
              payload: value.substring(0, 200), // Limit payload length
            }
          );
        }
      }
      
      // Check for XSS
      if (detectXSS(value)) {
        threats.push({
          type: 'xss',
          field: key,
          value: value.substring(0, 100), // Limit value length for logging
        });
        
        if (logEvents) {
          logSecurityEvent(
            req,
            'xss',
            severity,
            `XSS attempt detected in field: ${key}`,
            {
              field: key,
              endpoint: req.nextUrl.pathname,
              method: req.method,
              payload: value.substring(0, 200), // Limit payload length
            }
          );
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check nested objects
      const nestedThreats = checkSecurityThreats(req, value, { logEvents: false, severity });
      threats.push(...nestedThreats.threats.map(t => ({ ...t, field: `${key}.${t.field}` })));
    }
  }
  
  // Check URL parameters for threats
  const urlParams = req.nextUrl.searchParams;
  for (const [key, value] of urlParams.entries()) {
    if (detectSQLInjection(value)) {
      threats.push({
        type: 'sql_injection',
        field: `query.${key}`,
        value: value.substring(0, 100),
      });
      
      if (logEvents) {
        logSecurityEvent(
          req,
          'sql_injection',
          severity,
          `SQL injection attempt detected in URL parameter: ${key}`,
          {
            field: key,
            endpoint: req.nextUrl.pathname,
            method: req.method,
            payload: value.substring(0, 200),
          }
        );
      }
    }
    
    if (detectXSS(value)) {
      threats.push({
        type: 'xss',
        field: `query.${key}`,
        value: value.substring(0, 100),
      });
      
      if (logEvents) {
        logSecurityEvent(
          req,
          'xss',
          severity,
          `XSS attempt detected in URL parameter: ${key}`,
          {
            field: key,
            endpoint: req.nextUrl.pathname,
            method: req.method,
            payload: value.substring(0, 200),
          }
        );
      }
    }
  }
  
  return {
    hasThreat: threats.length > 0,
    threats,
  };
}

/**
 * Check request URL for security threats
 */
export function checkURLThreats(req: NextRequest): {
  hasThreat: boolean;
  threats: Array<{ type: 'sql_injection' | 'xss'; location: string }>;
} {
  const threats: Array<{ type: 'sql_injection' | 'xss'; location: string }> = [];
  const url = req.nextUrl.pathname + req.nextUrl.search;
  
  if (detectSQLInjection(url)) {
    threats.push({
      type: 'sql_injection',
      location: 'url',
    });
    
    logSecurityEvent(
      req,
      'sql_injection',
      'high',
      'SQL injection attempt detected in URL',
      {
        endpoint: req.nextUrl.pathname,
        method: req.method,
        url: url.substring(0, 200),
      }
    );
  }
  
  if (detectXSS(url)) {
    threats.push({
      type: 'xss',
      location: 'url',
    });
    
    logSecurityEvent(
      req,
      'xss',
      'high',
      'XSS attempt detected in URL',
      {
        endpoint: req.nextUrl.pathname,
        method: req.method,
        url: url.substring(0, 200),
      }
    );
  }
  
  return {
    hasThreat: threats.length > 0,
    threats,
  };
}

/**
 * Check for suspicious request patterns
 */
export function detectSuspiciousActivity(req: NextRequest): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Check for suspicious user agents
  const userAgent = req.headers.get('user-agent') || '';
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or suspicious user agent');
  }
  
  // Check for suspicious headers
  const headers = req.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.split(',').length > 5) {
    reasons.push('Too many proxy hops');
  }
  
  // Check for SQL injection patterns in URL
  const url = req.nextUrl.pathname + req.nextUrl.search;
  if (detectSQLInjection(url)) {
    reasons.push('SQL injection pattern detected in URL');
  }
  
  // Check for XSS patterns in URL
  if (detectXSS(url)) {
    reasons.push('XSS pattern detected in URL');
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
