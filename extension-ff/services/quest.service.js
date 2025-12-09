/**
 * QuestService
 * Handles quest CRUD operations, watching, joining
 */
import { getDB } from "../db/indexed-db";
import { AuthService } from "./auth.service";
import { GMService } from "./gm/gm.service"; //
import { AnalyticsService } from "./analytics.service"; //
export class QuestService {
    constructor() {
        this.db = getDB();
        this.QUEST_COLORS = [
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
        this.db = getDB();
        this.authService = new AuthService();
        // Setup for GMService: Instantiate dependencies
        const analyticsService = new AnalyticsService(); // ADDED
        // GMService expects IQuestService. We pass 'this' and cast it, assuming QuestService implements the necessary methods.
        this.gmService = new GMService(analyticsService, this); // ADDED
    }
    /**
     * Get all user's quests
     */
    async getUserQuests(userId) {
        const quests = await this.db.quests
            .where("ownerId")
            .equals(userId)
            .toArray();
        console.log("in quest service, leaving getuserquests", quests);
        return quests;
    }
    /**
     * Get single quest by ID
     */
    async getQuest(questId) {
        return await this.db.quests.get(questId);
    }
    /**
     * Saves or updates a quest in the local database and queues a sync operation.
     */
    async saveQuest(quest) {
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
    async updateQuest(questId, updates) {
        const userId = await this.authService.getCurrentUserId();
        const quest = await this.getQuest(questId);
        if (!quest)
            throw new Error("Quest not found.");
        if (quest.ownerId !== userId)
            throw new Error("Access denied: Not the owner.");
        // --- Step 4.2: GM Difficulty Lock Enforcement ---
        // Check if the user is attempting to modify the 'userAssigned' difficulty field
        const isDifficultyBeingModified = updates.difficulty &&
            updates.difficulty.userAssigned !== quest.difficulty.userAssigned;
        if (isDifficultyBeingModified && quest.difficulty.isLocked) {
            // ENFORCEMENT: Block modification of difficulty if GM has validated and locked it.
            throw new Error("GM Lock active: Difficulty cannot be modified after Grandmaster validation.");
        }
        // Check for changes that should trigger GM re-validation
        const triggersRevalidation = isDifficultyBeingModified ||
            (updates.subtasks && (updates.subtasks.length !== quest.subtasks.length)) ||
            (updates.timeEstimateHours !== undefined && updates.timeEstimateHours !== quest.timeEstimateHours);
        // Apply basic updates
        const updatedQuest = {
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
            // Set status to queued (optimistically)
            updatedQuest.validationStatus = 'queued';
            // Commit the status change and queue the GM operation
            await this.saveQuest(updatedQuest);
            await this.gmService.queueValidation(userId, questId);
        }
        return updatedQuest;
    }
    /**
     * Get watched quests (where user is in watchers array)
     */
    async getWatchedQuests(userId) {
        const allQuests = await this.db.quests.toArray();
        console.log("in quest service, leaving getwatchedquests", allQuests);
        return allQuests.filter((q) => q.watchers.includes(userId));
    }
    /**
     * Toggle watch status on a quest
     */
    async toggleWatch(userId, questId) {
        const quest = await this.db.quests.get(questId);
        if (!quest)
            throw new Error("Quest not found");
        const isWatching = quest.watchers.includes(userId);
        if (isWatching) {
            // Remove from watchers
            quest.watchers = quest.watchers.filter((id) => id !== userId);
        }
        else {
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
    async getQuestComments(questId) {
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
    async addComment(questId, userId, username, text, type = "encouragement") {
        const comment = {
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
    async getPublicQuests(limit = 20) {
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
    async createQuest(questData) {
        const userId = await this.authService.getCurrentUserId();
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
        const totalPomodoros = subtasks.reduce((sum, st) => sum + st.estimatePomodoros, 0);
        const totalMinutes = totalPomodoros * questData.schedule.pomodoroDurationMin;
        const timeEstimateHours = questData.timeEstimateHours ?? totalMinutes / 60; // Use explicit value if provided, else calculate
        // Create the quest object
        const quest = {
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
            color: this.QUEST_COLORS[Math.floor(Math.random() * this.QUEST_COLORS.length)],
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
                targetCompletionsPerCycle: questData.schedule.frequency === "Daily" ? 1 : 7,
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
                currentLevel: 1,
                currentExp: 0,
                expToNextLevel: 500,
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
            quest.isTrackAligned = this.isQuestAlignedWithTrack(quest, userProfile.specializationTrack);
        }
        // Save to database
        await this.db.quests.add(quest);
        // Create sync operation
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
        // NEW: Trigger GM Validation Queue for new quests (unless it's a Trivial TodoQuest)
        if (!isTodoQuest) {
            await this.gmService.queueValidation(userId, questId);
        }
        return quest;
    }
    /**
     * Get XP per pomodoro based on difficulty
     */
    getXpForDifficulty(difficulty) {
        const xpMap = {
            Trivial: 50,
            Easy: 100,
            Medium: 200,
            Hard: 300,
            Epic: 500,
        };
        return xpMap[difficulty] || 100;
    }
    /**
     * Check if quest aligns with user's specialization track
     */
    isQuestAlignedWithTrack(quest, track) {
        // Simple heuristic based on tags
        const trackKeywords = {
            Architect: ["build", "design", "create", "develop", "code", "system"],
            Scholar: ["learn", "study", "research", "read", "analyze", "understand"],
            Vanguard: ["lead", "manage", "organize", "plan", "coordinate", "execute"],
        };
        const keywords = trackKeywords[track];
        const questText = `${quest.title} ${quest.description} ${quest.tags.join(" ")}`.toLowerCase();
        return keywords.some((keyword) => questText.includes(keyword));
    }
    /**
     * Add a subtask to an existing quest
     */
    async addSubtask(questId, subtaskData) {
        const quest = await this.db.quests.get(questId);
        if (!quest)
            throw new Error("Quest not found");
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
    async deleteQuest(userId, questId) {
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
            await this.db.taskOrders.delete(order.id).catch(() => { });
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
}
