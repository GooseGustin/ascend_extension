// Simple background service worker for Ascend extension

console.log("Ascend Background Service Worker Initialized");

// Window management functions

async function getStoredWindow() {
  const result = await chrome.storage.local.get(["ascendWindowId"]);

  const windowId = parseInt(result.ascendWindowId);

  if (windowId) {
    try {
      // Try to get the window directly first

      const window = await chrome.windows.get(windowId);

      return window;
    } catch (error) {
      // Window doesn't exist, clear the stored ID

      await chrome.storage.local.remove(["ascendWindowId"]);

      return null;
    }
  }

  console.log("No stored Ascend window ID found");

  return null;
}

// Listen for clicks on the extension's action button

chrome.action.onClicked.addListener(async () => {
  console.log("Ascend extension icon clicked"); // Check if window already exists

  const existingWindow = await getStoredWindow();

  if (existingWindow) {
    // Window exists, focus it

    try {
      await chrome.windows.update(existingWindow.id, { focused: true });

      console.log("Focused existing Ascend window");

      return;
    } catch (error) {
      // Window might have been closed, continue to create new one

      console.log("Window not found, creating new one...");
    }
  } // Create new window

  try {
    const newWindow = await chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),

      type: "popup",

      width: 1400,

      height: 900,

      left: 100,

      top: 100,
    });

    console.log("Created new Ascend window:", newWindow); // Store the window ID

    if (newWindow && newWindow.id) {
      await chrome.storage.local.set({
        ascendWindowId: newWindow.id.toString(),
      });

      console.log("Stored window ID:", newWindow.id);
    }
  } catch (error) {
    console.error("Failed to create window:", error);
  }
});

// Clean up when window closes

chrome.windows.onRemoved.addListener(async (removedWindowId) => {
  console.log("Window removed:", removedWindowId);

  const storedWindow = await getStoredWindow();

  if (storedWindow && storedWindow.id === removedWindowId) {
    // Our window was closed, clear the stored ID

    await chrome.storage.local.remove(["ascendWindowId"]);

    console.log("Cleared stored window ID for Ascend");
  }
});
