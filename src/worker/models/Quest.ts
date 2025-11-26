/**
 * Quest Model
 * Complete quest structure from SRS Section 4.2
 */

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
    userAssigned: "Trivial" | "Easy" | "Medium" | "Hard" | "Epic";
    gmValidated: string | null;
    isLocked: boolean;
    validatedAt: string | null; // ISO8601
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

  registeredAt: string; // ISO8601
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

export interface Subtask {
  id: string;
  title: string;
  estimatePomodoros: number;
  isComplete: boolean;
  completedAt: string | null; // ISO8601
  revisionCount: number;
}

export interface ProgressHistoryEntry {
  date: string; // YYYY-MM-DD
  completions: number;
  expEarned: number;
  timeSpentMin: number;
  isMilestone: boolean;
  sessionsCompleted: number;
}
