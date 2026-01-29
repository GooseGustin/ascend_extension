/**
 * AntiQuestService
 * Handles AntiQuest CRUD operations, occurrence logging, and XP penalty application
 *
 * AntiQuests track negative behaviors the user wants to reduce:
 * - Retrospective (logging past events, not planning future work)
 * - Penalty-driven (XP deduction, not rewards)
 * - Event-based (discrete occurrences, not sessions/pomodoros)
 * - Accountability-focused (honest logging with consequences)
 */

import { getDB } from "../db/indexed-db";
import type { Quest, Severity, AntiQuestOccurrence, AntiQuestTracking } from "../models/Quest";
import { AuthService } from "./auth.service";
import { applyXPPenaltyWithFloor } from "../utils/level-and-xp-converters";

// XP Penalties by severity
const SEVERITY_XP_PENALTIES: Record<Severity, number> = {
  mild: 25,
  moderate: 50,
  severe: 100,
  critical: 200,
};

// Severity colors for UI reference
export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  mild: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  moderate: { bg: '#fed7aa', text: '#9a3412', border: '#ea580c' },
  severe: { bg: '#fecaca', text: '#991b1b', border: '#dc2626' },
  critical: { bg: '#fecdd3', text: '#881337', border: '#be123c' },
};

export class AntiQuestService {
  private db = getDB();
  private authService: AuthService;

  constructor() {
    this.db = getDB();
    this.authService = new AuthService();
  }

  /**
   * Get all AntiQuests for a user
   */
  async getAntiQuests(userId: string): Promise<Quest[]> {
    const allQuests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();

    return allQuests.filter(q => q.type === "AntiQuest" && !q.hidden);
  }

  /**
   * Get archived AntiQuests for a user
   */
  async getArchivedAntiQuests(userId: string): Promise<Quest[]> {
    const allQuests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();

    return allQuests.filter(q => q.type === "AntiQuest" && q.hidden);
  }

  /**
   * Get a single AntiQuest by ID
   */
  async getAntiQuest(antiQuestId: string): Promise<Quest | undefined> {
    const quest = await this.db.quests.get(antiQuestId);
    if (quest && quest.type === "AntiQuest") {
      return quest;
    }
    return undefined;
  }

  /**
   * Create a new AntiQuest
   */
  async createAntiQuest(data: {
    title: string;
    description?: string;
    severity: Severity;
    tags?: string[];
  }): Promise<Quest> {
    const userId = await this.authService.getCurrentUserId();
    const now = new Date().toISOString();
    const antiQuestId = `antiquest_${crypto.randomUUID()}`;

    const xpPenalty = SEVERITY_XP_PENALTIES[data.severity];

    const antiQuest: Quest = {
      questId: antiQuestId,
      ownerId: userId,
      title: data.title,
      description: data.description || "",
      type: "AntiQuest",
      isDungeon: false,
      isPublic: false,
      tags: data.tags || [],
      hidden: false,
      priority: "A", // AntiQuests are always high priority
      color: SEVERITY_COLORS[data.severity].border,
      behavior: "repeating",

      // AntiQuest-specific severity
      severity: {
        userAssigned: data.severity,
        xpPenaltyPerEvent: xpPenalty,
        isLocked: false, // Locks after first occurrence
      },

      // AntiQuest events
      antiEvents: [],

      // AntiQuest tracking
      antiTracking: {
        totalOccurrences: 0,
        occurrencesToday: 0,
        occurrencesThisWeek: 0,
        occurrencesThisMonth: 0,
        lastOccurredAt: null,
        currentGapDays: 0,
        longestGapDays: 0,
        totalXPLost: 0,
      },

      // Standard quest fields (not used for AntiQuests but required)
      difficulty: {
        userAssigned: "Trivial",
        gmValidated: null,
        isLocked: false,
        validatedAt: null,
        xpPerPomodoro: 0,
      },
      schedule: {
        frequency: "Daily",
        targetCompletionsPerCycle: 0,
        pomodoroDurationMin: 25,
        breakDurationMin: 5,
        preferredTimeSlots: [],
      },
      subtasks: [],
      watchers: [],
      members: [],
      isTrackAligned: false,
      dueDate: null,
      isCompleted: false,
      completedAt: null,
      activeBuffs: [],
      gamification: {
        currentLevel: 0,
        currentExp: 0,
        expToNextLevel: 0,
      },
      progressHistory: [],
      tracking: {
        totalTrackedTime: 0,
        velocity: 0,
        averageSessionQuality: 0,
        lastSessionAt: null,
      },
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
      validationStatus: "validated", // AntiQuests don't need GM validation
    };

    // Save to database
    await this.db.quests.add(antiQuest);

    // Queue sync
    await this.db.queueSync({
      operation: "create",
      collection: "quests",
      documentId: antiQuestId,
      data: antiQuest,
      priority: 7,
      userId,
      retries: 0,
      error: null,
    });

    console.log(`[AntiQuestService] Created AntiQuest: ${antiQuestId}`);
    return antiQuest;
  }

