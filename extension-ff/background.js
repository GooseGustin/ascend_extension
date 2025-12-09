// background.js (Firefox-friendly)

// Use browser.* APIs (Firefox uses them). If you want cross-browser, include webextension-polyfill.
console.log("Ascend Background (Firefox) initialized");

async function getStoredWindow() {
  const result = await browser.storage.local.get("ascendWindowId");
  const windowIdStr = result.ascendWindowId;
  if (!windowIdStr) return null;
  const windowId = parseInt(windowIdStr, 10);
  if (isNaN(windowId)) {
    await browser.storage.local.remove("ascendWindowId");
    return null;
  }
  try {
    const win = await browser.windows.get(windowId);
    return win;
  } catch (err) {
    await browser.storage.local.remove("ascendWindowId");
    return null;
  }
}

browser.browserAction.onClicked.addListener(async () => {
  console.log("Ascend extension icon clicked (Firefox)");
  try {
    const existingWindow = await getStoredWindow();
    if (existingWindow) {
      try {
        await browser.windows.update(existingWindow.id, { focused: true });
        console.log("Focused existing Ascend window");
        return;
      } catch (e) {
        console.log("Stored window not found; creating new window.");
      }
    }

    // const newWindow = await browser.windows.create({
    //   url: browser.runtime.getURL("index.html"),
    //   type: "popup",
    //   width: 1400,
    //   height: 900,
    //   left: 100,
    //   top: 100
    // });
    const newWindow = await browser.windows.create({
      url: browser.runtime.getURL("index.html"),
      type: "popup",
      width: 1000,
      height: 600,
    });

    try {
      // Get screen info
      const screenInfo = await browser.windows.getCurrent();

      // Compute fit-to-screen metrics
      const maxWidth = screenInfo.width - 10; // small padding
      const maxHeight = screenInfo.height - 10; // small padding

      // Resize the popup
      await browser.windows.update(newWindow.id, {
        width: maxWidth,
        height: maxHeight,
        left: Math.max(20, (screenInfo.width - maxWidth) / 2),
        top: Math.max(20, (screenInfo.height - maxHeight) / 2),
      });
    } catch (e) {
      console.error("Failed to resize window:", e);
    }

    console.log("Created new Ascend window:", newWindow);
    if (newWindow && newWindow.id) {
      await browser.storage.local.set({
        ascendWindowId: newWindow.id.toString(),
      });
      console.log("Stored window ID:", newWindow.id);
    }
  } catch (err) {
    console.error("Error in browserAction handler:", err);
  }
});

browser.windows.onRemoved.addListener(async (removedId) => {
  console.log("Window removed:", removedId);
  const stored = await browser.storage.local.get("ascendWindowId");
  const storedId = stored.ascendWindowId;
  if (storedId && parseInt(storedId, 10) === removedId) {
    await browser.storage.local.remove("ascendWindowId");
    console.log("Cleared stored window ID");
  }
});

// // FILE: ./src/worker/worker.ts (NEW FILE)
// // Import necessary services and dependencies
// import { QuestService } from "./services/quest.service";
// import { SyncService } from "./services/sync.service";
// // Note: GMService is indirectly available via QuestService
// // Define the processing interval (60 seconds)
// const GM_QUEUE_INTERVAL = 60000;
// // Instantiate core services
// const questService = new QuestService();
// const syncService = new SyncService();
// console.log("Ascend Worker Initializing...");
// /**
//  * Main worker loop function.
//  * Handles the periodic execution of background tasks.
//  */
// async function startWorkerLoop() {
//     console.log("Worker loop starting...");
//     // 1. Start the main data synchronization loop
//     syncService.start();
//     // 2. Phase 4.3 Hook: Start the GM Validation Queue Processor
//     // This process ensures offline GM validation requests are processed periodically.
//     setInterval(async () => {
//         try {
//             // Call the queue processor exposed by the GMService instance inside QuestService
//             await questService.gmService.processPendingQueue();
//         }
//         catch (e) {
//             console.error("GM Queue Processor failed:", e);
//         }
//     }, GM_QUEUE_INTERVAL);
//     // Run the GM Queue Processor immediately to process any requests queued during startup
//     questService.gmService.processPendingQueue().catch(e => {
//         console.error("Initial GM Queue Processor run failed:", e);
//     });
// }
// // Start the worker process
// startWorkerLoop().catch(e => {
//     console.error("FATAL: Error starting worker:", e);
// });
