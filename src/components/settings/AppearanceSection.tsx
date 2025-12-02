import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import type { UserSettings } from '../../worker/models/UserSettings';
import { applyAccentColor, applyTheme } from '../../worker/utils/theme';

interface AppearanceSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function AppearanceSection({ settings, onUpdate }: AppearanceSectionProps) {
  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await onUpdate({
      appearance: {
        ...settings.appearance,
        theme,
      },
    });
    applyTheme(theme);
  };

  const handleAccentChange = async (accentColor: 'blue' | 'emerald' | 'purple' | 'gold') => {
    await onUpdate({
      appearance: {
        ...settings.appearance,
        accentColor,
      },
    });
    applyAccentColor(accentColor);
  };

  const accentColors = [
    { id: 'blue' as const, color: '#5865F2', name: 'Blue' },
    { id: 'emerald' as const, color: '#57F287', name: 'Emerald' },
    { id: 'purple' as const, color: '#8B5CF6', name: 'Purple' },
    { id: 'gold' as const, color: '#FEE75C', name: 'Gold' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-[#b9bbbe]">Theme</Label>
        <Select value={settings.appearance.theme} onValueChange={handleThemeChange}>
          <SelectTrigger className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2f3136] border-[#202225]">
            <SelectItem value="light" className="text-[#dcddde]">Light</SelectItem>
            <SelectItem value="dark" className="text-[#dcddde]">Dark</SelectItem>
            <SelectItem value="system" className="text-[#dcddde]">System Default</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-[#72767d] mt-2">
          {settings.appearance.theme === 'light' && 'Note: Light theme is experimental'}
        </p>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <Label className="text-[#b9bbbe]">Accent Color</Label>
        <div className="flex gap-3 mt-3">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => handleAccentChange(color.id)}
              className={`w-12 h-12 rounded-lg transition-all ${
                settings.appearance.accentColor === color.id
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#36393f]'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            />
          ))}
        </div>
        <p className="text-sm text-[#72767d] mt-3">
          Selected: {accentColors.find(c => c.id === settings.appearance.accentColor)?.name}
        </p>
      </div>
    </div>
  );
}