/**
 * Performance Optimizer
 * Handles database connection pooling, query optimization, and response compression
 */

import { prisma, isDatabaseAvailable } from '@/lib/prisma/client';

/**
 * Database connection pool configuration
 */
export const dbConfig = {
  poolSize: process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE) : 10,
  maxConnections: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS) : 20,
  idleTimeout: process.env.DATABASE_IDLE_TIMEOUT ? parseInt(process.env.DATABASE_IDLE_TIMEOUT) : 30000,
};

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  if (!(await isDatabaseAvailable())) {
    return {
      healthy: false,
      error: 'Database not available',
    };
  }
  
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message || 'Database health check failed',
    };
  }
}

/**
 * Optimize query with pagination
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginate<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginatedResult<T> {
  const {
    page = 1,
    pageSize = 20,
    maxPageSize = 100,
  } = options;
  
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), maxPageSize);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  
  const paginatedData = data.slice(start, end);
  const total = data.length;
  const totalPages = Math.ceil(total / safePageSize);
  
  return {
    data: paginatedData,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}

/**
 * Batch operations for better performance
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => operation(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    
    return {
      used,
      total,
      percentage: (used / total) * 100,
    };
  }
  
  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
}

/**
 * Performance monitor decorator
 */
export function monitorPerformance(
  label: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const memBefore = getMemoryUsage();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        const memAfter = getMemoryUsage();
        
        console.log(`[performance] ${label}.${propertyKey}`, {
          duration: `${duration}ms`,
          memory: `${((memAfter.used - memBefore.used) / 1024 / 1024).toFixed(2)}MB`,
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`[performance] ${label}.${propertyKey} failed`, {
          duration: `${duration}ms`,
          error,
        });
        throw error;
      }
    };
    
    return descriptor;
  };
}

