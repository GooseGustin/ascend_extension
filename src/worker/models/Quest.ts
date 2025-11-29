/**
 * Quest Model
 * Complete quest structure from SRS Section 4.2
 */
export type DifficultyTier = "Trivial" | "Easy" | "Medium" | "Hard" | "Epic";

export interface Quest {
  questId: string;
  ownerId: string;
  title: string;
  description: string;
  type: "Quest" | "DungeonQuest" | "TodoQuest";
  isDungeon: boolean;
  isPublic: boolean;
  tags: string[];
  hidden: boolean;
  priority: "A" | "B" | "C";
  color: string; // Hex color code

  difficulty: {
    userAssigned: DifficultyTier;
    gmValidated: string | null;
    isLocked: boolean;
    validatedAt: string | null; // ISO8601
    confidence?: number; // GM's confidence score (0-1)
    xpPerPomodoro: number;
  };

  schedule: {
    frequency: "Daily" | "Weekly" | "Custom";
    targetCompletionsPerCycle: number;
    pomodoroDurationMin: number;
    breakDurationMin: number;
    preferredTimeSlots: string[]; // HH:MM format
    customDays?: number[];
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
