/**
 * Development utilities
 * Exposed to window for console access
 */

import { SeedService, AuthService, getDB } from '../index'; // Import from worker index

// Check if we're in development
const isDev = import.meta.env.DEV !== false; // Default to true if undefined

console.log('In dev-tools, isDev', isDev); 

if (isDev) {
  const seedService = new SeedService();
  const authService = new AuthService();
  const db = getDB();

  (window as any).devTools = {
    // Reseed database
    reseed: async () => {
      console.log('🔄 Reseeding database...');
      try {
        const userId = await seedService.reseedDatabase();
        console.log('✅ Database reseeded. User ID:', userId);
        console.log('🔄 Reloading page...');
        window.location.reload();
      } catch (error) {
        console.error('❌ Reseed failed:', error);
      }
    },

    // Clear all data
    clearAll: async () => {
      console.log('🗑️ Clearing all data...');
      try {
        await db.clearAll();
        localStorage.clear();
        console.log('✅ All data cleared');
        console.log('🔄 Reloading page...');
        window.location.reload();
      } catch (error) {
        console.error('❌ Clear failed:', error);
      }
    },

    // Get current user
    getUser: async () => {
      try {
        const user = await authService.getCurrentUser();
        console.log('Current user:', user);
        return user;
      } catch (error) {
        console.error('❌ Failed to get user:', error);
        return null;
      }
    },

    // View all quests
    getQuests: async () => {
      try {
        const userId = await authService.getCurrentUserId();
        const quests = await db.getActiveQuests(userId);
        console.log('Active quests:', quests);
        return quests;
      } catch (error) {
        console.error('❌ Failed to get quests:', error);
        return [];
      }
    },

    // View all sessions
    getSessions: async () => {
      try {
        const userId = await authService.getCurrentUserId();
        const sessions = await db.getTodaySessions(userId);
        console.log("Today's sessions:", sessions);
        return sessions;
      } catch (error) {
        console.error('❌ Failed to get sessions:', error);
        return [];
      }
    },

    // Manual seed (if auto-seed didn't work)
    seed: async () => {
      console.log('🌱 Manually seeding database...');
      try {
        const userId = await seedService.seedDatabase();
        console.log('✅ Database seeded. User ID:', userId);
        return userId;
      } catch (error) {
        console.error('❌ Seed failed:', error);
      }
    }
  };

  console.log('🛠️ Dev tools available: window.devTools');
  console.log('Commands:');
  console.log('  - devTools.seed() - Manually seed database');
  console.log('  - devTools.reseed() - Clear and reseed database');
  console.log('  - devTools.clearAll() - Clear all data');
  console.log('  - devTools.getUser() - View current user');
  console.log('  - devTools.getQuests() - View active quests');
  console.log('  - devTools.getSessions() - View today\'s sessions');
}