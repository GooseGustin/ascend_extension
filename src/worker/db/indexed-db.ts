/**
 * IndexedDB Wrapper for Worker Storage
 * Handles all local data persistence
 */

import Dexie, { Table } from "dexie";

// Import types from models
import type { UserProfile } from "../models/UserProfile";
import type { Quest } from "../models/Quest";
import type { Session } from "../models/Session";
import type { TaskOrder } from "../models/TaskOrder";
import type { ActivityItem } from "../models/ActivityItem";
import type { AgentState } from "../models/AgentState";
import type { GoalComment } from "../models/GoalComment";
import type { Notification } from "../models/Notification";
import type { SyncOperation } from "../models/SyncOperation";
import { UserSettings } from "../models";
import type { PerformanceMetrics } from "../models/AgentState";

export interface PerformanceMetricsSnapshot {
  id: string; // Unique ID: userId-metricType-timestamp
  userId: string;
  metricType: 'weeklyVelocity' | 'monthlyConsistency';
  timestamp: string; // ISO8601 when the metric was calculated
  value: number;
}

export class IndexedDb extends Dexie {
  // Tables
  users!: Table<UserProfile, string>;
  quests!: Table<Quest, string>;
  sessions!: Table<Session, string>;
  taskOrders!: Table<TaskOrder, string>;
  activityFeed!: Table<ActivityItem, string>;
  agentStates!: Table<AgentState, string>;
  comments!: Table<GoalComment, string>;
  notifications!: Table<Notification, string>;
  syncQueue!: Table<SyncOperation, string>;
  settings!: Table<UserSettings, string>;
  performanceSnapshots!: Table<PerformanceMetricsSnapshot, string>;

  constructor() {
    super("AscendDB");
    this.version(7).stores({
      // v7: Added gmValidationQuota to UserSettings, renamed retries→retryCount and added nextRetryTime to SyncOperation
      users: "userId, username, totalLevel",
      quests:
        "questId, ownerId, type, isPublic, isCompleted, registeredAt, [ownerId+isCompleted]",
      sessions:
        "sessionId, userId, questId, startTime, status, sessionType, [userId+startTime]",
      taskOrders: "&id, userId, date, questId, [userId+date], [userId+date+questId]",
      activityFeed: "activityId, userId, type, timestamp, [userId+timestamp]",
      agentStates: "userId, lastObservationTimestamp",
      comments: "id, questId, userId, timestamp",
      notifications: "id, userId, isRead, createdAt, [userId+isRead]",
      settings: "userId, lastModified",
      syncQueue: "id, userId, timestamp, priority, [priority+timestamp]",
      performanceSnapshots: "id, userId, metricType, timestamp, [userId+metricType+timestamp]",    
    });

    // Migration/upgrade block: convert older taskOrder shapes if needed
    this.on("ready", async () => {
      // no-op; just ensure DB ready
    });

    this.on("populate", () => {
      // initial seeding if needed
    });

    // Optionally, also add explicit upgrade handler (Dexie supports .upgrade in version)
    // If you need to migrate existing taskOrders with old schema to new TaskOrderItem shape,
    // implement below as needed:
    this.version(4).upgrade(async (trans) => {
      try {
        const old = await trans.table("taskOrders").toArray();
        // If old items already look like new shape, nothing to do.
        for (const item of old) {
          // detection: if item.taskOrder is array of strings, convert to TaskOrderItem[]
          if (Array.isArray(item.taskOrder) && item.taskOrder.length > 0 && typeof item.taskOrder[0] === "string") {
            // attempt best-effort conversion: map subtask id -> questId by scanning quests
            const quests = await trans.table("quests").toArray();
            const enriched = item.taskOrder.map((taskIdStr: string) => {
              // try to find quest that contains this subtask id
              const foundQuest = quests.find((q: any) => Array.isArray(q.subtasks) && q.subtasks.some((s: any) => s.id === taskIdStr));
              return {
                taskId: taskIdStr,
                questId: foundQuest ? foundQuest.questId : null
              };
            });
            item.taskOrder = enriched;
            await trans.table("taskOrders").put(item);
          }
        }
      } catch (e) {
        console.warn("[IndexedDB upgrade] taskOrders migration failed:", e);
      }
    });
  }

  /**
   * Get active quests for user (excludes completed and hidden quests)
   */
  async getActiveQuests(userId: string): Promise<Quest[]> {
    console.log("In indexed-db, getActiveQuests", userId);
    const quests = await this.quests
      .where("ownerId")
      .equals(userId)
      // .where('[ownerId+isCompleted]')
      // .equals([userId, 0] as any) // 0 = false
      .toArray();
    console.log("User, quests", userId, quests);
    return quests.filter((q) => q.isCompleted === false && q.hidden === false);
  }

