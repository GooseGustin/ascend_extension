/**
 * IndexedDB Wrapper for Worker Storage
 * Handles all local data persistence
 */
import Dexie from "dexie";
export class IndexedDb extends Dexie {
    constructor() {
        super("AscendDB");
        this.version(6).stores({
            // BUMP VERSION
            users: "userId, username, totalLevel",
            quests: "questId, ownerId, type, isPublic, isCompleted, registeredAt, [ownerId+isCompleted]",
            sessions: "sessionId, userId, questId, startTime, status, sessionType, [userId+startTime]",
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
                        const enriched = item.taskOrder.map((taskIdStr) => {
                            // try to find quest that contains this subtask id
                            const foundQuest = quests.find((q) => Array.isArray(q.subtasks) && q.subtasks.some((s) => s.id === taskIdStr));
                            return {
                                taskId: taskIdStr,
                                questId: foundQuest ? foundQuest.questId : null
                            };
                        });
                        item.taskOrder = enriched;
                        await trans.table("taskOrders").put(item);
                    }
                }
            }
            catch (e) {
                console.warn("[IndexedDB upgrade] taskOrders migration failed:", e);
            }
        });
    }
    /**
     * Get active quests for user
     */
    async getActiveQuests(userId) {
        console.log("In indexed-db, getActiveQuests", userId);
        const quests = await this.quests
            .where("ownerId")
            .equals(userId)
            // .where('[ownerId+isCompleted]')
            // .equals([userId, 0] as any) // 0 = false
            .toArray();
        console.log("User, quests", userId, quests);
        return quests.filter((q) => q.isCompleted === false);
    }
    /**
     * Get sessions for date range
     */
    async getSessionsByDateRange(userId, startDate, endDate) {
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
    async getTodaySessions(userId) {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0];
        return await this.getSessionsByDateRange(userId, today, tomorrow);
    }
    /**
     * Get task order for quest
     */
    async getTaskOrder(userId) {
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
    async getTaskOrderForToday(userId) {
        const today = new Date().toISOString().split("T")[0];
        // search by compound index userId+date first, then filter questId null
        const found = await this.taskOrders
            .where("[userId+date]")
            .equals([userId, today])
            .filter((d) => !d.questId) // home only
            .first();
        return found;
    }
    /**
     * Upsert task order
     */
    async upsertTaskOrder(taskOrder) {
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
    async queueSync(operation) {
        const id = `${operation.collection}-${operation.documentId || Date.now()}`;
        console.log("In indexed db, In queue sync");
        await this.syncQueue.put({
            ...operation,
            id,
            // timestamp: Date.now().toString(),
            retries: 0,
            error: null,
        });
    }
    /**
     * Get pending sync operations sorted by priority
     */
    async getPendingSyncOps(limit = 50) {
        return await this.syncQueue
            .orderBy("[priority+timestamp]")
            .reverse() // High priority first
            .limit(limit)
            .toArray();
    }
    /**
     * Remove sync operation
     */
    async removeSyncOp(id) {
        await this.syncQueue.delete(id);
    }
    /**
     * Clear all data (for testing/reset)
     */
    async clearAll() {
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
    async getHistoricalMetric(userId, metricType, periodsAgo) {
        const now = Date.now();
        let lookbackMs = 0;
        // Determine the rough period duration based on metric type
        if (metricType === 'weeklyVelocity') {
            lookbackMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        }
        else if (metricType === 'monthlyConsistency') {
            lookbackMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        else {
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
    async savePerformanceSnapshot(userId, metricType, value) {
        const timestamp = new Date().toISOString();
        // Use ISO string as part of ID for implicit time-sorting on unique ID field
        const id = `${userId}-${metricType}-${timestamp}`;
        await this.performanceSnapshots.put({
            id,
            userId,
            metricType,
            timestamp,
            value,
        });
    }
}
let _db = null;
export function getDB() {
    if (!_db) {
        _db = new IndexedDb();
    }
    return _db;
}
