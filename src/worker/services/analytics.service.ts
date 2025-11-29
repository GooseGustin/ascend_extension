/**
 * AnalyticsService
 * Generates analytics, heatmaps, and metrics
 */

import { getDB } from "../db/indexed-db";
import type { Session } from "../models/Session";
import type { PerformanceMetrics } from "../models/AgentState";
import type { Quest } from "../models/Quest";

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

  // --- START GM-SPECIFIC ANALYTICS METHODS ---

  /**
   * Calculate weekly velocity (Total XP / Total Active Hours) for GM context.
   * Required for GM validation context.
   */
  async calculateWeeklyVelocity(userId: string): Promise<number> {
    // Get sessions from the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    // Use the existing getSessionsByDateRange method
    const sessions = await this.getSessionsByDateRange(userId, oneWeekAgo.split("T")[0], now.split("T")[0]);
    
    const totalXP = sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.xpEarned || 0), 0);
    
    // Convert minutes to hours
    const totalHours = sessions
      .reduce((sum, s) => sum + s.actualDurationMin, 0) / 60;
    
    return totalHours > 0 ? totalXP / totalHours : 0;
  }

  /**
   * Calculate consistency score (0-100) over 30 days. (Different from the existing 14-day getConsistencyScore)
   * Required for GM validation context.
   */
  async calculateConsistencyScore(userId: string): Promise<number> {
    const days = 30;
    const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    
    // Use the existing getSessionsByDateRange method
    const sessions = await this.getSessionsByDateRange(userId, startDate, endDate);
    
    // Count unique days with completed sessions (actual duration >= 10 min)
    const activeDays = new Set(
      sessions
        .filter(s => s.status === 'completed' && s.actualDurationMin >= 10)
        .map(s => s.startTime.split('T')[0])
    );
    const uniqueDays = activeDays.size;
    
    // Consistency calculation logic (from the plan's specification)
    const baseScore = (uniqueDays / days) * 80;
    
    // Streak Bonus (up to 15% weight)
    const profile = await this.db.users.get(userId);
    const currentStreak = profile?.streakData.currentStreak || 0; // Assuming streakData exists
    const streakBonus = Math.min(15, currentStreak / 2);
    
    // Note: The existing getConsistencyScore adds a 5% frequency bonus. 
    // Sticking to the plan's simplified 80% base + 15% streak logic for the GM metric.
    
    return Math.min(100, Math.round(baseScore + streakBonus));
  }

  /**
   * Assess burnout risk based on volume spike, quality decline, and overdue quests.
   * Required for GM adaptive coaching.
   */
  async assessBurnoutRisk(userId: string): Promise<'Low' | 'Medium' | 'High' | 'Critical'> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const now = new Date().toISOString().split("T")[0];
    
    const sessions = await this.getSessionsByDateRange(userId, sevenDaysAgo, now);
    const sessionsThisWeek = sessions.length;
    
    let riskScore = 0;
    
    // Factor 1: Excessive work volume (over 50 sessions/week)
    if (sessionsThisWeek > 50) riskScore += 30;

    // Calculate average quality for the week (Factor 2a)
    const sessionsWithQuality = sessions.filter(s => s.quality?.score !== undefined);
    const avgSessionQuality = sessionsWithQuality.length > 0 
      ? sessionsWithQuality.reduce((sum, s) => sum + (s.quality!.score || 0), 0) / sessionsWithQuality.length 
      : 0;
    
    if (avgSessionQuality < 50 && sessionsThisWeek > 5) riskScore += 25; // Poor overall quality

    // Factor 2b: Quality decline (last 10 sessions vs weekly average)
    const recentSessions = sessionsWithQuality.slice(-10);
    const recentQuality = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + (s.quality!.score || 0), 0) / recentSessions.length 
      : avgSessionQuality;

    if (recentQuality < avgSessionQuality - 15) riskScore += 25; // Significant declining quality trend
    
    // Factor 3: Overdue quests
    // NOTE: Assuming this.db.getActiveQuests(userId) exists in the IndexedDB wrapper
    const quests = await this.db.getActiveQuests(userId); 
    const overdueCount = quests.filter(q => 
      q.dueDate && new Date(q.dueDate) < new Date()
    ).length;
    
    if (overdueCount > 3) riskScore += 20;
    
    // Determine risk level
    if (riskScore >= 75) return 'Critical';
    if (riskScore >= 50) return 'High';
    if (riskScore >= 25) return 'Medium';
    return 'Low';
  }

  /**
   * Generate full AgentState (PerformanceMetrics) DTO for GM context.
   * Orchestrates all calculations and trend analysis.
   */
  async generateAgentState(userId: string): Promise<PerformanceMetrics> {
    const [velocity, consistency, burnout] = await Promise.all([
      this.calculateWeeklyVelocity(userId),
      this.calculateConsistencyScore(userId),
      this.assessBurnoutRisk(userId),
    ]);
    
    // Fetch dependent data
    const profile = await this.db.users.get(userId);
    // Use Quest[] type
    const quests: Quest[] = await this.db.getActiveQuests(userId); // Active quests
    
    // Metrics from existing methods or direct calculation
    const sessionsToday = await this.getTodaySessions(userId);
    const avgQuality = sessionsToday.length > 0 
      ? sessionsToday.reduce((sum, s) => sum + (s.quality?.score || 0), 0) / sessionsToday.length 
      : 0;
    
    const overdueCount = quests.filter(q => 
      q.dueDate && new Date(q.dueDate) < new Date()
    ).length;
    
    // Trend Logic: NOW USING REAL DB CALLS
    
    // Get historical metric for comparison (1 period ago)
    // FIX: Using the real getHistoricalMetric method
    const lastWeekVelocity = await this.db.getHistoricalMetric(userId, 'weeklyVelocity', 1) || 0;
    const velocityTrend = velocity > lastWeekVelocity * 1.1 ? 'improving' : 
                          velocity < lastWeekVelocity * 0.9 ? 'declining' : 'stable';
                          
    // Get historical metric for comparison (1 period ago)
    // FIX: Using the real getHistoricalMetric method
    const lastMonthConsistency = await this.db.getHistoricalMetric(userId, 'monthlyConsistency', 1) || 0;
    const consistencyTrend = consistency > lastMonthConsistency * 1.05 ? 'improving' : 
                             consistency < lastMonthConsistency * 0.95 ? 'declining' : 'stable';
    
    const finalMetrics = {
      weeklyVelocity: velocity,
      monthlyConsistency: consistency,
      burnoutRisk: burnout,
      averageSessionQuality: avgQuality,
      streakDays: profile?.streakData?.currentStreak || 0,
      activeQuestCount: quests.length,
      overdueQuestCount: overdueCount,
      velocityTrend,
      consistencyTrend,
      calculatedAt: new Date().toISOString(),
    } as PerformanceMetrics;

    // ADDED: Save the current metrics for future historical comparison
    await Promise.all([
      this.db.savePerformanceSnapshot(userId, 'weeklyVelocity', velocity),
      this.db.savePerformanceSnapshot(userId, 'monthlyConsistency', consistency),
    ]);

    return finalMetrics;
  }
}
