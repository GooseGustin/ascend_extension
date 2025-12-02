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
import { getSettingsService } from '../../worker';

interface DataSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function DataSection({ settings, onUpdate }: DataSectionProps) {
  const settingsService = getSettingsService();

  const handleExport = async () => {
    try {
      const data = await settingsService.exportSettings(settings.userId);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ascend-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
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