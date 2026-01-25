// FILE: ./src/worker/worker.ts (NEW FILE)

// Import necessary services and dependencies
import { QuestService } from "./services/quest.service";
import { SyncService } from "./services/sync.service";
import { getDB } from "./db/indexed-db"; 
import './background-window';
// Note: GMService is indirectly available via QuestService

// Define the processing interval (60 seconds)
const GM_QUEUE_INTERVAL = 10000; // test

// Instantiate core services
const questService = new QuestService();
const syncService = new SyncService();

console.log("Ascend Worker Initializing...");

/**
 * Main worker loop function.
 * Handles the periodic execution of background tasks.
 */
export default async function startWorkerLoop() {
    console.log("Worker loop starting...");

    // 1. Start the main data synchronization loop
    syncService.start();

    // DIAGNOSTIC: Check sync queue contents
    const db = getDB();

    // Check raw queue first
    const allQueueItems = await db.syncQueue.toArray();
    console.log(`[DIAGNOSTIC] Raw syncQueue has ${allQueueItems.length} total items`);

    const gmItems = allQueueItems.filter(item => item.collection === 'gm_validation');
    console.log(`[DIAGNOSTIC] GM validation items in raw queue: ${gmItems.length}`);

    const queueContents = await db.getPendingSyncOps(100);
    console.log(`[DIAGNOSTIC] getPendingSyncOps returned ${queueContents.length} items:`,
        queueContents.map(op => ({
            collection: op.collection,
            operation: op.operation,
            priority: op.priority,
            documentId: op.documentId
        }))
    );

    // 2. Phase 4.3 Hook: Start the GM Validation Queue Processor
    // This process ensures offline GM validation requests are processed periodically.
    setInterval(async () => {
        try {
            // Call the queue processor exposed by the GMService instance inside QuestService
            console.log("Running GM Queue Processor...");
            await questService.gmService.processPendingQueue();
            console.log("GM Queue Processor executed successfully.");
        } catch (e) {
            console.error("GM Queue Processor failed:", e);
        }
    }, GM_QUEUE_INTERVAL);

    // Run the GM Queue Processor immediately to process any requests queued during startup
    questService.gmService.processPendingQueue().catch(e => {
        console.error("Initial GM Queue Processor run failed:", e);
    });
}

// Worker will be started from App.tsx
// No auto-start here to avoid double initialization