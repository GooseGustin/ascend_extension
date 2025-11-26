/**
 * ActivityFeedService
 * Generates unified activity feed from multiple sources
 */

import { getDB } from '../db/indexed-db';
import type { ActivityItem, ActivityType } from '../models/ActivityItem';
import type { Quest } from '../models/Quest';

export class ActivityFeedService {
  private db = getDB();

  /**
   * Get unified activity feed
   */
  async getActivityFeed(
    userId: string,
    options: {
      limit?: number;
      types?: ActivityType[];
      includeWatched?: boolean;
    } = {}
  ): Promise<ActivityItem[]> {
    const {
      limit = 20,
      types = [],
      includeWatched = true
    } = options;

    // Fetch from local activity feed cache
    let activities = await this.db.activityFeed
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('timestamp');

    // Generate activities from user's own data
    const userActivities = await this.generateUserActivities(userId);
    
    // Merge and deduplicate
    const allActivities = [...activities, ...userActivities];
    const uniqueActivities = this.deduplicateActivities(allActivities);

    // Filter by types if specified
    let filtered = types.length > 0
      ? uniqueActivities.filter(a => types.includes(a.type))
      : uniqueActivities;

    // Sort by timestamp descending
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return filtered.slice(0, limit);
  }

  /**
   * Generate activities from user's quest progress
   */
  private async generateUserActivities(userId: string): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];
    const userProfile = await this.db.users.get(userId);
    if (!userProfile) return activities;

    const quests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .toArray();

    for (const quest of quests) {
      // Check for recent level ups in progressHistory
      const recentHistory = quest.progressHistory
        .filter(h => h.isMilestone)
        .slice(-3); // Last 3 milestones

      for (const history of recentHistory) {
        activities.push({
          activityId: `${quest.questId}-level-${history.date}`,
          type: 'level_up',
          userId,
          username: userProfile.username,
          timestamp: history.date,
          data: {
            level: quest.gamification.currentLevel,
            questId: quest.questId,
            questTitle: quest.title
          }
        });
      }

      // Check for quest completion
      if (quest.isCompleted && quest.completedAt) {
        const completedRecently = this.isRecent(quest.completedAt, 7); // Last 7 days
        
        if (completedRecently) {
          activities.push({
            activityId: `${quest.questId}-complete`,
            type: 'quest_complete',
            userId,
            username: userProfile.username,
            timestamp: quest.completedAt,
            data: {
              questId: quest.questId,
              questTitle: quest.title,
              xpEarned: quest.gamification.currentExp
            }
          });
        }
      }
    }

    // Check for streak milestones
    const streak = userProfile.streakData.currentStreak;
    if ([7, 30, 100, 365].includes(streak)) {
      activities.push({
        activityId: `streak-${streak}`,
        type: 'streak_milestone',
        userId,
        username: userProfile.username,
        timestamp: new Date().toISOString(),
        data: {
          streakDays: streak
        }
      });
    }

    return activities;
  }

  /**
   * Deduplicate activities by ID
   */
  private deduplicateActivities(activities: ActivityItem[]): ActivityItem[] {
    const seen = new Set<string>();
    return activities.filter(activity => {
      if (seen.has(activity.activityId)) {
        return false;
      }
      seen.add(activity.activityId);
      return true;
    });
  }

  /**
   * Check if timestamp is within N days
   */
  private isRecent(timestamp: string, days: number): boolean {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }

  /**
   * Add activity to feed (for caching)
   */
  async addActivity(activity: ActivityItem): Promise<void> {
    await this.db.activityFeed.add(activity);
  }
}
