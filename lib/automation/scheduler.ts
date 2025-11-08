/**
 * Automation Scheduler
 * Handles scheduled tasks, auto-scaling, and system maintenance
 */

import { getSystemSettings, updateSystemSettings } from '@/lib/admin/systemSettings';
import { checkDatabaseHealth } from '@/lib/performance/optimizer';
import { logger } from '@/lib/utils/logger';

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // Cron expression or interval
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

// Task registry
const tasks: Map<string, ScheduledTask> = new Map();

/**
 * Register a scheduled task
 */
export function registerTask(task: ScheduledTask): void {
  tasks.set(task.id, task);
  logger.success('Task registered', { taskId: task.id, taskName: task.name }, 'scheduler');
}

/**
 * Run a task by ID
 */
export async function runTask(taskId: string): Promise<void> {
  const task = tasks.get(taskId);
  if (!task || !task.enabled) {
    throw new Error(`Task ${taskId} not found or disabled`);
  }
  
  try {
    logger.info('Running task', { taskId: task.id, taskName: task.name }, 'scheduler');
    await task.handler();
    task.lastRun = new Date();
    logger.success('Task completed', { taskId: task.id, taskName: task.name }, 'scheduler');
  } catch (error: any) {
    const errorWithContext = error instanceof Error 
      ? Object.assign(error, { taskId: task.id, taskName: task.name })
      : { error, taskId: task.id, taskName: task.name };
    logger.error('Task failed', errorWithContext, 'scheduler');
    throw error;
  }
}

/**
 * System health check task
 */
registerTask({
  id: 'health-check',
  name: 'System Health Check',
  schedule: '*/5 * * * *', // Every 5 minutes
  enabled: true,
  handler: async () => {
    const health = await checkDatabaseHealth();
    if (!health.healthy) {
      logger.warn('Database health check failed', { error: health.error }, 'scheduler');
    }
  },
});

/**
 * Cleanup old data task
 */
registerTask({
  id: 'cleanup-old-data',
  name: 'Cleanup Old Data',
  schedule: '0 2 * * *', // Daily at 2 AM
  enabled: true,
  handler: async () => {
    // Cleanup old game actions (older than 30 days)
    // This would be implemented with Prisma
    logger.info('Cleanup old data task', {}, 'scheduler');
  },
});

/**
 * Auto-scale task (monitor and adjust)
 */
registerTask({
  id: 'auto-scale',
  name: 'Auto Scale Monitoring',
  schedule: '*/10 * * * *', // Every 10 minutes
  enabled: true,
  handler: async () => {
    try {
      const settings = await getSystemSettings();
      const health = await checkDatabaseHealth();
      
      // Adjust max concurrent users based on database health
      if (health.healthy && health.latency) {
        if (health.latency > 1000) {
          // High latency, reduce max users
          const newMax = Math.max(50000, settings.maxConcurrentUsers - 10000);
          if (newMax !== settings.maxConcurrentUsers) {
            await updateSystemSettings({ maxConcurrentUsers: newMax });
            logger.info('Auto-scaled max users', { 
              old: settings.maxConcurrentUsers, 
              new: newMax,
              reason: 'high latency'
            }, 'scheduler');
          }
        } else if (health.latency < 100 && settings.maxConcurrentUsers < 200000) {
          // Low latency, increase max users
          const newMax = Math.min(200000, settings.maxConcurrentUsers + 10000);
          if (newMax !== settings.maxConcurrentUsers) {
            await updateSystemSettings({ maxConcurrentUsers: newMax });
            logger.info('Auto-scaled max users', { 
              old: settings.maxConcurrentUsers, 
              new: newMax,
              reason: 'low latency'
            }, 'scheduler');
          }
        }
      }
    } catch (error: any) {
      logger.error('Auto-scale task failed', error, 'scheduler');
    }
  },
});

/**
 * System backup task
 */
registerTask({
  id: 'system-backup',
  name: 'System Backup',
  schedule: '0 3 * * *', // Daily at 3 AM
  enabled: true,
  handler: async () => {
    // Backup system settings and critical data
    logger.info('System backup task', {}, 'scheduler');
  },
});

/**
 * Start scheduler (runs tasks based on schedule)
 */
export function startScheduler(): void {
  logger.info('Starting scheduler', { taskCount: tasks.size }, 'scheduler');
  
  // Run tasks every minute (check if they should run)
  setInterval(() => {
    const now = new Date();
    
    for (const task of tasks.values()) {
      if (!task.enabled) continue;
      
      // Simple cron-like scheduler (checks every minute)
      // For production, use a proper cron library
      const shouldRun = shouldRunTask(task, now);
      
      if (shouldRun) {
        runTask(task.id).catch(error => {
          const errorWithContext = error instanceof Error 
            ? Object.assign(error, { taskId: task.id })
            : { error, taskId: task.id };
          logger.error('Scheduled task error', errorWithContext, 'scheduler');
        });
      }
    }
  }, 60 * 1000); // Check every minute
}

/**
 * Check if task should run (simple cron parser)
 */
function shouldRunTask(task: ScheduledTask, now: Date): boolean {
  // For now, use simple interval-based scheduling
  // In production, use a proper cron parser
  
  if (!task.lastRun) {
    return true; // First run
  }
  
  // Parse schedule (simplified)
  if (task.schedule.startsWith('*/')) {
    const interval = parseInt(task.schedule.split('*/')[1].split(' ')[0]);
    const minutesSinceLastRun = (now.getTime() - task.lastRun.getTime()) / (1000 * 60);
    return minutesSinceLastRun >= interval;
  }
  
  // For cron expressions, would need a proper parser
  return false;
}

// Start scheduler if in server environment
if (typeof window === 'undefined') {
  startScheduler();
}

