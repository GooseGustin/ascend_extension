/**
 * AnalyticsSummary Model
 * Analytics data structure from SRS Section 4.8
 */

export interface AnalyticsSummary {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  
  metrics: {
    totalSessions: number;
    totalPomodoros: number;
    totalTimeMin: number;
    totalXpEarned: number;
    
    averageSessionQuality: number; // 0-100
    consistencyScore: number; // 0-100
    questVelocity: number; // XP/hour
    
    levelGained: number;
    xpRise: number;
    xpRisePercent: number;
  };
  
  breakdown: {
    byDay: DayBreakdown[];
    byQuest: QuestBreakdown[];
  };
  
  streakInfo: {
    current: number;
    longest: number;
    daysActive: number;
    daysInPeriod: number;
  };
  
  generatedAt: string; // ISO8601
}

export interface DayBreakdown {
  date: string; // YYYY-MM-DD
  sessions: number;
  xp: number;
  timeMin: number;
}

export interface QuestBreakdown {
  questId: string;
  questTitle: string;
  sessions: number;
  xp: number;
  timeMin: number;
  percentOfTotal: number;
}