  /**
   * Log an occurrence of an AntiQuest behavior
   * This applies XP penalty and locks severity on first occurrence
   */
  async logOccurrence(
    antiQuestId: string,
    notes?: string,
    timestamp?: string
  ): Promise<{
    antiQuest: Quest;
    occurrence: AntiQuestOccurrence;
    xpResult: { newXP: number; actualPenalty: number };
  }> {
    const userId = await this.authService.getCurrentUserId();
    const antiQuest = await this.getAntiQuest(antiQuestId);

    if (!antiQuest) {
      throw new Error("AntiQuest not found");
    }

    if (antiQuest.ownerId !== userId) {
      throw new Error("Access denied: Not the owner");
    }

    if (!antiQuest.severity) {
      throw new Error("Invalid AntiQuest: missing severity");
    }

    const now = new Date();
    const occurrenceTimestamp = timestamp || now.toISOString();

    // Validate timestamp is within 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const occurrenceDate = new Date(occurrenceTimestamp);
    if (occurrenceDate < thirtyDaysAgo || occurrenceDate > now) {
      throw new Error("Occurrence timestamp must be within the last 30 days");
    }

    // Apply XP penalty to user
    const user = await this.db.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const xpResult = applyXPPenaltyWithFloor(
      user.experiencePoints,
      antiQuest.severity.xpPenaltyPerEvent
    );

    // Update user XP
    user.experiencePoints = xpResult.newXP;
    await this.db.users.put(user);

    // Create occurrence record
    const occurrence: AntiQuestOccurrence = {
      id: `occ_${crypto.randomUUID()}`,
      timestamp: occurrenceTimestamp,
      xpPenalty: antiQuest.severity.xpPenaltyPerEvent,
      actualPenalty: xpResult.actualPenalty,
      notes,
    };

    // Initialize antiEvents array if needed
    if (!antiQuest.antiEvents) {
      antiQuest.antiEvents = [];
    }

    // Add occurrence (most recent first)
    antiQuest.antiEvents.unshift(occurrence);

    // Lock severity on first occurrence
    const isFirstOccurrence = antiQuest.antiEvents.length === 1;
    if (isFirstOccurrence && !antiQuest.severity.isLocked) {
      antiQuest.severity.isLocked = true;
      antiQuest.severity.lockedAt = now.toISOString();
      console.log(`[AntiQuestService] Severity locked for AntiQuest: ${antiQuestId}`);
    }

    // Update tracking stats
    antiQuest.antiTracking = this.calculateTracking(antiQuest.antiEvents);

    antiQuest.updatedAt = now.toISOString();

    // Save to database
    await this.db.quests.put(antiQuest);

    // Queue sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: antiQuestId,
      data: antiQuest,
      priority: 7,
      userId,
      retries: 0,
      error: null,
    });

    console.log(`[AntiQuestService] Logged occurrence for ${antiQuestId}: -${xpResult.actualPenalty} XP (requested: -${antiQuest.severity.xpPenaltyPerEvent})`);

    return { antiQuest, occurrence, xpResult };
  }

  /**
   * Calculate tracking stats from occurrences
   */
  private calculateTracking(events: AntiQuestOccurrence[]): AntiQuestTracking {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayCount = events.filter(e => new Date(e.timestamp) >= todayStart).length;
    const weekCount = events.filter(e => new Date(e.timestamp) >= weekStart).length;
    const monthCount = events.filter(e => new Date(e.timestamp) >= monthStart).length;

    // Calculate gaps between occurrences
    let longestGap = 0;
    if (events.length > 1) {
      // Events are sorted newest first, so iterate forward
      for (let i = 0; i < events.length - 1; i++) {
        const gap = Math.floor(
          (new Date(events[i].timestamp).getTime() - new Date(events[i + 1].timestamp).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        if (gap > longestGap) longestGap = gap;
      }
    }

    // Current gap (days since last occurrence)
    const lastOccurrence = events[0];
    const currentGap = lastOccurrence
      ? Math.floor((now.getTime() - new Date(lastOccurrence.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Total XP lost
    const totalXPLost = events.reduce((sum, e) => sum + (e.actualPenalty || e.xpPenalty), 0);

    return {
      totalOccurrences: events.length,
      occurrencesToday: todayCount,
      occurrencesThisWeek: weekCount,
      occurrencesThisMonth: monthCount,
      lastOccurredAt: lastOccurrence?.timestamp || null,
      currentGapDays: currentGap,
      longestGapDays: longestGap,
      totalXPLost,
    };
  }

  /**
   * Update AntiQuest details (only allowed if not locked)
   */
  async updateAntiQuest(
    antiQuestId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      severity?: Severity; // Only allowed if not locked
    }
  ): Promise<Quest> {
    const userId = await this.authService.getCurrentUserId();
    const antiQuest = await this.getAntiQuest(antiQuestId);

    if (!antiQuest) {
      throw new Error("AntiQuest not found");
    }

    if (antiQuest.ownerId !== userId) {
      throw new Error("Access denied: Not the owner");
    }

    // Check if severity change is allowed
    if (updates.severity && antiQuest.severity?.isLocked) {
      throw new Error("Cannot change severity after first occurrence. The severity is locked.");
    }

    // Apply updates
    if (updates.title !== undefined) {
      antiQuest.title = updates.title;
    }
    if (updates.description !== undefined) {
      antiQuest.description = updates.description;
    }
    if (updates.tags !== undefined) {
      antiQuest.tags = updates.tags;
    }
    if (updates.severity !== undefined && antiQuest.severity) {
      antiQuest.severity.userAssigned = updates.severity;
      antiQuest.severity.xpPenaltyPerEvent = SEVERITY_XP_PENALTIES[updates.severity];
      antiQuest.color = SEVERITY_COLORS[updates.severity].border;
    }

    antiQuest.updatedAt = new Date().toISOString();

    // Save to database
    await this.db.quests.put(antiQuest);

    // Queue sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: antiQuestId,
      data: antiQuest,
      priority: 7,
      userId,
      retries: 0,
      error: null,
    });

    return antiQuest;
  }

  /**
   * Archive/unarchive an AntiQuest
   */
  async archiveAntiQuest(antiQuestId: string): Promise<Quest> {
    const userId = await this.authService.getCurrentUserId();
    const antiQuest = await this.getAntiQuest(antiQuestId);

    if (!antiQuest) {
      throw new Error("AntiQuest not found");
    }

    if (antiQuest.ownerId !== userId) {
      throw new Error("Access denied: Not the owner");
    }

    // Toggle hidden
    antiQuest.hidden = !antiQuest.hidden;
    antiQuest.updatedAt = new Date().toISOString();

    // Save to database
    await this.db.quests.put(antiQuest);

    // Queue sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: antiQuestId,
      data: { hidden: antiQuest.hidden },
      priority: 7,
      userId,
      retries: 0,
      error: null,
    });

    return antiQuest;
  }

  /**
   * Delete an AntiQuest permanently
   */
  async deleteAntiQuest(antiQuestId: string): Promise<void> {
    const userId = await this.authService.getCurrentUserId();
    const antiQuest = await this.getAntiQuest(antiQuestId);

    if (!antiQuest) {
      throw new Error("AntiQuest not found");
    }

    if (antiQuest.ownerId !== userId) {
      throw new Error("Access denied: Not the owner");
    }

    await this.db.quests.delete(antiQuestId);

    // Queue sync
    await this.db.queueSync({
      operation: "delete",
      collection: "quests",
      documentId: antiQuestId,
      data: null,
      priority: 9,
      userId,
      retries: 0,
      error: null,
    });
  }



  /**
   * Get XP penalty for a severity level
   */
  getXPPenaltyForSeverity(severity: Severity): number {
    return SEVERITY_XP_PENALTIES[severity];
  }
}

