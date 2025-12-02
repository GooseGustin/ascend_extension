/**
 * Session Model
 * Complete session structure from SRS Section 4.3 (with pauseEvents)
 */

export interface Session {
  sessionId: string;
  userId: string;
  questId: string;
  subtaskId: string | null;
  
  sessionType: 'pomodoro' | 'deep_focus'; 
  
  startTime: string; // ISO8601
  endTime: string | null; // ISO8601
  plannedDurationMin: number; // For pomodoro, null for deep_focus
  actualDurationMin: number;
  
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  
  pauseEvents: PauseEvent[];
  interruptions: Interruption[];
  
  quality: {
    score: number; // 0-100
    factors: {
      completionRate: number; // 0-100
      interruptionPenalty: number;
      overtimeBonus: number;
      consistencyBonus: number;
    };
  };
  
  xpEarned: number;
  xpMultipliers: XPMultiplier[];
  
  // Deep Focus specific
  deepFocusElapsedSec: number; // NEW - tracks up-counter for deep focus
  
  notes: string | null;
  tags: string[];
}

export interface PauseEvent {
  timestamp: string; // ISO8601
  durationSec: number;
  reason?: string | null;
  wasAutomatic: boolean;
}

export interface Interruption {
  timestamp: string; // ISO8601
  durationSec: number;
  reason: string | null;
}

export interface XPMultiplier {
  source: 'difficulty' | 'track_aligned' | 'rune' | 'buff' | 'dungeon';
  value: number;
}