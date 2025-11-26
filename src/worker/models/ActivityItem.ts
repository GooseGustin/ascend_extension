/**
 * ActivityItem Model
 * Unified activity feed item structure
 */

export type ActivityType = 
  | 'level_up'
  | 'quest_complete'
  | 'dungeon_clear'
  | 'comment'
  | 'streak_milestone'
  | 'achievement_unlock';

export interface ActivityItem {
  activityId: string;
  type: ActivityType;
  userId: string;
  username: string;
  timestamp: string; // ISO8601
  
  data: {
    level?: number;
    questId?: string;
    questTitle?: string;
    xpEarned?: number;
    dungeonId?: string;
    participants?: string[];
    fromUser?: string;
    preview?: string;
    streakDays?: number;
    achievementName?: string;
  };
  
  isRead?: boolean;
  priority?: 'low' | 'normal' | 'high';
}
