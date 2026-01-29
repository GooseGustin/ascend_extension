import { Label } from '../ui/label';
import { ToggleSwitch } from '../ui/toggle-switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
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

interface AISectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function AISection({ settings, onUpdate }: AISectionProps) {
  const handleToneChange = async (tone: 'mild' | 'standard' | 'tough') => {
    await onUpdate({
      ai: {
        ...settings.ai,
        tone,
      },
    });
  };

  const handleFrequencyChange = async (frequency: 'low' | 'medium' | 'high') => {
    await onUpdate({
      ai: {
        ...settings.ai,
        nudgeFrequency: frequency,
      },
    });
  };

  const handleSuggestionToggle = async (
    key: keyof UserSettings['ai']['suggestions'],
    value: boolean
  ) => {
    await onUpdate({
      ai: {
        ...settings.ai,
        suggestions: {
          ...settings.ai.suggestions,
          [key]: value,
        },
      },
    });
  };

  const handleResetMemory = async () => {
    // TODO: Implement GM memory reset
    alert('AI memory reset functionality coming soon');
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-[#b9bbbe]">AI Persona Tone</Label>
        <Select value={settings.ai.tone} onValueChange={handleToneChange}>
          <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2f3136] border-[#202225]">
            <SelectItem value="mild" className="text-[#dcddde]">Mild Mentor</SelectItem>
            <SelectItem value="standard" className="text-[#dcddde]">
              Standard Grandmaster
            </SelectItem>
            <SelectItem value="tough" className="text-[#dcddde]">
              Tough-Love Drill Sergeant
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-[#72767d] mt-2">
          Choose how the Grandmaster communicates with you
        </p>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <Label className="text-[#b9bbbe]">Nudge Frequency</Label>
        <Select value={settings.ai.nudgeFrequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2f3136] border-[#202225]">
            <SelectItem value="low" className="text-[#dcddde]">Low</SelectItem>
            <SelectItem value="medium" className="text-[#dcddde]">Medium</SelectItem>
            <SelectItem value="high" className="text-[#dcddde]">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <h3 className="text-white mb-4 font-semibold">Automatic Suggestions</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[#dcddde]">Suggest Daily Plan</Label>
            <ToggleSwitch
              checked={settings.ai.suggestions.dailyPlan}
              onCheckedChange={(checked) =>
                handleSuggestionToggle('dailyPlan', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[#dcddde]">Suggest Quest Improvements</Label>
            <ToggleSwitch
              checked={settings.ai.suggestions.questImprovements}
              onCheckedChange={(checked) =>
                handleSuggestionToggle('questImprovements', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[#dcddde]">Suggest Reschedules</Label>
            <ToggleSwitch
              checked={settings.ai.suggestions.reschedules}
              onCheckedChange={(checked) =>
                handleSuggestionToggle('reschedules', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[#dcddde]">Analyze Progress Weekly</Label>
            <ToggleSwitch
              checked={settings.ai.suggestions.weeklyAnalysis}
              onCheckedChange={(checked) =>
                handleSuggestionToggle('weeklyAnalysis', checked)
              }
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]">
              Reset AI Memory
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#2f3136] border-[#202225]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Reset AI Memory?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#b9bbbe]">
                This will clear all learned preferences and conversation history with the
                Grandmaster AI. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#4f545c] text-[#dcddde] border-0 hover:bg-[#5d6269]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetMemory}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                Reset Memory
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-sm text-[#72767d] mt-2">
          Clear all learned preferences from the Grandmaster
        </p>
      </div>
    </div>
  );
}