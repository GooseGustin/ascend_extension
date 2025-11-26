export interface TaskOrderItem {
  taskId: string;
  questId: string;
}

export interface QuestOrdersMap {
  [questId: string]: TaskOrderItem[];
}

// Home view task order
function getHomeKey(userId: string): string {
  return `ascend:taskOrder:${userId}:home`;
}

// All quest orders in one object
function getQuestsKey(userId: string): string {
  return `ascend:questOrders:${userId}`;
}

// ============ HOME VIEW ============

export function saveHomeTaskOrder(
  userId: string,
  items: TaskOrderItem[]
): void {
  const key = getHomeKey(userId);
  localStorage.setItem(key, JSON.stringify(items));
}

export function loadHomeTaskOrder(userId: string): TaskOrderItem[] | null {
  const key = getHomeKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearHomeTaskOrder(userId: string): void {
  const key = getHomeKey(userId);
  localStorage.removeItem(key);
}

// ============ QUEST VIEWS ============

export function saveQuestSubtaskOrder(
  userId: string,
  questId: string,
  items: TaskOrderItem[]
): void {
  const key = getQuestsKey(userId);
  const raw = localStorage.getItem(key);
  
  let allOrders: QuestOrdersMap = {};
  if (raw) {
    try {
      allOrders = JSON.parse(raw);
    } catch {
      allOrders = {};
    }
  }

  // Update the specific quest's order
  allOrders[questId] = items;
  
  localStorage.setItem(key, JSON.stringify(allOrders));
}

export function loadQuestSubtaskOrder(
  userId: string,
  questId: string
): TaskOrderItem[] | null {
  const key = getQuestsKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const allOrders: QuestOrdersMap = JSON.parse(raw);
    return allOrders[questId] || null;
  } catch {
    return null;
  }
}

export function clearQuestSubtaskOrder(
  userId: string,
  questId: string
): void {
  const key = getQuestsKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return;

  try {
    const allOrders: QuestOrdersMap = JSON.parse(raw);
    delete allOrders[questId];
    localStorage.setItem(key, JSON.stringify(allOrders));
  } catch {
    // Silent fail
  }
}

export function clearAllQuestOrders(userId: string): void {
  const key = getQuestsKey(userId);
  localStorage.removeItem(key);
}

// ============ LEGACY COMPATIBILITY ============
// Keep old function signatures for backward compatibility

export function saveTaskOrder(
  userId: string,
  items: TaskOrderItem[],
  questId?: string
): void {
  if (questId) {
    saveQuestSubtaskOrder(userId, questId, items);
  } else {
    saveHomeTaskOrder(userId, items);
  }
}

export function loadTaskOrder(
  userId: string,
  questId?: string
): TaskOrderItem[] | null {
  if (questId) {
    return loadQuestSubtaskOrder(userId, questId);
  } else {
    return loadHomeTaskOrder(userId);
  }
}

export function clearTaskOrder(userId: string, questId?: string): void {
  if (questId) {
    clearQuestSubtaskOrder(userId, questId);
  } else {
    clearHomeTaskOrder(userId);
  }
}