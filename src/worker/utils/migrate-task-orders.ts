export function migrateTaskOrderStorage(userId: string): void {
  try {
    // Find all old keys
    const homeOrders: any[] = [];
    const questOrders: { [questId: string]: any[] } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('ascend:taskOrder:')) continue;
      
      const value = localStorage.getItem(key);
      if (!value) continue;
      
      const items = JSON.parse(value);
      
      // Detect type
      if (key.includes(':quest:')) {
        // Quest order
        const questId = key.split(':quest:')[1];
        questOrders[questId] = items;
      } else if (key.endsWith(userId + ':' + new Date().toISOString().split('T')[0])) {
        // Today's home order
        homeOrders.push(...items);
      }
      
      // Delete old key
      localStorage.removeItem(key);
    }
    
    // Save to new structure
    if (homeOrders.length > 0) {
      localStorage.setItem(
        `ascend:taskOrder:${userId}:home`,
        JSON.stringify(homeOrders)
      );
    }
    
    if (Object.keys(questOrders).length > 0) {
      localStorage.setItem(
        `ascend:questOrders:${userId}`,
        JSON.stringify(questOrders)
      );
    }
    
    console.log('[Migration] Task orders migrated successfully');
  } catch (error) {
    console.error('[Migration] Failed to migrate task orders:', error);
  }
}