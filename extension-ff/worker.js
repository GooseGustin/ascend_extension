// FILE: ./src/worker/worker.ts (NEW FILE)
// Import necessary services and dependencies
import { QuestService } from "./services/quest.service";
import { SyncService } from "./services/sync.service";
// Note: GMService is indirectly available via QuestService
// Define the processing interval (60 seconds)
const GM_QUEUE_INTERVAL = 60000;
// Instantiate core services
const questService = new QuestService();
const syncService = new SyncService();
console.log("Ascend Worker Initializing...");
/**
 * Main worker loop function.
 * Handles the periodic execution of background tasks.
 */
async function startWorkerLoop() {
    console.log("Worker loop starting...");
    // 1. Start the main data synchronization loop
    syncService.start();
    // 2. Phase 4.3 Hook: Start the GM Validation Queue Processor
    // This process ensures offline GM validation requests are processed periodically.
    setInterval(async () => {
        try {
            // Call the queue processor exposed by the GMService instance inside QuestService
            await questService.gmService.processPendingQueue();
        }
        catch (e) {
            console.error("GM Queue Processor failed:", e);
        }
    }, GM_QUEUE_INTERVAL);
    // Run the GM Queue Processor immediately to process any requests queued during startup
    questService.gmService.processPendingQueue().catch(e => {
        console.error("Initial GM Queue Processor run failed:", e);
    });
}
// Start the worker process
startWorkerLoop().catch(e => {
    console.error("FATAL: Error starting worker:", e);
});