  /**
   * Get sessions for date range
   */
  async getSessionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Session[]> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const sessions = await this.sessions
      .where("userId")
      .equals(userId)
      // .where('[userId+startTime]')
      // .between([userId, new Date(start).toISOString()] as any, [userId, new Date(end).toISOString()] as any)
      .toArray();
    console.log("In indexed db, leaving get sessions by date range");
    return sessions;
  }

  /**
   * Get today's sessions
   */
  async getTodaySessions(userId: string): Promise<Session[]> {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    return await this.getSessionsByDateRange(userId, today, tomorrow);
  }

  /**
   * Get task order for quest
   */
  async getTaskOrder(userId: string): Promise<TaskOrder | undefined> {
    console.log("In indexed db, Getting task order from db");
    const taskOrders = await this.taskOrders
      .where("userId")
      .equals(userId)
      // .where('[userId+questId]')
      // .equals([userId, questId] as any)
      .first();
    console.log("In indexed db, leaving get task orders");
    return taskOrders;
  }

  /**
   * Get task order for today's home view
   */
  async getTaskOrderForToday(userId: string): Promise<TaskOrder | undefined> {
    const today = new Date().toISOString().split("T")[0];
    // search by compound index userId+date first, then filter questId null
    const found = await this.taskOrders
      .where("[userId+date]")
      .equals([userId, today])
      .filter((d: any) => !d.questId) // home only
      .first();
    return found as TaskOrder | undefined;
  }


  /**
   * Upsert task order
   */
  async upsertTaskOrder(taskOrder: { id?: string; userId: string; date: string; questId?: string | undefined; taskOrder: any[]; lastUpdated?: string }) {
    // ensure lastUpdated
    const doc = {
      ...taskOrder,
      lastUpdated: taskOrder.lastUpdated ?? new Date().toISOString()
    };
    // If no id, compute stable id to avoid duplicates: user-date-quest/home
    const id = taskOrder.id ?? (taskOrder.questId ? `${taskOrder.userId}-${taskOrder.date}-${taskOrder.questId}` : `${taskOrder.userId}-${taskOrder.date}-home`);
    await this.taskOrders.put({ ...doc, id });
    // await this.taskOrders.put(doc); 
  }

  // convenience to list all taskOrders (debug)
  async allTaskOrders() {
    return this.taskOrders.toArray();
  }


  /**
   * Add to sync queue
   */
  async queueSync(
    operation: Omit<SyncOperation, "id" | "timestamp">
  ): Promise<void> {
    const id = `${operation.collection}-${operation.documentId || Date.now()}`;
    console.log("[IndexedDB] queueSync called for collection:", operation.collection);

    const syncOp: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: operation.retryCount || 0,
      nextRetryTime: operation.nextRetryTime || null,
      error: operation.error || null,
    } as SyncOperation;

    console.log("[IndexedDB] Adding to syncQueue:", syncOp);
    await this.syncQueue.put(syncOp);
    console.log("[IndexedDB] Operation added to syncQueue successfully");
  }

  /**
   * Get pending sync operations sorted by priority
   * Lower priority number = higher priority (e.g., 2 before 7)
   */
  async getPendingSyncOps(limit: number = 50): Promise<SyncOperation[]> {
    // Get all items, sort manually (compound index might have issues)
    const allItems = await this.syncQueue.toArray();

    console.log(`[IndexedDB] getPendingSyncOps: Found ${allItems.length} total items in queue`);

    // Sort by priority (ascending = lower number = higher priority), then timestamp
    const sorted = allItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // 2 (GM) comes before 7 (quests) or 10 (sessions)
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });

    const limited = sorted.slice(0, limit);

    console.log(`[IndexedDB] getPendingSyncOps: Returning ${limited.length} items (sorted by priority)`);
    console.log(`[IndexedDB] First 5 items:`, limited.slice(0, 5).map(item => ({
      collection: item.collection,
      priority: item.priority,
      operation: item.operation
    })));

    return limited;
  }

  /**
   * Remove sync operation
   */
  async removeSyncOp(id: string): Promise<void> {
    await this.syncQueue.delete(id);
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.users.clear(),
      this.quests.clear(),
      this.sessions.clear(),
      this.taskOrders.clear(),
      this.activityFeed.clear(),
      this.agentStates.clear(),
      this.comments.clear(),
      this.notifications.clear(),
      this.syncQueue.clear(),
    ]);
  }

  /**
   * Get a historical metric value from a specific lookback period (e.g., 1 period ago).
   * Used for calculating trends (e.g., Current Velocity vs. Last Week's Velocity).
   */
  async getHistoricalMetric(
    userId: string, 
    metricType: PerformanceMetricsSnapshot['metricType'], 
    periodsAgo: number
  ): Promise<number | undefined> {
    const now = Date.now();
    let lookbackMs = 0;
    
    // Determine the rough period duration based on metric type
    if (metricType === 'weeklyVelocity') {
      lookbackMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (metricType === 'monthlyConsistency') {
      lookbackMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      return undefined;
    }
    
    // Calculate the target window for the historical metric (e.g., 7-14 days ago for weekly velocity)
    const targetEnd = new Date(now - lookbackMs * periodsAgo).toISOString();
    const targetStart = new Date(now - lookbackMs * (periodsAgo + 1)).toISOString();

    // Query using the compound index: [userId+metricType+timestamp]
    const historicalSnapshot = await this.performanceSnapshots
      .where('[userId+metricType+timestamp]')
      .between([userId, metricType, targetStart], [userId, metricType, targetEnd], true, false)
      .reverse() // Get most recent snapshot in that window
      .first();

    return historicalSnapshot?.value;
  }
  
  // ADD NEW METHOD: saveHistoricalMetric
  /**
   * Saves a performance metric snapshot for later comparison.
   * Called by the Analytics Service after generating the new AgentState.
   */
  async savePerformanceSnapshot(
    userId: string, 
    metricType: PerformanceMetricsSnapshot['metricType'], 
    value: number
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    // Use ISO string as part of ID for implicit time-sorting on unique ID field
    const id = `${userId}-${metricType}-${timestamp}`; 
    
    await this.performanceSnapshots.put({
      id,
      userId,
      metricType,
      timestamp,
      value,
    } as PerformanceMetricsSnapshot);
  }



}

let _db: IndexedDb | null = null;

export function getDB() {
  if (!_db) {
    _db = new IndexedDb();
  }
  return _db;
}
