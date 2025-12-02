/**
 * Worker Entry Point
 * Exports all services for use in UI components
 */

export { SessionService } from './services/session.service';
export { getTaskService, TaskService } from './services/task.service';
export { AnalyticsService } from './services/analytics.service';
export { ActivityFeedService } from './services/activity-feed.service';
export { SearchService } from './services/search.service';
export { RemoteAPI } from './api/remote-client';
export { SyncQueue } from './sync/sync-queue';
export { getDB, IndexedDb } from './db/indexed-db';
export { SeedService } from './services/seed.service'; // NEW
export { AuthService } from './services/auth.service'; // NEW
export { QuestUIAdapter } from './services/quest-ui-adapter.service';
export { QuestService } from './services/quest.service';
export { NotificationService } from './services/notification.service';
export { SettingsService, getSettingsService } from './services/settings.service';

// Export utilities
export { calculateTaskPriority, sortQuestsByPriority } from './utils/task-sorting.util';

// Export types
export type { HeatmapDay, TodayMetrics } from './services/analytics.service';
export type { SearchResult } from './services/search.service';
export type { ValidationResult } from './api/remote-client';