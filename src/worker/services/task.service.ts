/**
 * TaskService
 * Handles task ordering, smart sorting, bulk operations
 */

import { getDB } from "../db/indexed-db";
import { sortQuestsByPriority } from "../utils/task-sorting.util";
import type { Quest } from "../models/Quest";
import type { TaskOrder, TaskOrderItem } from "../models/TaskOrder";
import { AuthService } from "./auth.service";
import { Task } from "../../App";
import { ActivityFeedService } from "./activity-feed.service";

export class TaskService {
  private db = getDB();
  constructor() {
    // this.db = getDB(); // now guaranteed singleton
  }
  private authService = new AuthService();

  /**
   * Get today's tasks with smart sorting
   */
  async getTodaysTasks(userId: string): Promise<Quest[]> {
    // Fetch all active quests
    const allQuests = await this.db.getActiveQuests(userId);

    // IMPORTANT: Filter out AntiQuests - they don't appear in Today's tasks
    const quests = allQuests.filter(q => q.type !== 'AntiQuest');
    console.log("In task service. User active quests (excluding AntiQuests)", quests);

    // Process repeating quests (regenerate subtasks if needed, filter by schedule)
    const processedQuests = await this.processRepeatingQuests(quests);

    // Apply smart sorting
    const sorted = sortQuestsByPriority(processedQuests);

    // Apply user's custom order if exists
    const customOrdered = await this.applyCustomOrder(userId, sorted as Quest[]);
    console.log("leaving get today's tasks", sorted, customOrdered);

    return customOrdered;
  }

  /**
   * Process repeating quests - regenerate subtasks at cycle boundaries and filter by schedule
   */
  private async processRepeatingQuests(quests: Quest[]): Promise<Quest[]> {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    const visibleQuests: Quest[] = [];

    for (const quest of quests) {
      // For progressive quests, always show them
      if (quest.behavior === "progressive") {
        visibleQuests.push(quest);
        continue;
      }

      // For repeating quests, check schedule
      if (quest.behavior === "repeating") {
        const { frequency } = quest.schedule;

        // Check if quest should be visible today
        let shouldShow = false;

        if (frequency === "Daily") {
          shouldShow = true; // Always show daily quests
        } else if (frequency === "Weekly") {
          // Show only on specified weekdays
          const customDays = quest.schedule.customDays || [];
          shouldShow = customDays.includes(dayOfWeek);
        }

        if (!shouldShow) {
          continue; // Skip this quest for today
        }

        // Quest is visible today - check if we need to regenerate subtasks
        const shouldRegenerate = this.shouldRegenerateSubtasks(quest, today);

        if (shouldRegenerate) {
          console.log(`[TaskService] Regenerating subtasks for repeating quest: ${quest.questId}`);

          // Store completed subtasks in progress history before regenerating
          const completedCount = quest.subtasks.filter(st => st.isComplete).length;
          if (completedCount > 0) {
            const historyEntry = quest.progressHistory.find(h => h.date === today);
            if (historyEntry) {
              historyEntry.completions += completedCount;
            } else {
              quest.progressHistory.push({
                date: today,
                completions: completedCount,
                expEarned: 0, // XP is tracked separately via sessions
                timeSpentMin: 0,
                isMilestone: false,
                sessionsCompleted: 0,
              });
            }
          }

          // Reset all subtasks to incomplete
          quest.subtasks.forEach(subtask => {
            subtask.isComplete = false;
            subtask.completedAt = null;
          });

          // Save updated quest
          await this.db.quests.put(quest);

          // Queue for sync
          await this.db.queueSync({
            operation: "update",
            collection: "quests",
            documentId: quest.questId,
            data: quest,
            priority: 7,
            retries: 0,
            error: null,
          });
        }

        visibleQuests.push(quest);
      }
    }

    return visibleQuests;
  }

