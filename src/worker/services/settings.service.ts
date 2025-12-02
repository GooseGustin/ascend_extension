import { getDB } from '../db/indexed-db';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../models/UserSettings';
import { AuthService } from './auth.service';

export class SettingsService {
  private db = getDB();
  private authService = new AuthService();

  /**
   * Get user settings (creates defaults if not exists)
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    let settings = await this.db.settings.get(userId);
    
    if (!settings) {
      // Create default settings
      settings = {
        ...DEFAULT_USER_SETTINGS,
        userId,
      };
      await this.db.settings.put(settings);
    }
    
    return settings;
  }

  /**
   * Update user settings (partial update)
   */
  async updateSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'userId'>>
  ): Promise<UserSettings> {
    const current = await this.getUserSettings(userId);
    
    const updated: UserSettings = {
      ...current,
      ...updates,
      userId, // Ensure userId never changes
      lastModified: new Date().toISOString(),
    };
    
    await this.db.settings.put(updated);
    
    // Queue sync
    await this.db.queueSync({
      operation: 'update',
      collection: 'settings',
      documentId: userId,
      data: updated,
      priority: 6,
      retries: 0,
      error: null,
    });
    
    return updated;
  }

  /**
   * Update specific section
   */
  async updateSection<K extends keyof Omit<UserSettings, 'userId' | 'lastModified' | 'version'>>(
    userId: string,
    section: K,
    data: UserSettings[K]
  ): Promise<UserSettings> {
    return this.updateSettings(userId, { [section]: data } as any);
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(userId: string): Promise<UserSettings> {
    const defaults: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      userId,
    };
    
    await this.db.settings.put(defaults);
    return defaults;
  }

  /**
   * Export settings as JSON
   */
  async exportSettings(userId: string): Promise<string> {
    const settings = await this.getUserSettings(userId);
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Clear cached data (IndexedDB)
   */
  async clearCache(): Promise<void> {
    // Clear all non-essential data
    await Promise.all([
      this.db.sessions.clear(),
      this.db.activityFeed.clear(),
      // Keep: users, quests, settings
    ]);
  }

  /**
   * Reset all progress (danger zone)
   */
  async resetAllProgress(userId: string): Promise<void> {
    await Promise.all([
      this.db.quests.where('ownerId').equals(userId).delete(),
      this.db.sessions.where('userId').equals(userId).delete(),
      this.db.activityFeed.where('userId').equals(userId).delete(),
    ]);
    
    // Reset user profile
    const user = await this.db.users.get(userId);
    if (user) {
      user.experiencePoints = 0;
      user.totalLevel = 1;
      user.streakData = {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        streakStartDate: '',
      };
      await this.db.users.put(user);
    }
  }
}

// Singleton
let _settingsService: SettingsService | null = null;

export function getSettingsService() {
  if (!_settingsService) _settingsService = new SettingsService();
  return _settingsService;
}