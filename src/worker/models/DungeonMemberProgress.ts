/**
 * DungeonMemberProgress Model
 * Dungeon member tracking from SRS Section 4.4
 */

export interface DungeonMemberProgress {
  progressId: string;
  dungeonId: string; // questId
  userId: string;
  
  completedSubtasks: string[]; // subtaskIds
  pomodorosCompleted: number;
  sessionsCompleted: number;
  totalTimeSpentMin: number;
  
  expEarned: number;
  contributionPercent: number; // 0-100
  
  status: 'active' | 'completed' | 'failed';
  joinedAt: string; // ISO8601
  lastUpdated: string; // ISO8601
  
  performance: {
    averageSessionQuality: number;
    consistencyScore: number;
    velocityRank: number; // 1-N
  };
}