// Singleton instance
let _antiQuestServiceInstance: AntiQuestService | null = null;

export function getAntiQuestService(): AntiQuestService {
  if (!_antiQuestServiceInstance) {
    _antiQuestServiceInstance = new AntiQuestService();
  }
  return _antiQuestServiceInstance;
}

/**
 * Calculate comprehensive analytics for an AntiQuest
 */
export async function calculateAntiQuestAnalytics(
  questId: string,
  timeRange: '7d' | '30d' | '90d' | 'all' = 'all'
): Promise<AntiQuestAnalytics> {
  const quest = await getQuestById(questId);
  
  if (!quest || quest.type !== 'AntiQuest') {
    throw new Error('Quest is not an AntiQuest');
  }

  const occurrences = quest.antiQuestData?.occurrences || [];
  
  // Filter occurrences based on time range
  const now = Date.now();
  const cutoffMap = {
    '7d': now - 7 * 24 * 60 * 60 * 1000,
    '30d': now - 30 * 24 * 60 * 60 * 1000,
    '90d': now - 90 * 24 * 60 * 60 * 1000,
    'all': 0
  };
  
  const filteredOccurrences = occurrences.filter(
    occ => new Date(occ.timestamp).getTime() >= cutoffMap[timeRange]
  );

  // Calculate gaps between occurrences
  const gaps = calculateGaps(filteredOccurrences);
  
  // Calculate trends
  const trends = calculateTrends(filteredOccurrences, gaps);

  return {
    totalOccurrences: filteredOccurrences.length,
    totalXPLost: filteredOccurrences.reduce((sum, occ) => sum + (occ.actualPenalty || occ.xpPenalty), 0),
    avgGap: gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
    longestGap: gaps.length > 0 ? Math.max(...gaps) : 0,
    currentGapDays: quest.antiQuestData?.tracking?.currentGapDays || 0,
    gaps,
    trends,
    occurrencesByDay: groupOccurrencesByDay(filteredOccurrences),
    xpLossByDay: calculateXPLossByDay(filteredOccurrences)
  };
}

