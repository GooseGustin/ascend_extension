import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ToggleSwitch } from '../ui/toggle-switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import type { UserSettings } from '../../worker/models/UserSettings';

interface ProductivitySectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function ProductivitySection({ settings, onUpdate }: ProductivitySectionProps) {
  const handlePomodoroChange = async (key: keyof UserSettings['productivity']['pomodoro'], value: number | boolean) => {
    await onUpdate({
      productivity: {
        ...settings.productivity,
        pomodoro: {
          ...settings.productivity.pomodoro,
          [key]: value,
        },
      },
    });
  };

  const handleTaskChange = async (priority: 'A' | 'B' | 'C') => {
    await onUpdate({
      productivity: {
        ...settings.productivity,
        tasks: {
          defaultPriority: priority,
        },
      },
    });
  };

  const handleQuestChange = async (
    key: keyof UserSettings['productivity']['quests'],
    value: string
  ) => {
    await onUpdate({
      productivity: {
        ...settings.productivity,
        quests: {
          ...settings.productivity.quests,
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Pomodoro Defaults */}
      <div>
        <h3 className="text-white mb-4 font-semibold">Pomodoro Defaults</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="focusDuration" className="text-[#b9bbbe]">
              Default Focus Duration (minutes)
            </Label>
            <Input
              id="focusDuration"
              type="number"
              min="1"
              max="120"
              value={settings.productivity.pomodoro.focusDuration}
              onChange={(e) =>
                handlePomodoroChange('focusDuration', parseInt(e.target.value) || 25)
              }
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs"
            />
          </div>

          <div>
            <Label htmlFor="breakDuration" className="text-[#b9bbbe]">
              Default Break Duration (minutes)
            </Label>
            <Input
              id="breakDuration"
              type="number"
              min="1"
              max="30"
              value={settings.productivity.pomodoro.breakDuration}
              onChange={(e) =>
                handlePomodoroChange('breakDuration', parseInt(e.target.value) || 5)
              }
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs"
            />
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <Label className="text-[#dcddde]">Auto-start Break</Label>
              <p className="text-sm text-[#72767d] mt-1">
                Automatically start break after completing a pomodoro
              </p>
            </div>
            <ToggleSwitch
              checked={settings.productivity.pomodoro.autoStartBreak}
              onCheckedChange={(checked) =>
                handlePomodoroChange('autoStartBreak', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <Label className="text-[#dcddde]">Auto-start Next Pomodoro</Label>
              <p className="text-sm text-[#72767d] mt-1">
                Automatically start the next session
              </p>
            </div>
            <ToggleSwitch
              checked={settings.productivity.pomodoro.autoStartNext}
              onCheckedChange={(checked) =>
                handlePomodoroChange('autoStartNext', checked)
              }
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#202225]" />

      {/* Deep Focus Settings */}
      <div>
        <h3 className="text-white mb-4 font-semibold">Deep Focus Mode</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deepFocusMax" className="text-[#b9bbbe]">
              Maximum Duration (minutes)
            </Label>
            <p className="text-sm text-[#72767d] mt-1 mb-2">
              Cap for deep focus sessions (default: 120 minutes)
            </p>
            <Input
              id="deepFocusMax"
              type="number"
              min="30"
              max="240"
              value={settings.productivity.deepFocus.maxDurationMin}
              onChange={async (e) => {
                const value = parseInt(e.target.value) || 120;
                await onUpdate({
                  productivity: {
                    ...settings.productivity,
                    deepFocus: {
                      ...settings.productivity.deepFocus,
                      maxDurationMin: value,
                    },
                  },
                });
              }}
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs"
            />
          </div>

          {/* <div>
            <Label htmlFor="deepFocusXP" className="text-[#b9bbbe]">
              XP Rate Multiplier
            </Label>
            <p className="text-sm text-[#72767d] mt-1 mb-2">
              XP earning rate compared to pomodoro (default: 0.5 = 50%)
            </p>
            <Input
              id="deepFocusXP"
              type="number"
              min="0.1"
              max="2"
              step="0.1"
              value={settings.productivity.deepFocus.xpRateMultiplier}
              onChange={async (e) => {
                const value = parseFloat(e.target.value) || 0.5;
                await onUpdate({
                  productivity: {
                    ...settings.productivity,
                    deepFocus: {
                      ...settings.productivity.deepFocus,
                      xpRateMultiplier: value,
                    },
                  },
                });
              }}
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs"
            />
          </div> */}
        </div>
      </div>

      <Separator className="bg-[#202225]" />

      {/* Task Defaults */}
      <div>
        <h3 className="text-white mb-4 font-semibold">Task Defaults</h3>
        <div>
          <Label className="text-[#b9bbbe]">Default Priority</Label>
          <Select
            value={settings.productivity.tasks.defaultPriority}
            onValueChange={handleTaskChange}
          >
            <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2f3136] border-[#202225]">
              <SelectItem value="A" className="text-[#dcddde]">A (High)</SelectItem>
              <SelectItem value="B" className="text-[#dcddde]">B (Medium)</SelectItem>
              <SelectItem value="C" className="text-[#dcddde]">C (Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="bg-[#202225]" />

      {/* Quest Defaults */}
      <div>
        <h3 className="text-white mb-4 font-semibold">Quest Defaults</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-[#b9bbbe]">Default Quest Type</Label>
            <Select
              value={settings.productivity.quests.defaultType}
              onValueChange={(v) => handleQuestChange('defaultType', v)}
            >
              <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3136] border-[#202225]">
                <SelectItem value="Quest" className="text-[#dcddde]">Quest</SelectItem>
                <SelectItem value="TodoQuest" className="text-[#dcddde]">Todo Quest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#b9bbbe]">Default Frequency</Label>
            <Select
              value={settings.productivity.quests.defaultFrequency}
              onValueChange={(v) => handleQuestChange('defaultFrequency', v)}
            >
              <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3136] border-[#202225]">
                <SelectItem value="Daily" className="text-[#dcddde]">Daily</SelectItem>
                <SelectItem value="Weekly" className="text-[#dcddde]">Weekly</SelectItem>
                <SelectItem value="Custom" className="text-[#dcddde]">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}