  /**
   * Determine if subtasks should be regenerated for a repeating quest
   */
  private shouldRegenerateSubtasks(quest: Quest, today: string): boolean {
    // Check if we've already regenerated today
    const lastRegenDate = quest.progressHistory
      .filter(h => h.completions > 0)
      .map(h => h.date)
      .sort()
      .pop();

    if (lastRegenDate === today) {
      // Already regenerated today, don't regenerate again
      return false;
    }

    // If any subtasks are complete, we haven't regenerated yet for this cycle
    return quest.subtasks.some(st => st.isComplete);
  }

  /**
   * Apply user's custom task ordering
   */
  private async applyCustomOrder(
    userId: string,
    quests: Quest[]
  ): Promise<Quest[]> {
    console.log("[TaskService] Applying custom order for user:", userId);

    const orderDoc = await this.db.getTaskOrderForToday(userId);
    if (
      !orderDoc ||
      !Array.isArray(orderDoc.taskOrder) ||
      orderDoc.taskOrder.length === 0
    ) {
      console.log("[TaskService] No custom order found, using default sort");
      return quests;
    }

    console.log(
      "[TaskService] Found saved order with",
      orderDoc.taskOrder.length,
      "items"
    );

    // Build a map of taskId -> questId pairs for fast lookup
    const orderMap = new Map<string, number>();

    orderDoc.taskOrder.forEach((item: TaskOrderItem, index: number) => {
      const key = `${item.taskId}_${item.questId ?? ""}`;
      orderMap.set(key, index);
    });

    // For quest-level ordering, find the earliest index among its subtasks
    const questOrderMap = new Map<string, number>();
    quests.forEach((quest) => {
      let minIndex = Number.MAX_SAFE_INTEGER;
      if (Array.isArray(q.subtasks)) {
        for (const st of q.subtasks) {
          const key = `${st.id}_${q.questId ?? ""}`;
          const idx = orderMap.get(key);
          if (typeof idx === "number" && idx < minIndex) {
            minIndex = idx;
          }
        }
      }

      if (minIndex !== Number.MAX_SAFE_INTEGER) {
        questOrderMap.set(quest.questId, minIndex);
      }
    });

    // Sort quests by their earliest subtask appearance
    const sorted = quests.slice().sort((a, b) => {
      const orderA = questOrderMap.get(a.questId) ?? Number.MAX_SAFE_INTEGER;
      const orderB = questOrderMap.get(b.questId) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    console.log(
      "[TaskService] Applied custom order, returning",
      sorted.length,
      "quests"
    );

    console.log("Sorted quests:", sorted.map((q) => q.questId));
    console.log("Order map:", Array.from(orderMap.entries()));
    console.log("Quest order map:", Array.from(questOrderMap.entries()));
    
    return sorted;
  }

  /**
   * Update task order for a quest
   */
  async updateTaskOrder(
    userId: string,
    taskOrderItems: TaskOrderItem[],
    questId: string | null = null
  ): Promise<TaskOrder> {
    const today = new Date().toISOString().split("T")[0];

    const taskOrderDoc: TaskOrder = {
      userId,
      date: today,
      questId: questId ?? undefined, // null preferred by ai, undefined raises no flag
      taskOrder: taskOrderItems,
      lastUpdated: new Date().toISOString()
    };

    // NOTE: unique document per user + date + questId
    const docId = questId
      ? `${userId}-${today}-${questId}`
      : `${userId}-${today}-home`;

    await this.db.upsertTaskOrder({
      ...taskOrderDoc,
      id: docId,
    });

    // await this.db.queueSync({
    //   operation: "update",
    //   collection: "taskOrders",
    //   documentId: docId,
    //   data: taskOrderDoc,
    //   priority: 8,
    // });

    // queue sync if you have a syncQueue
    if ((this.db as any).queueSync) {
      await (this.db as any).queueSync({
        operation: "update",
        collection: "taskOrders",
        documentId: docId,
        data: taskOrderDoc,
        priority: 8
      });
    }

    return {
      ...taskOrderDoc,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Bulk update task completion status
   */
  // async bulkUpdateTaskStatus(
  //   userId: string,
  //   updates: Array<{
  //     questId: string;
  //     subtaskId: string;
  //     isComplete: boolean;
  //   }>
  // ): Promise<void> {
  //   for (const update of updates) {
  //     const quest = await this.db.quests.get(update.questId);
  //     if (!quest || quest.ownerId !== userId) continue;

  //     const subtask = quest.subtasks.find((st) => st.id === update.subtaskId);
  //     if (!subtask) continue;

  //     subtask.isComplete = update.isComplete;
  //     subtask.completedAt = update.isComplete ? new Date().toISOString() : null;

  //     await this.db.quests.update(quest.questId, quest);

  //     // Queue for sync (priority 7)
  //     await this.db.queueSync({
  //       operation: "update",
  //       collection: "quests",
  //       documentId: quest.questId,
  //       data: quest,
  //       priority: 7,
  //     });
  //   }
  // }

  /**
   * Toggle subtask completion and check if quest should be marked complete
   */
  async toggleSubtaskCompletion(
    userId: string,
    questId: string,
    subtaskId: string
  ): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest || quest.ownerId !== userId) {
      throw new Error("Quest not found or access denied");
    }

    const subtaskIndex = quest.subtasks.findIndex((st) => st.id === subtaskId);
    if (subtaskIndex === -1) {
      throw new Error("Subtask not found");
    }

    const subtask = quest.subtasks[subtaskIndex];
    const wasComplete = subtask.isComplete;

    // Toggle completion
    subtask.isComplete = !subtask.isComplete;
    subtask.completedAt = subtask.isComplete ? new Date().toISOString() : null;

    // Check if all subtasks are now complete
    const allSubtasksComplete = quest.subtasks.length > 0 &&
      quest.subtasks.every(st => st.isComplete);

    // If all subtasks complete and quest wasn't already completed, mark it complete
    if (allSubtasksComplete && !quest.isCompleted) {
      quest.isCompleted = true;
      quest.completedAt = new Date().toISOString();

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

      console.log(`[TaskService] 🎉 Quest "${quest.title}" marked as COMPLETED!`);
    }

    // If a subtask was unchecked and quest was completed, un-complete the quest
    if (wasComplete && !subtask.isComplete && quest.isCompleted) {
      quest.isCompleted = false;
      quest.completedAt = null;
      console.log(`[TaskService] Quest "${quest.title}" marked as incomplete (subtask unchecked)`);
    }

    quest.updatedAt = new Date().toISOString();

    await this.db.quests.put(quest);

    await this.db.queueSync({
      operation: "update",
      collection: "quests",
      documentId: questId,
      data: quest,
      priority: 7,
      retries: 0,
      error: null,
    });

    // Log activity for task completion (only when marking complete, not unchecking)
    if (!wasComplete && subtask.isComplete) {
      const userProfile = await this.db.users.get(userId);
      if (userProfile) {
        const activityService = new ActivityFeedService();
        await activityService.addActivity({
          activityId: `task_complete_${subtaskId}`,
          type: 'task_complete',
          userId,
          username: userProfile.username,
          timestamp: new Date().toISOString(),
          data: {
            questId,
            questTitle: quest.title,
            taskTitle: subtask.title
          }
        });

        // Also log quest completion if all tasks are done
        if (allSubtasksComplete) {
          await activityService.addActivity({
            activityId: `quest_complete_${questId}`,
            type: 'quest_complete',
            userId,
            username: userProfile.username,
            timestamp: new Date().toISOString(),
            data: {
              questId,
              questTitle: quest.title
            }
          });
        }
      }
    }

    return quest;
  }

  /**
   * Save task order with task-quest pairs
   * @param tasks - Array of tasks with their questIds
   * @param questId - Optional: if provided, saves order for specific quest detail view
   */
  async saveTaskOrder(
    tasks: Array<{ id: string; questId: string }>,
    questId?: string
  ): Promise<void> {
    const userId = await this.authService.getCurrentUserId();
    const today = new Date().toISOString().split("T")[0];

    const taskOrder: TaskOrder = {
      userId,
      date: today,
      questId: questId || undefined,
      taskOrder: tasks.map((t) => ({
        taskId: t.id,
        questId: t.questId,
      })),
      lastUpdated: new Date().toISOString(),
    };

    // Use different keys for home vs quest detail
    const key = questId
      ? `${userId}_${questId}_${today}`
      : `${userId}_home_${today}`;

    await this.db.taskOrders.put(taskOrder, key);

    // Sync
    console.log("Syncing task order to the db");
    await this.db.queueSync({
      operation: "update",
      collection: "taskOrders",
      documentId: key,
      data: taskOrder,
      priority: 8,
      retries: 0,
      error: null,
    });
  }

  /**
   * Get task order for today (home view or specific quest)
   * @param questId - Optional: if provided, retrieves order for quest detail view
   */
  async getTaskOrder(questId?: string): Promise<TaskOrderItem[] | null> {
    console.log("In task service, getting task order");
    const userId = await this.authService.getCurrentUserId();
    const today = new Date().toISOString().split("T")[0];

    const key = questId
      ? `${userId}_${questId}_${today}`
      : `${userId}_home_${today}`;

    const taskOrder = await this.db.taskOrders.get(key);
    console.log("Leaving task service, got task order", taskOrder);
    return taskOrder?.taskOrder ?? [];
  }

  /**
   * Apply saved order to tasks (home view)
   * @param tasks - UI tasks with questId field
   */
  async applySavedOrder(tasks: Task[]): Promise<Task[]> {
    const savedOrder = await this.getTaskOrder(); // No questId = home view
    if (!savedOrder) return tasks;

    // Create a map for quick lookup using both taskId and questId
    const taskMap = new Map<string, Task>();
    tasks.forEach((t) => {
      taskMap.set(`${t.id}_${t.questId}`, t);
    });

    // Build ordered list
    const ordered: Task[] = [];
    const remaining = new Set(tasks.map((t) => `${t.id}_${t.questId}`));

    // Add tasks in saved order
    savedOrder.forEach((item) => {
      const key = `${item.taskId}_${item.questId}`;
      const task = taskMap.get(key);
      if (task) {
        ordered.push(task);
        remaining.delete(key);
      }
    });

    // Add any new tasks that weren't in saved order
    remaining.forEach((key) => {
      const task = Array.from(taskMap.values()).find(
        (t) => `${t.id}_${t.questId}` === key
      );
      if (task) ordered.push(task);
    });

    return ordered;
  }

  /**
   * Apply saved order to subtasks within a quest
   * @param questId - Quest ID
   * @param subtasks - Array of subtasks
   */
  async applyQuestSubtaskOrder(
    questId: string,
    subtasks: any[]
  ): Promise<any[]> {
    const savedOrder = await this.getTaskOrder(questId);
    if (!savedOrder) return subtasks;

    // Create a map for quick lookup
    const subtaskMap = new Map(subtasks.map((st) => [st.id, st]));

    // Build ordered list
    const ordered: any[] = [];
    const remaining = new Set(subtasks.map((st) => st.id));

    // Add subtasks in saved order
    savedOrder.forEach((item) => {
      const subtask = subtaskMap.get(item.taskId);
      if (subtask) {
        ordered.push(subtask);
        remaining.delete(item.taskId);
      }
    });

    // Add any new subtasks
    remaining.forEach((id) => {
      const subtask = subtaskMap.get(id);
      if (subtask) ordered.push(subtask);
    });

    return ordered;
  }
}

let _taskService: TaskService | null = null;

export function getTaskService() {
  if (!_taskService) _taskService = new TaskService();
  return _taskService;
}
