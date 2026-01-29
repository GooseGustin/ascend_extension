import { Label } from '../ui/label';
import { ToggleSwitch } from '../ui/toggle-switch';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import type { UserSettings } from '../../worker/models/UserSettings';

interface NotificationsSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function NotificationsSection({ settings, onUpdate }: NotificationsSectionProps) {
  const handleToggle = async (key: keyof UserSettings['notifications'], value: boolean) => {
    await onUpdate({
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  const handleTimeChange = async (time: string) => {
    await onUpdate({
      notifications: {
        ...settings.notifications,
        dailySummaryTime: time,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Daily Summary Notification</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Receive a daily summary of your progress
          </p>
        </div>
        <ToggleSwitch
          checked={settings.notifications.dailySummary}
          onCheckedChange={(checked) => handleToggle('dailySummary', checked)}
        />
      </div>

      {settings.notifications.dailySummary && (
        <div>
          <Label htmlFor="summaryTime" className="text-[#b9bbbe]">
            Preferred Summary Time
          </Label>
          <Input
            id="summaryTime"
            type="time"
            value={settings.notifications.dailySummaryTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs"
          />
        </div>
      )}

      <Separator className="bg-[#202225]" />

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Task Due Reminders</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Get notified when tasks are due
          </p>
        </div>
        <ToggleSwitch
          checked={settings.notifications.taskReminders}
          onCheckedChange={(checked) => handleToggle('taskReminders', checked)}
        />
      </div>

      <Separator className="bg-[#202225]" />

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Quest Schedule Reminders</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Reminders for scheduled quests
          </p>
        </div>
        <ToggleSwitch
          checked={settings.notifications.questReminders}
          onCheckedChange={(checked) => handleToggle('questReminders', checked)}
        />
      </div>

      <Separator className="bg-[#202225]" />

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Grandmaster AI Nudges</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Soft nudges to keep you on track
          </p>
        </div>
        <ToggleSwitch
          checked={settings.notifications.aiNudges}
          onCheckedChange={(checked) => handleToggle('aiNudges', checked)}
        />
      </div>
    </div>
  );
}