/**
 * Calculate gaps between occurrences in days
 */
function calculateGaps(occurrences: AntiQuestOccurrence[]): number[] {
  if (occurrences.length < 2) return [];
  
  const sorted = [...occurrences].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].timestamp).getTime();
    const currTime = new Date(sorted[i].timestamp).getTime();
    const gapDays = (currTime - prevTime) / (1000 * 60 * 60 * 24);
    gaps.push(gapDays);
  }
  
  return gaps;
}

/**
 * Calculate trend indicators
 */
function calculateTrends(
  occurrences: AntiQuestOccurrence[],
  gaps: number[]
): {
  occurrenceTrend: number;
  xpLossTrend: number;
  gapTrend: number;
} {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
  
  const recent = occurrences.filter(
    occ => new Date(occ.timestamp).getTime() >= thirtyDaysAgo
  );
  const previous = occurrences.filter(
    occ => {
      const time = new Date(occ.timestamp).getTime();
      return time >= sixtyDaysAgo && time < thirtyDaysAgo;
    }
  );
  
  // Occurrence trend (negative is good - fewer occurrences)
  const occurrenceTrend = previous.length > 0
    ? ((recent.length - previous.length) / previous.length) * 100
    : 0;
  
  // XP loss trend (negative is good - less XP lost)
  const recentXP = recent.reduce((sum, occ) => sum + (occ.actualPenalty || occ.xpPenalty), 0);
  const previousXP = previous.reduce((sum, occ) => sum + (occ.actualPenalty || occ.xpPenalty), 0);
  const xpLossTrend = previousXP > 0
    ? ((recentXP - previousXP) / previousXP) * 100
    : 0;
  
  // Gap trend (positive is good - longer gaps)
  const recentGaps = gaps.slice(-5);
  const previousGaps = gaps.slice(-10, -5);
  const avgRecentGap = recentGaps.length > 0
    ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length
    : 0;
  const avgPreviousGap = previousGaps.length > 0
    ? previousGaps.reduce((a, b) => a + b, 0) / previousGaps.length
    : 0;
  const gapTrend = avgPreviousGap > 0
    ? ((avgRecentGap - avgPreviousGap) / avgPreviousGap) * 100
    : 0;
  
  return { occurrenceTrend, xpLossTrend, gapTrend };
}

/**
 * Group occurrences by day for frequency chart
 */
function groupOccurrencesByDay(occurrences: AntiQuestOccurrence[]): Array<{
  date: string;
  count: number;
}> {
  const grouped = new Map<string, number>();
  
  occurrences.forEach(occ => {
    const date = new Date(occ.timestamp).toISOString().split('T')[0];
    grouped.set(date, (grouped.get(date) || 0) + 1);
  });
  
  return Array.from(grouped.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate XP loss by day for area chart
 */
function calculateXPLossByDay(occurrences: AntiQuestOccurrence[]): Array<{
  date: string;
  xpLoss: number;
}> {
  const grouped = new Map<string, number>();
  
  occurrences.forEach(occ => {
    const date = new Date(occ.timestamp).toISOString().split('T')[0];
    const xp = occ.actualPenalty || occ.xpPenalty;
    grouped.set(date, (grouped.get(date) || 0) + xp);
  });
  
  return Array.from(grouped.entries())
    .map(([date, xpLoss]) => ({ date, xpLoss }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get gap timeline data for visualization
 */
export async function getAntiQuestGapTimeline(
  questId: string,
  timeRange: '7d' | '30d' | '90d' | 'all' = 'all'
): Promise<Array<{
  date: string;
  gap: number;
  improving: boolean;
}>> {
  const analytics = await calculateAntiQuestAnalytics(questId, timeRange);
  const { gaps } = analytics;
  
  if (gaps.length === 0) return [];
  
  const quest = await getQuestById(questId);
  const occurrences = quest?.antiQuestData?.occurrences || [];
  
  return gaps.map((gap, index) => {
    const prevGap = index > 0 ? gaps[index - 1] : gap;
    const improving = gap > prevGap;
    const occurrenceDate = occurrences[index + 1]?.timestamp || new Date().toISOString();
    
    return {
      date: new Date(occurrenceDate).toISOString().split('T')[0],
      gap,
      improving
    };
  });
}