/**
 * Anti-Cheat System for Games
 * Detects suspicious patterns, speed violations, and cheating behaviors
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
}

class AntiCheatSystem {
  private actionHistory: Map<string, ActionRecord[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly MIN_ACTION_INTERVAL_MS = 50; // Minimum time between actions (50ms)
  private readonly SUSPICIOUS_SPEED_THRESHOLD = 10; // Actions per second that are suspicious
  private readonly PATTERN_REPETITION_THRESHOLD = 5; // Same action repeated 5+ times in a row

  /**
   * Record an action for a user
   */
  recordAction(userId: string, action: string, data?: any): void {
    const now = Date.now();
    const record: ActionRecord = { timestamp: now, action, data };
    
    if (!this.actionHistory.has(userId)) {
      this.actionHistory.set(userId, []);
    }
    
    const history = this.actionHistory.get(userId)!;
    history.push(record);
    
    // Keep only recent history
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }
  }

  /**
   * Check if an action is suspicious
   */
  checkAction(userId: string, action: string, data?: any): AntiCheatResult {
    const now = Date.now();
    const history = this.actionHistory.get(userId) || [];
    
    // Check 1: Speed violation (actions too fast)
    if (history.length > 0) {
      const lastAction = history[history.length - 1];
      const timeSinceLastAction = now - lastAction.timestamp;
      
      if (timeSinceLastAction < this.MIN_ACTION_INTERVAL_MS) {
        return {
          suspicious: true,
          reason: 'action_too_fast',
          confidence: 0.9
        };
      }
    }

    // Check 2: Suspicious speed pattern (too many actions per second)
    const recentActions = history.filter(a => now - a.timestamp < 1000);
    if (recentActions.length >= this.SUSPICIOUS_SPEED_THRESHOLD) {
      return {
        suspicious: true,
        reason: 'too_many_actions',
        confidence: 0.85
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
          return {
            suspicious: true,
            reason: 'repetitive_pattern',
            confidence: 0.8
          };
        }
      }
    }

    // Check 4: Perfect score patterns (too many perfect actions in a row)
    if (data?.isPerfect !== undefined && data.isPerfect) {
      const perfectCount = history
        .slice(-10)
        .filter(a => a.data?.isPerfect === true).length;
      
      if (perfectCount >= 8) {
        return {
          suspicious: true,
          reason: 'too_perfect',
          confidence: 0.7
        };
      }
    }

    return {
      suspicious: false,
      confidence: 0
    };
  }

  /**
   * Validate score submission for cheating
   */
  validateScore(
    userId: string,
    score: number,
    gameDuration: number, // in seconds
    actionsCount: number
  ): AntiCheatResult {
    const history = this.actionHistory.get(userId) || [];
    
    // Check 1: Score too high relative to game duration
    const scorePerSecond = score / Math.max(gameDuration, 1);
    if (scorePerSecond > 5000) { // Suspiciously high score per second
      return {
        suspicious: true,
        reason: 'score_too_high',
        confidence: 0.9
      };
    }

    // Check 2: Score too high relative to actions
    if (actionsCount > 0) {
      const scorePerAction = score / actionsCount;
      if (scorePerAction > 10000) { // Each action worth too much
        return {
          suspicious: true,
          reason: 'score_per_action_too_high',
          confidence: 0.85
        };
      }
    }

    // Check 3: Game duration suspiciously short for high score
    if (score > 50000 && gameDuration < 10) {
      return {
        suspicious: true,
        reason: 'high_score_short_duration',
        confidence: 0.8
      };
    }

    // Check 4: Perfect accuracy with high score
    if (history.length > 0) {
      const recent = history.slice(-50);
      const correctActions = recent.filter(a => a.data?.correct !== false).length;
      const accuracy = correctActions / recent.length;
      
      if (accuracy === 1 && score > 30000) {
        return {
          suspicious: true,
          reason: 'perfect_accuracy_high_score',
          confidence: 0.75
        };
      }
    }

    return {
      suspicious: false,
      confidence: 0
    };
  }

  /**
   * Clear history for a user
   */
  clearHistory(userId: string): void {
    this.actionHistory.delete(userId);
  }

  /**
   * Get statistics for a user
   */
  getStats(userId: string) {
    const history = this.actionHistory.get(userId) || [];
    if (history.length === 0) {
      return null;
    }

    const now = Date.now();
    const recent = history.filter(a => now - a.timestamp < 60000); // Last minute
    
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
    }
    
    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

    return {
      totalActions: history.length,
      recentActions: recent.length,
      averageInterval: avgInterval,
      actionsPerSecond: recent.length / 60
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
