/**
 * Enhanced Anti-Cheat System for Games
 * Detects suspicious patterns, speed violations, cheating behaviors, and manipulation
 */

export interface ActionRecord {
  timestamp: number;
  action: string;
  data?: any;
}

export interface AntiCheatResult {
  suspicious: boolean;
  reason?: string;
  confidence: number; // 0-1
  blocked: boolean; // Whether to block the action
}

interface UserActivity {
  actions: ActionRecord[];
  suspiciousCount: number;
  lastSuspiciousTime: number;
  firstActionTime: number;
  lastActionTime: number;
}

class AntiCheatSystem {
  private actionHistory: Map<string, UserActivity> = new Map();
  private readonly MAX_HISTORY_SIZE = 200;
  private readonly MIN_ACTION_INTERVAL_MS = 50; // Minimum time between actions (50ms)
  private readonly SUSPICIOUS_SPEED_THRESHOLD = 15; // Actions per second that are suspicious
  private readonly PATTERN_REPETITION_THRESHOLD = 5; // Same action repeated 5+ times in a row
  private readonly MAX_SUSPICIOUS_ACTIONS = 3; // Max suspicious actions before blocking
  private readonly SUSPICIOUS_COOLDOWN_MS = 60000; // 1 minute cooldown after suspicious activity

  /**
   * Record an action for a user
   */
  recordAction(userId: string, action: string, data?: any): void {
    const now = Date.now();
    const record: ActionRecord = { timestamp: now, action, data };

    if (!this.actionHistory.has(userId)) {
      this.actionHistory.set(userId, {
        actions: [],
        suspiciousCount: 0,
        lastSuspiciousTime: 0,
        firstActionTime: now,
        lastActionTime: now
      });
    }

    const activity = this.actionHistory.get(userId)!;
    activity.actions.push(record);
    activity.lastActionTime = now;

    // Keep only recent history
    if (activity.actions.length > this.MAX_HISTORY_SIZE) {
      activity.actions.shift();
    }
  }

