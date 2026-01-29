/**
 * Quest Model
 * Complete quest structure from SRS Section 4.2
 */
export type DifficultyTier = "Trivial" | "Easy" | "Medium" | "Hard" | "Epic";

// AntiQuest Types
export type Severity = "mild" | "moderate" | "severe" | "critical";

export interface AntiQuestOccurrence {
  id: string;
  timestamp: string; // ISO8601
  xpPenalty: number;
  actualPenalty?: number; // Actual XP deducted (may be less due to floor)
  notes?: string;
}

export interface AntiQuestTracking {
  totalOccurrences: number;
  occurrencesToday: number;
  occurrencesThisWeek: number;
  occurrencesThisMonth: number;
  lastOccurredAt: string | null; // ISO8601
  currentGapDays: number;
  longestGapDays: number;
  totalXPLost: number;
}

export interface Quest {
  questId: string;
  ownerId: string;
  title: string;
  description: string;
  type: "Quest" | "DungeonQuest" | "TodoQuest" | "AntiQuest";
  isDungeon: boolean;
  isPublic: boolean;
  tags: string[];
  hidden: boolean;
  priority: "A" | "B" | "C";
  color: string; // Hex color code
  behavior: "repeating" | "progressive"; // Quest behavioral mode

  difficulty: {
    userAssigned: DifficultyTier;
    gmValidated: string | null;
    isLocked: boolean;
    validatedAt: string | null; // ISO8601
    confidence?: number; // GM's confidence score (0-1)
    xpPerPomodoro: number;
  };

  schedule: {
    frequency: "Daily" | "Weekly";
    targetCompletionsPerCycle: number;
    pomodoroDurationMin: number;
    breakDurationMin: number;
    preferredTimeSlots: string[]; // HH:MM format
    customDays?: number[]; // Days of week (0=Sunday, 1=Monday, etc.) for Weekly frequency
  };

  subtasks: Subtask[];

  watchers: string[]; // userIds
  members: string[]; // userIds (for guild quests)
  isTrackAligned: boolean;
  dueDate: string | null; // ISO8601
  isCompleted: boolean;
  completedAt: string | null; // ISO8601

  activeBuffs: string[]; // buffIds

  gamification: {
    currentLevel: number;
    currentExp: number;
    expToNextLevel: number;
  };

  progressHistory: ProgressHistoryEntry[];

  tracking: {
    totalTrackedTime: number; // minutes
    velocity: number; // XP/hour
    averageSessionQuality: number; // 0-100
    lastSessionAt: string | null; // ISO8601
  };
  timeEstimateHours?: number; // Estimated hours for the entire quest

  registeredAt: string | null; // ISO8601
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601

  // GM coaching data
  gmFeedback?: GMFeedback;

  // AntiQuest-specific fields (only set when type === "AntiQuest")
  severity?: {
    userAssigned: Severity;
    xpPenaltyPerEvent: number;
    isLocked: boolean;
    lockedAt?: string; // ISO8601 - when first occurrence locked severity
  };
  antiEvents?: AntiQuestOccurrence[];
  antiTracking?: AntiQuestTracking;

  // Validation status for offline queue handling
  validationStatus: "pending" | "validated" | "failed" | "queued";
}

export interface Subtask {
  id: string;
  title: string;
  estimatePomodoros: number;
  isComplete: boolean;
  completedAt: string | null; // ISO8601
  revisionCount: number;
}

export interface GMFeedback {
  reasoning: string;
  recommendations: string[];
  confidence: number; // 0-1
  suggestedDifficulty: DifficultyTier;
  validatedAt: string; // ISO8601

  // Context used for validation (for auditing)
  context?: {
    userLevel: number;
    subtaskComplexity: string;
    estimatedHours: number;
  };
}

export interface ProgressHistoryEntry {
  date: string; // YYYY-MM-DD
  completions: number;
  expEarned: number;
  timeSpentMin: number;
  isMilestone: boolean;
  sessionsCompleted: number;
}
