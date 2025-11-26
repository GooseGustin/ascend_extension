/**
 * AnalyticsService
 * Generates analytics, heatmaps, and metrics
 */

import { getDB } from "../db/indexed-db";
import type { Session } from "../models/Session";

export interface HeatmapDay {
  date: string;
  count: number;
  intensity: number; // 0-4 for color coding
}

export interface TodayMetrics {
  xpEarned: number;
  sessionsCompleted: number;
  currentStreak: number;
  timeSpentMin: number;
}

export class AnalyticsService {
  private db = getDB();

  /**
   * Generate heatmap data for date range
   */
  async getHeatmapData(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<HeatmapDay[]> {
    // Fetch sessions in range
    const sessions = await this.db.getSessionsByDateRange(
      userId,
      startDate,
      endDate
    );

    // Group by date
    const dailyCounts = new Map<string, number>();

    sessions.forEach((session) => {
      const date = session.startTime.split("T")[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    // Calculate intensity levels (0-4)
    const counts = Array.from(dailyCounts.values());
    const maxCount = Math.max(...counts, 1);

    // Fill in all dates in range with zero counts
    const start = new Date(startDate);
    const end = new Date(endDate);
    const heatmapData: HeatmapDay[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const count = dailyCounts.get(dateStr) || 0;

      heatmapData.push({
        date: dateStr,
        count,
        intensity: Math.ceil((count / maxCount) * 4), // 0-4 scale
      });
    }

    return heatmapData;
  }

  /**
   * Get today's metrics for MainPanel stats
   */
  async getTodayMetrics(userId: string): Promise<TodayMetrics> {
    const sessions = await this.db.getTodaySessions(userId);

    // Calculate totals
    const xpEarned = sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);
    const sessionsCompleted = sessions.filter(
      (s) => s.status === "completed"
    ).length;
    const timeSpentMin = sessions.reduce(
      (sum, s) => sum + s.actualDurationMin,
      0
    );

    // Get current streak from user profile
    const userProfile = await this.db.users.get(userId);
    const currentStreak = userProfile?.streakData.currentStreak || 0;

    return {
      xpEarned,
      sessionsCompleted,
      currentStreak,
      timeSpentMin,
    };
  }

  /**
   * Get session history for a quest
   */
  async getQuestSessions(
    questId: string,
    limit: number = 50
  ): Promise<Session[]> {
    return await this.db.sessions
      .where("questId")
      .equals(questId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Calculate velocity (XP per hour) for a quest
   */
  async calculateQuestVelocity(questId: string): Promise<number> {
    const sessions = await this.getQuestSessions(questId, 100);

    const totalXP = sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);
    const totalTimeHours =
      sessions.reduce((sum, s) => sum + s.actualDurationMin, 0) / 60;

    return totalTimeHours > 0 ? totalXP / totalTimeHours : 0;
  }

  /**
   * Get average session quality for a quest
   */
  async getAverageQuality(questId: string): Promise<number> {
    const sessions = await this.getQuestSessions(questId);
    const completedSessions = sessions.filter((s) => s.status === "completed");

    if (completedSessions.length === 0) return 0;

    const totalQuality = completedSessions.reduce(
      (sum, s) => sum + s.quality.score,
      0
    );
    return Math.round(totalQuality / completedSessions.length);
  }

  /**
   * Calculate consistency score (0-100) based on recent activity
   */
  async getConsistencyScore(
    userId: string,
    days: number = 14
  ): Promise<{
    score: number;
    status: "Rising" | "Stable" | "Erratic" | "Crashing";
    daysActive: number;
    totalDays: number;
  }> {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const sessions = await this.db.getSessionsByDateRange(
      userId,
      startDate,
      endDate
    );

    // Group sessions by date
    const activeDays = new Set(
      sessions
        .filter((s) => s.status === "completed" && s.actualDurationMin >= 10)
        .map((s) => s.startTime.split("T")[0])
    );

    const daysActive = activeDays.size;
    const userProfile = await this.db.users.get(userId);
    const currentStreak = userProfile?.streakData.currentStreak || 0;

    // Calculate base score
    const baseScore = (daysActive / days) * 80;
    const streakBonus = Math.min(15, currentStreak / 2);
    const avgSessionsPerDay = sessions.length / days;
    const frequencyBonus = Math.min(5, avgSessionsPerDay);

    const score = Math.min(
      100,
      Math.round(baseScore + streakBonus + frequencyBonus)
    );

    // Determine status
    let status: "Rising" | "Stable" | "Erratic" | "Crashing";
    if (score >= 75) status = "Rising";
    else if (score >= 50) status = "Stable";
    else if (score >= 25) status = "Erratic";
    else status = "Crashing";

    return {
      score,
      status,
      daysActive,
      totalDays: days,
    };
  }

  /**
   * Get session quality breakdown
   */
  async getSessionQualityBreakdown(
    userId: string,
    days: number = 30
  ): Promise<{
    completed: number;
    interrupted: number;
    earlyStopped: number;
    overtime: number;
  }> {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const sessions = await this.db.getSessionsByDateRange(
      userId,
      startDate,
      endDate
    );

    const breakdown = {
      completed: 0,
      interrupted: 0,
      earlyStopped: 0,
      overtime: 0,
    };

    sessions.forEach((session) => {
      if (session.status === "completed") {
        breakdown.completed++;

        // Check for overtime (actual > planned + 5 min grace)
        if (session.actualDurationMin > session.plannedDurationMin + 5) {
          breakdown.overtime++;
        }
      } else if (session.status === "abandoned") {
        breakdown.earlyStopped++;
      }

      // Check for interruptions
      if (session.interruptions.length > 0) {
        breakdown.interrupted++;
      }
    });

    return breakdown;
  }

  /**
   * Get work distribution data for stacked bar chart
   */
  async getWorkDistribution(
    userId: string,
    period: "daily" | "weekly" | "monthly"
  ): Promise<
    Array<{
      name: string;
      [questTitle: string]: number | string;
    }>
  > {
    const now = new Date();
    let days: number;
    let groupBy: "day" | "week";

    switch (period) {
      case "daily":
        days = 7;
        groupBy = "day";
        break;
      case "weekly":
        days = 28;
        groupBy = "week";
        break;
      case "monthly":
        days = 120;
        groupBy = "week";
        break;
      default:
        days = 7;
        groupBy = "day";
    }

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const sessions = await this.db.getSessionsByDateRange(
      userId,
      startDate,
      endDate
    );
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    const questMap = new Map(quests.map((q) => [q.questId, q.title]));

    // Group sessions
    const grouped = new Map<string, Map<string, number>>();

    sessions.forEach((session) => {
      const date = new Date(session.startTime);
      let key: string;

      if (groupBy === "day") {
        key = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][date.getDay()];
      } else {
        // Week number
        const weekNum =
          Math.floor(
            (date.getTime() - new Date(startDate).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          ) + 1;
        key = `Week ${weekNum}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }

      const questTitle = questMap.get(session.questId) || "Unknown";
      const currentTime = grouped.get(key)!.get(questTitle) || 0;
      grouped
        .get(key)!
        .set(questTitle, currentTime + session.actualDurationMin);
    });

    // Convert to chart format
    return Array.from(grouped.entries()).map(([name, questTimes]) => {
      const entry: any = { name };
      questTimes.forEach((time, quest) => {
        entry[quest] = time;
      });
      return entry;
    });
  }

  /**
   * Get time percentage distribution (donut chart)
   */
  async getTimeDistribution(
    userId: string,
    days: number = 7
  ): Promise<
    Array<{
      name: string;
      value: number;
      color: string;
    }>
  > {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const sessions = await this.db.getSessionsByDateRange(
      userId,
      startDate,
      endDate
    );
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    const questMap = new Map(
      quests.map((q) => [q.questId, { title: q.title, color: q.color }])
    );

    // Sum time per quest
    const timeByQuest = new Map<string, { time: number; color: string }>();

    sessions.forEach((session) => {
      const questData = questMap.get(session.questId);
      if (!questData) return;

      const current = timeByQuest.get(questData.title) || {
        time: 0,
        color: questData.color,
      };
      current.time += session.actualDurationMin;
      timeByQuest.set(questData.title, current);
    });

    return Array.from(timeByQuest.entries()).map(([name, data]) => ({
      name,
      value: data.time,
      color: data.color,
    }));
  }

  /**
   * Get velocity data for line chart
   */
  async getVelocityData(
    userId: string,
    days: number = 7
  ): Promise<
    Array<{
      day: string;
      [questTitle: string]: number | string;
    }>
  > {
    const now = new Date();
    const sessions = await this.db.getSessionsByDateRange(
      userId,
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      now.toISOString().split("T")[0]
    );

    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    const questMap = new Map(quests.map((q) => [q.questId, q.title]));

    // Group by day and quest
    const velocityByDay = new Map<
      string,
      Map<string, { xp: number; time: number }>
    >();

    sessions.forEach((session) => {
      const date = new Date(session.startTime);
      const dayKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
        date.getDay()
      ];

      if (!velocityByDay.has(dayKey)) {
        velocityByDay.set(dayKey, new Map());
      }

      const questTitle = questMap.get(session.questId) || "Unknown";
      const current = velocityByDay.get(dayKey)!.get(questTitle) || {
        xp: 0,
        time: 0,
      };
      current.xp += session.xpEarned;
      current.time += session.actualDurationMin;
      velocityByDay.get(dayKey)!.set(questTitle, current);
    });

    // Calculate velocity (XP per hour)
    return Array.from(velocityByDay.entries()).map(([day, questData]) => {
      const entry: any = { day };
      questData.forEach((data, quest) => {
        entry[quest] =
          data.time > 0 ? Math.round((data.xp / data.time) * 60) : 0;
      });
      return entry;
    });
  }

  /**
   * Get stats for top summary strip
   */
  async getProgressStats(userId: string): Promise<{
    currentLevel: number;
    totalXP: number;
    xpThisMonth: number;
    xpRisePercent: number;
    levelRise: number;
    sessionsThisMonth: number;
    sessionsChange: number;
  }> {
    const userProfile = await this.db.users.get(userId);
    if (!userProfile) throw new Error("User not found");

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    const thisMonthSessions = await this.db.getSessionsByDateRange(
      userId,
      thisMonthStart,
      now.toISOString().split("T")[0]
    );
    const lastMonthSessions = await this.db.getSessionsByDateRange(
      userId,
      lastMonthStart,
      lastMonthEnd
    );

    const xpThisMonth = thisMonthSessions.reduce(
      (sum, s) => sum + s.xpEarned,
      0
    );
    const xpLastMonth = lastMonthSessions.reduce(
      (sum, s) => sum + s.xpEarned,
      0
    );

    return {
      currentLevel: userProfile.totalLevel,
      totalXP: userProfile.experiencePoints,
      xpThisMonth,
      xpRisePercent:
        xpLastMonth > 0
          ? Math.round(((xpThisMonth - xpLastMonth) / xpLastMonth) * 100)
          : 0,
      levelRise: 0, // Calculate based on level tracking
      sessionsThisMonth: thisMonthSessions.filter(
        (s) => s.status === "completed"
      ).length,
      sessionsChange: thisMonthSessions.length - lastMonthSessions.length,
    };
  }

  /**
   * Get best performing quests
   */
  async getBestQuests(
    userId: string,
    limit: number = 3
  ): Promise<
    Array<{
      questId: string;
      title: string;
      icon: string;
      color: string;
      velocity: number;
      avgVelocity: number;
      completionRate: number;
      totalXP: number;
      avgSessionTime: number;
      consistency: number;
    }>
  > {
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    const avgVelocity = 55; // Global average, could be calculated

    const questStats = await Promise.all(
      quests.map(async (quest) => {
        const sessions = await this.getQuestSessions(quest.questId, 100);
        const completedSessions = sessions.filter(
          (s) => s.status === "completed"
        );

        const totalTime = sessions.reduce(
          (sum, s) => sum + s.actualDurationMin,
          0
        );
        const totalXP = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
        const velocity = totalTime > 0 ? (totalXP / totalTime) * 60 : 0;

        return {
          questId: quest.questId,
          title: quest.title,
          icon: quest.type === "DungeonQuest" ? "⚔️" : "📋",
          color:
            quest.difficulty.userAssigned === "Hard" ? "#ED4245" : "#5865F2",
          velocity: Math.round(velocity),
          avgVelocity,
          completionRate:
            sessions.length > 0
              ? Math.round((completedSessions.length / sessions.length) * 100)
              : 0,
          totalXP,
          avgSessionTime:
            completedSessions.length > 0
              ? Math.round(totalTime / completedSessions.length)
              : 0,
          consistency: 85, // Calculate from session regularity
        };
      })
    );

    return questStats.sort((a, b) => b.velocity - a.velocity).slice(0, limit);
  }

  /**
   * Get weak performing quests
   */
  async getWeakQuests(
    userId: string,
    limit: number = 3
  ): Promise<
    Array<{
      questId: string;
      title: string;
      icon: string;
      color: string;
      velocity: number;
      avgVelocity: number;
      issues: string[];
      interruptionRate: number;
      completionRate: number;
    }>
  > {
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    const avgVelocity = 55;

    const questStats = await Promise.all(
      quests.map(async (quest) => {
        const sessions = await this.getQuestSessions(quest.questId, 100);
        const completedSessions = sessions.filter(
          (s) => s.status === "completed"
        );

        const totalTime = sessions.reduce(
          (sum, s) => sum + s.actualDurationMin,
          0
        );
        const totalXP = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
        const velocity = totalTime > 0 ? (totalXP / totalTime) * 60 : 0;

        const interruptedCount = sessions.filter(
          (s) => s.interruptions.length > 0
        ).length;
        const interruptionRate =
          sessions.length > 0
            ? Math.round((interruptedCount / sessions.length) * 100)
            : 0;

        const issues: string[] = [];
        if (velocity < avgVelocity * 0.8) issues.push("Below average velocity");
        if (interruptionRate > 30) issues.push("High interruptions");
        if (quest.subtasks.length > 20) issues.push("Too many subtasks");
        if (completedSessions.length / sessions.length < 0.6)
          issues.push("Low completion rate");

        return {
          questId: quest.questId,
          title: quest.title,
          icon: quest.type === "DungeonQuest" ? "⚔️" : "📋",
          color:
            quest.difficulty.userAssigned === "Hard" ? "#ED4245" : "#5865F2",
          velocity: Math.round(velocity),
          avgVelocity,
          issues,
          interruptionRate,
          completionRate:
            sessions.length > 0
              ? Math.round((completedSessions.length / sessions.length) * 100)
              : 0,
        };
      })
    );

    return questStats
      .filter((q) => q.issues.length > 0)
      .sort((a, b) => a.velocity - b.velocity)
      .slice(0, limit);
  }

  /**
   * Get session history for a user (all quests)
   * Uses [userId+startTime] compound index for efficiency
   */
  async getSessionHistory(options: {
    userId: string;
    limit?: number;
  }): Promise<Session[]> {
    const { userId, limit = 50 } = options;

    // Note: Requires 'dexie' import for minKey/maxKey or just use string bounds
    // Using string bounds for safety if Dexie not imported in this file
    return await this.db.sessions
      .where("[userId+startTime]")
      .between([userId, ""], [userId, "\uffff"]) // ISO strings sort naturally
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get sessions within a date range
   */
  async getSessionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Session[]> {
    return await this.db.sessions
      .where("userId")
      .equals(userId)
      .filter((session) => {
        const sessionDate = session.startTime.split("T")[0];
        return sessionDate >= startDate && sessionDate <= endDate;
      })
      .toArray();
  }

  /**
   * Get today's sessions
   */
  async getTodaySessions(userId: string): Promise<Session[]> {
    const today = new Date().toISOString().split("T")[0];
    return await this.getSessionsByDateRange(userId, today, today);
  }
}

export function totalExpForLevel(L: number) {
  return 100 * (Math.exp(L / 5) - 1);
}

export function xpToNextLevel(currentExp: number) {
  // compute current level (continuous)
  const level = Math.floor(Math.log(currentExp / 100 + 1) * 5);
  const neededTotal = totalExpForLevel(level + 1);
  return Math.max(0, Math.ceil(neededTotal - currentExp));
}

export function xpDeltaForLevel(L: number) {
  const factor = Math.exp(1 / 5) - 1; // ≈ 0.22140275816
  return 100 * Math.exp(L / 5) * factor;
}

export function currentLevelFromExp(currentExp: number) {
  return Math.floor(Math.log(currentExp / 100 + 1) * 5);
}
