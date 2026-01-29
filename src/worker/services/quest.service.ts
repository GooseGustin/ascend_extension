/**
 * QuestService
 * Handles quest CRUD operations, watching, joining
 */

import { getDB } from "../db/indexed-db";
import type { Quest } from "../models/Quest";
import type { GoalComment } from "../models/GoalComment";
import { AuthService } from "./auth.service";
import { GMService } from "./gm/gm.service"; //
import { AnalyticsService } from "./analytics.service"; //

export class QuestService {
  private db = getDB();
  private authService: AuthService;
  public gmService: GMService; // ADDED
  private QUEST_COLORS = [
    "#4F8EF7",
    "#5CC8FF",
    "#3FA9D9",
    "#6ED3CF",
    "#7A85FF",
    "#4CB944",
    "#67D28B",
    "#A2E05A",
    "#FFB86B",
    "#FF9F6E",
    "#EFBF8C",
    "#FF6E6E",
    "#FF8CA3",
    "#E96075",
    "#A779E9",
    "#C59FFF",
    "#9A6AFF",
    "#2F4858",
    "#3D5A80",
    "#5C677D",
  ];

  constructor() {
    this.db = getDB();
    this.authService = new AuthService();
    // Setup for GMService: Instantiate dependencies
    const analyticsService = new AnalyticsService(); // ADDED
    // GMService expects IQuestService. We pass 'this' and cast it, assuming QuestService implements the necessary methods.
    this.gmService = new GMService(analyticsService, this as any); // ADDED
  }


  /**
   * Get all user's quests (excludes hidden/archived quests)
   */
  async getUserQuests(userId: string): Promise<Quest[]> {
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    console.log("in quest service, leaving getuserquests", quests);
    return quests.filter(q => !q.hidden);
  }

  /**
   * Get archived/hidden quests for a user
   */
  async getArchivedQuests(userId: string): Promise<Quest[]> {
    const quests = await this.db.quests
      .where("ownerId")
      .equals(userId)
      .toArray();
    return quests.filter(q => q.hidden === true);
  }

  /**
   * Get single quest by ID
   */
  async getQuest(questId: string): Promise<Quest | undefined> {
    return await this.db.quests.get(questId);
  }

  /**
   * Saves or updates a quest in the local database and queues a sync operation.
   */
  async saveQuest(quest: Quest): Promise<void> {
    await this.db.quests.put(quest);

    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: quest.questId,
      data: quest, // Sending the full object for consistency
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });
  }