  /**
   * Check if an action is suspicious with enhanced detection
   */
  checkAction(userId: string, action: string, data?: any): AntiCheatResult {
    const now = Date.now();
    const activity = this.actionHistory.get(userId);

    if (!activity) {
      return { suspicious: false, confidence: 0, blocked: false };
    }

    // Check if user is in suspicious cooldown
    if (activity.lastSuspiciousTime > 0) {
      const timeSinceSuspicious = now - activity.lastSuspiciousTime;
      if (timeSinceSuspicious < this.SUSPICIOUS_COOLDOWN_MS) {
        return {
          suspicious: true,
          reason: 'suspicious_cooldown',
          confidence: 0.95,
          blocked: true
        };
      }
    }

    // Block if too many suspicious actions
    if (activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS) {
      return {
        suspicious: true,
        reason: 'too_many_suspicious_actions',
        confidence: 1.0,
        blocked: true
      };
    }

    const history = activity.actions;

    // Check 1: Speed violation (actions too fast)
    if (history.length > 0) {
      const lastAction = history[history.length - 1];
      const timeSinceLastAction = now - lastAction.timestamp;

      if (timeSinceLastAction < this.MIN_ACTION_INTERVAL_MS) {
        activity.suspiciousCount++;
        activity.lastSuspiciousTime = now;
        return {
          suspicious: true,
          reason: 'action_too_fast',
          confidence: 0.95,
          blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
        };
      }
    }

    // Check 2: Suspicious speed pattern (too many actions per second)
    const recentActions = history.filter(a => now - a.timestamp < 1000);
    if (recentActions.length >= this.SUSPICIOUS_SPEED_THRESHOLD) {
      activity.suspiciousCount++;
      activity.lastSuspiciousTime = now;
      return {
        suspicious: true,
        reason: 'too_many_actions',
        confidence: 0.9,
        blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
      };
    }

    // Check 3: Repetitive pattern detection
    if (history.length >= this.PATTERN_REPETITION_THRESHOLD) {
      const recent = history.slice(-this.PATTERN_REPETITION_THRESHOLD);
      const allSame = recent.every(a => a.action === action);
      if (allSame) {
        // Check if timing is too regular (bot-like)
        const intervals: number[] = [];
        for (let i = 1; i < recent.length; i++) {
          intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
          return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;

        // If variance is very low (too consistent), it's suspicious
        if (variance < 100) {
          activity.suspiciousCount++;
          activity.lastSuspiciousTime = now;
          return {
            suspicious: true,
            reason: 'repetitive_pattern',
            confidence: 0.9,
            blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
          };
        }
      }
    }

    // Check 4: Perfect score patterns (too many perfect actions in a row)
    if (data?.isPerfect !== undefined && data.isPerfect) {
      const perfectCount = history
        .slice(-20)
        .filter(a => a.data?.isPerfect === true).length;

      if (perfectCount >= 15) {
        activity.suspiciousCount++;
        activity.lastSuspiciousTime = now;
        return {
          suspicious: true,
          reason: 'too_perfect',
          confidence: 0.85,
          blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
        };
      }
    }

    // Check 5: Unrealistic timing patterns (human reaction times)
    if (history.length >= 10) {
      const recent10 = history.slice(-10);
      const allTimings = recent10.map((a, i) => {
        if (i === 0) return 0;
        return a.timestamp - recent10[i - 1].timestamp;
      }).filter(t => t > 0);

      if (allTimings.length > 5) {
        const minTiming = Math.min(...allTimings);
        const maxTiming = Math.max(...allTimings);
        // If all timings are almost identical (machine-like)
        if (maxTiming - minTiming < 10 && minTiming < 100) {
          activity.suspiciousCount++;
          activity.lastSuspiciousTime = now;
          return {
            suspicious: true,
            reason: 'machine_like_timing',
            confidence: 0.9,
            blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
          };
        }
      }
    }

    // Check 6: Rapid state changes (impossible for humans)
    if (history.length >= 5) {
      const recent5 = history.slice(-5);
      const timeSpan = recent5[recent5.length - 1].timestamp - recent5[0].timestamp;
      if (timeSpan < 200 && recent5.length >= 5) {
        activity.suspiciousCount++;
        activity.lastSuspiciousTime = now;
        return {
          suspicious: true,
          reason: 'rapid_state_changes',
          confidence: 0.85,
          blocked: activity.suspiciousCount >= this.MAX_SUSPICIOUS_ACTIONS
        };
      }
    }

    return { suspicious: false, confidence: 0, blocked: false };
  }

  /**
   * Enhanced score validation with comprehensive checks
   */
  validateScore(
    userId: string,
    score: number,
    gameDuration: number, // in seconds
    actionsCount: number,
    gameId?: string
  ): AntiCheatResult {
    const activity = this.actionHistory.get(userId);
    if (!activity) {
      return { suspicious: false, confidence: 0, blocked: false };
    }

    const history = activity.actions;

    // Check 1: Score too high relative to game duration
    const scorePerSecond = score / Math.max(gameDuration, 1);
    if (scorePerSecond > 5000) {
      return {
        suspicious: true,
        reason: 'score_too_high',
        confidence: 0.95,
        blocked: true
      };
    }

    // Check 2: Score too high relative to actions
    if (actionsCount > 0) {
      const scorePerAction = score / actionsCount;
      if (scorePerAction > 10000) {
        return {
          suspicious: true,
          reason: 'score_per_action_too_high',
          confidence: 0.9,
          blocked: true
        };
      }
    }

    // Check 3: Game duration suspiciously short for high score
    if (score > 50000 && gameDuration < 10) {
      return {
        suspicious: true,
        reason: 'high_score_short_duration',
        confidence: 0.9,
        blocked: true
      };
    }

    // Check 4: Perfect accuracy with high score
    if (history.length > 0) {
      const recent = history.slice(-100);
      const correctActions = recent.filter(a => a.data?.correct !== false).length;
      const accuracy = correctActions / recent.length;

      if (accuracy === 1 && score > 30000 && recent.length > 20) {
        return {
          suspicious: true,
          reason: 'perfect_accuracy_high_score',
          confidence: 0.85,
          blocked: true
        };
      }
    }

    // Check 5: Negative or zero duration (manipulation)
    if (gameDuration <= 0) {
      return {
        suspicious: true,
        reason: 'invalid_duration',
        confidence: 1.0,
        blocked: true
      };
    }

    // Check 6: Unrealistic action count (too many actions in short time)
    if (actionsCount > 0 && gameDuration > 0) {
      const actionsPerSecond = actionsCount / gameDuration;
      if (actionsPerSecond > 20) {
        return {
          suspicious: true,
          reason: 'too_many_actions_per_second',
          confidence: 0.9,
          blocked: true
        };
      }
    }

    // Check 7: Score manipulation (negative score, extremely high, etc.)
    if (score < 0 || score > 1000000 || !Number.isFinite(score)) {
      return {
        suspicious: true,
        reason: 'invalid_score_value',
        confidence: 1.0,
        blocked: true
      };
    }

    return { suspicious: false, confidence: 0, blocked: false };
  }

  /**
   * Check if user should lose based on 80% loss rate
   */
  shouldForceLoss(userId: string, actualWin: boolean): boolean {
    // 80% chance of losing regardless of actual game result
    const random = Math.random();
    return random < 0.8; // 80% chance returns true (should lose)
  }

  /**
   * Clear history for a user
   */
  clearHistory(userId: string): void {
    this.actionHistory.delete(userId);
  }

  /**
   * Reset suspicious count for a user (after manual review)
   */
  resetSuspiciousCount(userId: string): void {
    const activity = this.actionHistory.get(userId);
    if (activity) {
      activity.suspiciousCount = 0;
      activity.lastSuspiciousTime = 0;
    }
  }

  /**
   * Get statistics for a user
   */
  getStats(userId: string) {
    const activity = this.actionHistory.get(userId);
    if (!activity || activity.actions.length === 0) {
      return null;
    }

    const now = Date.now();
    const recent = activity.actions.filter(a => now - a.timestamp < 60000);

    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

    return {
      totalActions: activity.actions.length,
      recentActions: recent.length,
      averageInterval: avgInterval,
      actionsPerSecond: recent.length / 60,
      suspiciousCount: activity.suspiciousCount,
      lastSuspiciousTime: activity.lastSuspiciousTime
    };
  }
}

// Export singleton instance
export const antiCheat = new AntiCheatSystem();

/**
 * Generate a random difficulty level for a game
 * Each user gets a different difficulty that persists for their session
 */
export function getRandomDifficulty(userId: string, gameId: string, min: number = 1, max: number = 3): number {
  // Create a seed from userId and gameId
  let seed = 0;
  for (let i = 0; i < userId.length; i++) {
    seed += userId.charCodeAt(i);
  }
  for (let i = 0; i < gameId.length; i++) {
    seed += gameId.charCodeAt(i);
  }

  // Simple seeded random (not cryptographically secure, but good enough for difficulty)
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);

  // Return difficulty between min and max
  return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Get difficulty multiplier for score calculation
 */
export function getDifficultyMultiplier(difficulty: number): number {
  // Higher difficulty = higher multiplier
  return 0.8 + (difficulty - 1) * 0.2; // 0.8x, 1.0x, 1.2x for difficulties 1, 2, 3
}
