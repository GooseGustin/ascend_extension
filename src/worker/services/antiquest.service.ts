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
import { ActivityFeedService } from "./activity-feed.service";

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

    // Log activity for antiquest creation
    const userProfile = await this.db.users.get(userId);
    if (userProfile) {
      const activityService = new ActivityFeedService();
      await activityService.addActivity({
        activityId: `antiquest_create_${antiQuestId}`,
        type: 'antiquest_create',
        userId,
        username: userProfile.username,
        timestamp: new Date().toISOString(),
        data: {
          questId: antiQuestId,
          antiQuestTitle: antiQuest.title
        }
      });
    }

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

    // Log activity for XP deduction
    const activityService = new ActivityFeedService();
    await activityService.addActivity({
      activityId: `xp_deduction_${occurrence.id}`,
      type: 'xp_deduction',
      userId,
      username: user.username,
      timestamp: new Date().toISOString(),
      data: {
        questId: antiQuestId,
        antiQuestTitle: antiQuest.title,
        xpDeducted: xpResult.actualPenalty
      }
    });

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
