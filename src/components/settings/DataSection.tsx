import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { UserSettings } from '../../worker/models/UserSettings';
import {
  getSettingsService,
  AuthService,
  QuestService,
  AnalyticsService,
  SessionService
} from '../../worker';
import questToTasks from '../../worker/utils/quest-to-tasks';

interface DataSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function DataSection({ settings, onUpdate }: DataSectionProps) {
  const settingsService = getSettingsService();

  const handleExport = async () => {
    try {
      console.log('[EXPORT] Starting data export...');
      console.log('[EXPORT] Using userId:', settings.userId);

      const authService = new AuthService();
      const questService = new QuestService();
      const analyticsService = new AnalyticsService();

      // Verify user exists first
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error(`User not found with userId: ${settings.userId}`);
      }

      console.log('[EXPORT] User verified:', currentUser.username);

      // Gather all user data
      const [
        quests,
        sessions,
        progressStats,
        consistencyScore,
        settingsData
      ] = await Promise.all([
        questService.getUserQuests(settings.userId),
        analyticsService.getSessionHistory({
          userId: settings.userId,
          limit: 1000 // Get all sessions (up to 1000)
        }),
        analyticsService.getProgressStats(settings.userId),
        analyticsService.getConsistencyScore(settings.userId),
        settingsService.exportSettings(settings.userId)
      ]);

      console.log('[EXPORT] Data gathered:', {
        questsCount: quests.length,
        sessionsCount: sessions.length,
        progressStats,
        consistencyScore
      });

      // Convert quests to tasks (tasks are just flattened subtasks)
      const tasks = questToTasks(quests);

      console.log('[EXPORT] Tasks converted:', tasks.length);

      // Create comprehensive export object
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        user: {
          userId: currentUser?.userId,
          username: currentUser?.username,
          totalLevel: currentUser?.totalLevel,
          experiencePoints: currentUser?.experiencePoints,
          streakData: currentUser?.streakData,
          createdAt: currentUser?.joinDate
        },
        quests: quests.map(quest => ({
          questId: quest.questId,
          title: quest.title,
          description: quest.description,
          subtasks: quest.subtasks,
          gamification: quest.gamification,
          difficulty: quest.difficulty,
          tracking: quest.tracking,
          isCompleted: quest.isCompleted,
          createdAt: quest.createdAt,
          completedAt: quest.completedAt
        })),
        tasks: tasks,
        sessions: sessions,
        stats: {
          progress: progressStats,
          consistency: consistencyScore
        },
        settings: JSON.parse(settingsData)
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `ascend-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[EXPORT] ✅ Data exported successfully:', filename);
      alert('Data exported successfully!');
    } catch (error) {
      console.error('[EXPORT] ❌ Export failed:', error);
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
    }
  };

  const handleClearCache = async () => {
    try {
      await settingsService.clearCache();
      alert('Cache cleared successfully. Please refresh the page.');
    } catch (error) {
      console.error('Clear cache failed:', error);
      alert('Failed to clear cache');
    }
  };

  const handleCloudSyncToggle = async (enabled: boolean) => {
    await onUpdate({
      storage: {
        cloudSync: enabled,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          onClick={handleExport}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
        >
          Export My Data
        </Button>
        <p className="text-sm text-[#72767d] mt-2">
          Download your quests, tasks, and stats as JSON
        </p>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]">
              Clear Cached Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#2f3136] border-[#202225]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Clear cached data?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#b9bbbe]">
                This will reset local state and may require you to reload the app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#4f545c] text-[#dcddde] border-0 hover:bg-[#5d6269]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearCache}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                Clear Cache
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-sm text-[#72767d] mt-2">Reset local state</p>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <h3 className="text-white mb-4 font-semibold">Cloud Backups</h3>
        <div className="flex items-center justify-between max-w-md">
          <div>
            <Label className="text-[#dcddde]">Sync State to Cloud</Label>
            <p className="text-sm text-[#72767d] mt-1">
              Automatically backup your data
            </p>
          </div>
          <Switch
            checked={settings.storage.cloudSync}
            onCheckedChange={handleCloudSyncToggle}
          />
        </div>
        {!settings.storage.cloudSync && (
          <p className="text-sm text-[#f0b232] mt-2">
            ⚠️ Cloud sync is disabled. Your data is only stored locally.
          </p>
        )}
      </div>
    </div>
  );
}