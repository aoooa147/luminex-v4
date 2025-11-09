/**
 * Security Monitoring Utilities
 * Logs and monitors security events
 */

import { logger } from '@/lib/utils/logger';
import { NextRequest } from 'next/server';

export interface SecurityEvent {
  type: 'sql_injection' | 'xss' | 'csrf' | 'rate_limit' | 'unauthorized' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to in-memory store
    this.events.push(securityEvent);
    
    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to logger based on severity
    const logData = {
      type: event.type,
      severity: event.severity,
      message: event.message,
      details: event.details,
      ip: event.ip,
      userAgent: event.userAgent,
      path: event.path,
      method: event.method,
    };

    switch (event.severity) {
      case 'critical':
      case 'high':
        logger.error(`Security Event: ${event.type}`, logData, 'security');
        break;
      case 'medium':
        logger.warn(`Security Event: ${event.type}`, logData, 'security');
        break;
      case 'low':
        logger.info(`Security Event: ${event.type}`, logData, 'security');
        break;
    }

    // Send to external monitoring for high/critical severity events
    if ((event.severity === 'critical' || event.severity === 'high') && process.env.NODE_ENV === 'production') {
      this.sendToExternalMonitoring(securityEvent);
    }
  }

  /**
   * Send critical events to external monitoring (Sentry)
   */
  private sendToExternalMonitoring(event: SecurityEvent): void {
    // Server-side only
    if (typeof window === 'undefined') {
      try {
        // Send to Sentry if available
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          try {
            const Sentry = require('@sentry/nextjs');
            Sentry.captureMessage(`Security Event: ${event.type}`, {
              level: event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warning',
              tags: {
                security_event: true,
                event_type: event.type,
                severity: event.severity,
              },
              extra: {
                message: event.message,
                details: event.details,
                ip: event.ip,
                userAgent: event.userAgent,
                path: event.path,
                method: event.method,
                timestamp: event.timestamp.toISOString(),
              },
            });
          } catch (sentryError) {
            // Sentry not available or error - silent failure
          }
        }
        // You could also send to Datadog, etc. here
      } catch (error) {
        // Silent failure - don't break the app if monitoring fails
      }
    }
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  /**
   * Clear all events (useful for testing)
   */
  clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance
export const securityMonitor = new SecurityMonitor();

/**
 * Helper function to log security events from API routes
 */
export function logSecurityEvent(
  req: NextRequest,
  type: SecurityEvent['type'],
  severity: SecurityEvent['severity'],
  message: string,
  details?: Record<string, any>
): void {
  securityMonitor.logEvent({
    type,
    severity,
    message,
    details,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || undefined,
    path: req.nextUrl.pathname,
    method: req.method,
  });
}

/**
 * Check if an IP address has too many security events
 */
export function isIPFlagged(ip: string, timeWindowMs: number = 60 * 60 * 1000): boolean {
  const events = securityMonitor.getRecentEvents(1000);
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindowMs);

  const recentEvents = events.filter(event => {
    if (event.ip !== ip) return false;
    return event.timestamp >= windowStart;
  });

  // Flag IP if it has more than 10 security events in the time window
  return recentEvents.length > 10;
}

/**
 * Get security statistics
 */
export function getSecurityStats(): {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentCriticalEvents: number;
} {
  const events = securityMonitor.getRecentEvents(1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = {};
  let recentCriticalEvents = 0;

  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

    if (event.severity === 'critical' && event.timestamp >= oneHourAgo) {
      recentCriticalEvents++;
    }
  }

  return {
    totalEvents: events.length,
    eventsByType,
    eventsBySeverity,
    recentCriticalEvents,
  };
}