/**
   * Updates fields on an existing quest, enforces GM difficulty lock, 
   * and triggers GM re-validation if key properties are changed.
   * This is the primary method for UI to modify an existing quest.
   */
  async updateQuest(
    questId: string,
    updates: Partial<Quest>
  ): Promise<Quest> {
    const userId = await this.authService.getCurrentUserId();
    const quest = await this.getQuest(questId);

    if (!quest) throw new Error("Quest not found.");
    if (quest.ownerId !== userId) throw new Error("Access denied: Not the owner.");
    
    // --- Step 4.2: GM Difficulty Lock Enforcement ---
    // Check if the user is attempting to modify the 'userAssigned' difficulty field
    const isDifficultyBeingModified = updates.difficulty && 
      (updates.difficulty as Quest['difficulty']).userAssigned !== quest.difficulty.userAssigned;

    if (isDifficultyBeingModified && quest.difficulty.isLocked) {
      // ENFORCEMENT: Block modification of difficulty if GM has validated and locked it.
      throw new Error("GM Lock active: Difficulty cannot be modified after Grandmaster validation.");
    }
    
    // Check for changes that should trigger GM re-validation
    const triggersRevalidation = 
        isDifficultyBeingModified ||
        (updates.subtasks && (updates.subtasks.length !== quest.subtasks.length)) ||
        (updates.timeEstimateHours !== undefined && updates.timeEstimateHours !== quest.timeEstimateHours);

    // Apply basic updates
    const updatedQuest: Quest = {
      ...quest,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Special handling for nested difficulty updates
    if (updates.difficulty) {
        updatedQuest.difficulty = {
            ...quest.difficulty,
            ...updates.difficulty,
            // If user changes difficulty, wipe GM validation data and unlock it
            gmValidated: isDifficultyBeingModified ? null : updatedQuest.difficulty.gmValidated,
            isLocked: isDifficultyBeingModified ? false : updatedQuest.difficulty.isLocked,
            validatedAt: isDifficultyBeingModified ? null : updatedQuest.difficulty.validatedAt,
            confidence: isDifficultyBeingModified ? 0 : updatedQuest.difficulty.confidence,
        };
    }

    // Save the updated quest locally and queue for sync
    await this.saveQuest(updatedQuest);

    // --- Step 4.1: Trigger Re-validation Hook ---
    if (triggersRevalidation) {
      console.log(`[QuestService] 🔄 Quest update triggers revalidation: ${questId}`);
      console.log(`[QuestService] Reason: difficulty=${isDifficultyBeingModified}, subtasks changed=${updates.subtasks && (updates.subtasks.length !== quest.subtasks.length)}, time changed=${updates.timeEstimateHours !== undefined && updates.timeEstimateHours !== quest.timeEstimateHours}`);

      // Set status to queued (optimistically)
      updatedQuest.validationStatus = 'queued';
      // Commit the status change and queue the GM operation
      await this.saveQuest(updatedQuest);

      console.log(`[QuestService] 🎯 QUEUEING VALIDATION (UPDATE) for quest ${questId}`);
      await this.gmService.queueValidation(userId, questId);
      console.log(`[QuestService] ✅ Validation queued successfully (UPDATE)`);

      // Verify queue
      const db = await import('../db/indexed-db').then(m => m.getDB());
      const queueContents = await db.getPendingSyncOps(10);
      const gmOps = queueContents.filter(op => op.collection === 'gm_validation');
      console.log(`[QuestService] 🔍 Queue verification (UPDATE): ${gmOps.length} GM validations queued`);
    }
    
    return updatedQuest;
  }

  /**
   * Get watched quests (where user is in watchers array)
   */
  async getWatchedQuests(userId: string): Promise<Quest[]> {
    const allQuests = await this.db.quests.toArray();
    console.log("in quest service, leaving getwatchedquests", allQuests);
    return allQuests.filter((q) => q.watchers.includes(userId));
  }

  /**
   * Toggle watch status on a quest
   */
  async toggleWatch(userId: string, questId: string): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error("Quest not found");

    const isWatching = quest.watchers.includes(userId);

    if (isWatching) {
      // Remove from watchers
      quest.watchers = quest.watchers.filter((id) => id !== userId);
    } else {
      // Add to watchers
      quest.watchers.push(userId);
    }

    // Use put when replacing the entire object (update expects a partial UpdateSpec)
    await this.db.quests.put(quest);

    // Queue for sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: quest,
      priority: 6,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });

    return quest;
  }

  /**
   * Get comments for a quest
   */
  async getQuestComments(questId: string): Promise<GoalComment[]> {
    console.log("getting quest comments");
    const comments = await this.db.comments
      .where("questId")
      .equals(questId)
      .sortBy("timestamp");
    console.log("leaving get quest comments", comments);
    return comments;
  }

  /**
   * Add comment to quest
   */
  async addComment(
    questId: string,
    userId: string,
    username: string,
    text: string,
    type: "encouragement" | "question" | "suggestion" = "encouragement"
  ): Promise<GoalComment> {
    const comment: GoalComment = {
      id: crypto.randomUUID(),
      questId,
      userId,
      username,
      text,
      type,
      timestamp: new Date().toISOString(),
      editedAt: null,
      reactions: [],
    };

    await this.db.comments.add(comment);

    // Queue for sync
    await this.db.queueSync({
      operation: "create",
      collection: "comments",
      documentId: comment.id,
      data: comment,
      priority: 6,
      userId: comment.userId,
      retries: 0,
      error: null,
    });

    return comment;
  }

  /**
   * Get public/discoverable quests
   */
  async getPublicQuests(limit: number = 20): Promise<Quest[]> {
    return await this.db.quests
      .where("isPublic")
      .equals(1)
      .limit(limit)
      .toArray();
  }

  /**
   * Join a guild/dungeon quest
  async joinQuest(userId: string, questId: string): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error("Quest not found");

    if (!quest.members.includes(userId)) {
      quest.members.push(userId);
    }

    // Use put to replace the full Quest object instead of update (which expects an UpdateSpec)
    await this.db.quests.put(quest);

    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: quest,
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });

    return quest;
  }
  }

  /**
   * Create a new quest with full configuration
   */
  async createQuest(questData: {
    title: string;
    description: string;
    type: "Quest" | "DungeonQuest" | "TodoQuest";
    difficulty: "Trivial" | "Easy" | "Medium" | "Hard" | "Epic";
    priority: "A" | "B" | "C";
    isPublic: boolean;
    behavior: "repeating" | "progressive"; // Required: defines quest behavior mode
    dueDate?: string;
    tags: string[];
    schedule: {
      frequency: "Daily" | "Weekly";
      customDays?: number[];
      pomodoroDurationMin: number;
      breakDurationMin: number;
    };
    subtasks: Array<{
      title: string;
      estimatePomodoros: number;
    }>;
    icon?: string;
    // NOTE: timeEstimateHours will be derived from subtasks for initial object
    timeEstimateHours?: number; // ADDED to questData interface for completeness
  }): Promise<Quest> {
    const userId = await this.authService.getCurrentUserId();

    // Anti-abuse: Check Epic quest limits
    if (questData.difficulty === "Epic") {
      await this.checkEpicQuestLimits(userId);
    }

    // Calculate XP per pomodoro based on difficulty
    const isTodoQuest = questData.type === "TodoQuest";
    const userDifficulty = isTodoQuest ? "Trivial" : questData.difficulty;
    const xpPerPomodoro = this.getXpForDifficulty(userDifficulty);

    // Generate quest ID
    // recommended
    const questId = `quest_${crypto.randomUUID()}`;

    // Create subtasks with proper IDs
    const subtasks = questData.subtasks
      .filter((st) => st.title.trim())
      .map((st, index) => ({
        id: `subtask_${questId}_${index}`,
        title: st.title.trim(),
        estimatePomodoros: st.estimatePomodoros,
        isComplete: false,
        completedAt: null,
        revisionCount: 0,
      }));

    // Determine quest type flags
    const isDungeon = questData.type === "DungeonQuest";

    // Calculate total estimated time in minutes from subtasks
    const totalPomodoros = subtasks.reduce(
      (sum, st) => sum + st.estimatePomodoros,
      0
    );
    const totalMinutes =
      totalPomodoros * questData.schedule.pomodoroDurationMin;
    const calculatedHours = totalMinutes > 0 ? totalMinutes / 60 : 1; // Default to 1 hour if no subtasks
    const timeEstimateHours = questData.timeEstimateHours ?? calculatedHours; // Use explicit value if provided, else calculate

    console.log(`[QuestService] timeEstimateHours calculation: totalPomodoros=${totalPomodoros}, totalMinutes=${totalMinutes}, timeEstimateHours=${timeEstimateHours}`);

    /*
    XP to next level chart
    Level | Total XP Required
    0     | 0
    1     | ~22
    2     | ~49
    3     | ~82
    4     | ~123
    5     | ~172
    6     | ~232
    7     | ~306
    8     | ~395
    9     | ~505
    10    | ~639
    11    | ~803
    12    | ~1,002
    13    | ~1,246
    14    | ~1,544
    15    | ~1,909
    16    | ~2,353
    17    | ~2,896
    18    | ~3,560
    19    | ~4,370
    20    | ~5,360
    21    | ~6,569
    22    | ~8,045
    23    | ~9,848
    24    | ~12,051
    25    | ~14,741
    */

    // Create the quest object
    const quest: Quest = {
      questId,
      ownerId: userId,
      title: questData.title,
      description: questData.description,
      type: questData.type,
      isDungeon,
      isPublic: questData.isPublic,
      tags: questData.tags,
      hidden: false,
      priority: questData.priority,
      behavior: questData.behavior, // Set behavioral mode
      color:
        this.QUEST_COLORS[Math.floor(Math.random() * this.QUEST_COLORS.length)],
      timeEstimateHours,
      validationStatus: isTodoQuest ? "validated" : "queued",

      difficulty: {
        userAssigned: isTodoQuest ? "Trivial" : questData.difficulty,
        gmValidated: null,
        isLocked: false,
        validatedAt: null,
        xpPerPomodoro: isTodoQuest ? 50 : xpPerPomodoro,
      },

      schedule: {
        frequency: questData.schedule.frequency,
        targetCompletionsPerCycle:
          questData.schedule.frequency === "Daily" ? 1 : 7,
        pomodoroDurationMin: questData.schedule.pomodoroDurationMin,
        breakDurationMin: questData.schedule.breakDurationMin,
        preferredTimeSlots: [],
        customDays: questData.schedule.customDays,
      },

      subtasks,

      watchers: [],
      members: isDungeon ? [userId] : [],
      isTrackAligned: false, // Will be calculated based on specialization
      dueDate: questData.dueDate || null,
      isCompleted: false,
      completedAt: null,

      activeBuffs: [],

      gamification: {
        currentLevel: 0,
        currentExp: 0,
        expToNextLevel: 22,
      },

      progressHistory: [],

      tracking: {
        totalTrackedTime: 0,
        velocity: 0,
        averageSessionQuality: 0,
        lastSessionAt: null,
      },

      registeredAt: null, // Will be set when GM validates
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Check track alignment
    const userProfile = await this.db.users.get(userId);
    if (userProfile) {
      quest.isTrackAligned = this.isQuestAlignedWithTrack(
        quest,
        userProfile.specializationTrack
      );
    }

    // Save to database
    console.log(`[QuestService] Saving quest to database...`);
    await this.db.quests.add(quest);
    console.log(`[QuestService] Quest saved to database: ${questId}`);

    // Create sync operation
    console.log(`[QuestService] Creating sync operation...`);
    await this.db.queueSync({
      operation: "create",
      collection: "quests",
      documentId: questId,
      data: quest,
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });
    console.log(`[QuestService] Sync operation queued`);

    // NEW: Trigger GM Validation Queue for new quests (unless it's a Trivial TodoQuest)
    console.log(`[QuestService] Quest type check: isTodoQuest=${isTodoQuest}, type=${questData.type}`);
    if (!isTodoQuest) {
      console.log(`[QuestService] 🎯 QUEUEING VALIDATION for quest ${questId}`);
      await this.gmService.queueValidation(userId, questId);
      console.log(`[QuestService] ✅ Validation queued successfully - should appear in next GM queue check`);

      // Immediately check queue to verify
      const db = await import('../db/indexed-db').then(m => m.getDB());
      const queueContents = await db.getPendingSyncOps(10);
      const gmOps = queueContents.filter(op => op.collection === 'gm_validation');
      console.log(`[QuestService] 🔍 Queue verification: ${gmOps.length} GM validations queued`);
    } else {
      console.log(`[QuestService] Skipping validation for TodoQuest`);
    }

    console.log(`[QuestService] Quest creation completed: ${questId}`);
    return quest;
  }

  /**
   * Get XP per pomodoro based on difficulty
   */
  private getXpForDifficulty(difficulty: string): number {
    const xpMap = {
      Trivial: 20,
      Easy: 40, 
      Medium: 80,
      Hard: 150, 
      Epic: 300, 
    };
    return xpMap[difficulty as keyof typeof xpMap] || 100;
  }

  /**
   * Check if quest aligns with user's specialization track
   */
  private isQuestAlignedWithTrack(
    quest: Quest,
    track: "Architect" | "Scholar" | "Vanguard"
  ): boolean {
    // Simple heuristic based on tags
    const trackKeywords = {
      Architect: ["build", "design", "create", "develop", "code", "system"],
      Scholar: ["learn", "study", "research", "read", "analyze", "understand"],
      Vanguard: ["lead", "manage", "organize", "plan", "coordinate", "execute"],
    };

    const keywords = trackKeywords[track];
    const questText = `${quest.title} ${quest.description} ${quest.tags.join(
      " "
    )}`.toLowerCase();

    return keywords.some((keyword) => questText.includes(keyword));
  }

  /**
   * Toggle subtask completion and check if quest should be marked complete
   */
  async toggleSubtaskComplete(
    questId: string,
    subtaskId: string
  ): Promise<{ quest: Quest; questJustCompleted: boolean }> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error("Quest not found");

    // Find and toggle the subtask
    const subtaskIndex = quest.subtasks.findIndex(st => st.id === subtaskId);
    if (subtaskIndex === -1) throw new Error("Subtask not found");

    const subtask = quest.subtasks[subtaskIndex];
    const wasComplete = subtask.isComplete;

    // Toggle completion
    quest.subtasks[subtaskIndex] = {
      ...subtask,
      isComplete: !wasComplete,
      completedAt: !wasComplete ? new Date().toISOString() : null,
    };

    // Check if all subtasks are now complete
    const allSubtasksComplete = quest.subtasks.length > 0 &&
      quest.subtasks.every(st => st.isComplete);

    let questJustCompleted = false;

    // If all subtasks complete and quest wasn't already completed, mark it complete
    if (allSubtasksComplete && !quest.isCompleted) {
      quest.isCompleted = true;
      quest.completedAt = new Date().toISOString();
      questJustCompleted = true;

      // Add completion milestone to progress history
      const totalXpEarned = quest.subtasks.reduce(
        (sum, st) => sum + (st.estimatePomodoros * quest.difficulty.xpPerPomodoro),
        0
      );

      quest.progressHistory.push({
        date: new Date().toISOString(),
        sessionsCompleted: quest.subtasks.length,
        expEarned: Math.round(totalXpEarned * 0.1), // Bonus 10% XP for completion
        isMilestone: true,
        notes: `Quest completed! All ${quest.subtasks.length} subtasks finished.`,
      });

      console.log(`[QuestService] 🎉 Quest "${quest.title}" marked as COMPLETED!`);
    }

    // If a subtask was unchecked and quest was completed, un-complete the quest
    if (wasComplete && !subtask.isComplete && quest.isCompleted) {
      quest.isCompleted = false;
      quest.completedAt = null;
      console.log(`[QuestService] Quest "${quest.title}" marked as incomplete (subtask unchecked)`);
    }

    quest.updatedAt = new Date().toISOString();

    // Save to database
    await this.db.quests.put(quest);

    // Queue sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: quest,
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });

    return { quest, questJustCompleted };
  }

  /**
   * Add a subtask to an existing quest
   */
  async addSubtask(
    questId: string,
    subtaskData: {
      title: string;
      estimatePomodoros?: number;
    }
  ): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error("Quest not found");

    const newSubtask = {
      id: `subtask_${questId}_${Date.now()}`,
      title: subtaskData.title.trim(),
      estimatePomodoros: subtaskData.estimatePomodoros || 1,
      isComplete: false,
      completedAt: null,
      revisionCount: 0,
    };

    quest.subtasks.push(newSubtask);
    quest.updatedAt = new Date().toISOString();

    await this.db.quests.put(quest);

    // Sync
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: { subtasks: quest.subtasks },
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });

    return quest;
  }

  /**
   * Permanently delete a quest and its associated data
   */
  async deleteQuest(userId: string, questId: string): Promise<void> {
    // Validate quest exists and user owns it
    const quest = await this.db.quests.get(questId);
    if (!quest) {
      throw new Error("Quest not found");
    }
    if (quest.ownerId !== userId) {
      throw new Error("Access denied");
    }

    // Delete quest itself
    await this.db.quests.delete(questId);

    // Remove taskOrders that reference this quest
    const allOrders = await this.db.taskOrders
      .where("questId")
      .equals(questId)
      .toArray();
    for (const order of allOrders) {
      console.log("Deleting task orders");
      await this.db.taskOrders.delete(order.id).catch(() => {});
    }
    console.log("[deleteQuest, QuestService], did the taskOrders get deleted?");

    // Log activity feed entry
    // await this.db.addActivity({
    //   id: crypto.randomUUID(),
    //   type: "quest_deleted",
    //   userId,
    //   questId,
    //   timestamp: new Date().toISOString(),
    // });

    // Queue sync operation
    await this.db.queueSync({
      operation: "delete",
      collection: "quests",
      documentId: questId,
      data: null,
      priority: 9,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });
  }

  /**
   * Archive/unarchive a quest (toggle hidden property)
   */
  async archiveQuest(userId: string, questId: string): Promise<Quest> {
    // Validate quest exists and user owns it
    const quest = await this.db.quests.get(questId);
    if (!quest) {
      throw new Error("Quest not found");
    }
    if (quest.ownerId !== userId) {
      throw new Error("Access denied");
    }

    // Toggle hidden property
    const updatedQuest = {
      ...quest,
      hidden: !quest.hidden,
      updatedAt: new Date().toISOString(),
    };

    // Update in database
    await this.db.quests.put(updatedQuest);

    // Queue sync operation
    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: { hidden: updatedQuest.hidden },
      priority: 7,
      userId: quest.ownerId,
      retries: 0,
      error: null,
    });

    return updatedQuest;
  }

  /**
   * Check Epic quest creation limits
   * Anti-abuse: Max 3 active Epic quests, 1 hour cooldown between creations
   */
  private async checkEpicQuestLimits(userId: string): Promise<void> {
    // Check active Epic quest count (max 3)
    const activeEpicQuests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .filter(q =>
        q.difficulty.userAssigned === 'Epic' &&
        !q.isCompleted
      )
      .toArray();

    if (activeEpicQuests.length >= 3) {
      throw new Error('EPIC_LIMIT_REACHED: You can only have 3 active Epic quests at a time. Complete or delete an existing Epic quest before creating a new one.');
    }

    // Check cooldown (1 hour between Epic quest creations)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const recentEpicQuests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .filter(q =>
        q.difficulty.userAssigned === 'Epic' &&
        q.createdAt >= oneHourAgo
      )
      .toArray();

    if (recentEpicQuests.length > 0) {
      const lastCreated = recentEpicQuests
        .map(q => new Date(q.createdAt).getTime())
        .sort((a, b) => b - a)[0];

      const timeSinceLastEpic = Date.now() - lastCreated;
      const minutesRemaining = Math.ceil((3600000 - timeSinceLastEpic) / 60000);

      throw new Error(`EPIC_COOLDOWN: You can only create one Epic quest per hour. Please wait ${minutesRemaining} more minute(s).`);
    }
  }

  /**
   * Get Epic quest statistics for UI
   */
  async getEpicQuestStats(userId: string): Promise<{
    activeCount: number;
    maxCount: number;
    canCreate: boolean;
    cooldownMinutes: number;
  }> {
    const activeEpicQuests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .filter(q =>
        q.difficulty.userAssigned === 'Epic' &&
        !q.isCompleted
      )
      .toArray();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentEpicQuests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .filter(q =>
        q.difficulty.userAssigned === 'Epic' &&
        q.createdAt >= oneHourAgo
      )
      .toArray();

    let cooldownMinutes = 0;
    if (recentEpicQuests.length > 0) {
      const lastCreated = recentEpicQuests
        .map(q => new Date(q.createdAt).getTime())
        .sort((a, b) => b - a)[0];

      const timeSinceLastEpic = Date.now() - lastCreated;
      cooldownMinutes = Math.max(0, Math.ceil((3600000 - timeSinceLastEpic) / 60000));
    }

    const canCreate = activeEpicQuests.length < 3 && cooldownMinutes === 0;

    return {
      activeCount: activeEpicQuests.length,
      maxCount: 3,
      canCreate,
      cooldownMinutes,
    };
  }
}
