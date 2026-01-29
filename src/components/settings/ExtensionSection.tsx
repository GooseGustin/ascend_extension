import { Label } from '../ui/label';
import { ToggleSwitch } from '../ui/toggle-switch';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import type { UserSettings } from '../../worker/models/UserSettings';

interface ExtensionSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function ExtensionSection({ settings, onUpdate }: ExtensionSectionProps) {
  const handleToggle = async (
    key: keyof UserSettings['extension'],
    value: boolean
  ) => {
    await onUpdate({
      extension: {
        ...settings.extension,
        [key]: value,
      },
    });
  };

  const handleViewPermissions = () => {
    // For Chrome extension
    if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.permissions) {
      (window as any).chrome.permissions.getAll((permissions: any) => {
        alert(
          `Permissions:\n${JSON.stringify(permissions, null, 2)}\n\nManage these in chrome://extensions`
        );
      });
    } else {
      alert('Extension permissions can be managed in chrome://extensions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Auto-open on New Tab</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Open Ascend when creating a new tab
          </p>
        </div>
        <ToggleSwitch
          checked={settings.extension.autoOpenNewTab}
          onCheckedChange={(checked) => handleToggle('autoOpenNewTab', checked)}
        />
      </div>

      <Separator className="bg-[#202225]" />

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#dcddde]">Enable Keyboard Shortcut Overlay</Label>
          <p className="text-sm text-[#72767d] mt-1">
            Show keyboard shortcuts on hover
          </p>
        </div>
        <ToggleSwitch
          checked={settings.extension.keyboardShortcuts}
          onCheckedChange={(checked) => handleToggle('keyboardShortcuts', checked)}
        />
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <Button
          onClick={handleViewPermissions}
          variant="outline"
          className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]"
        >
          View Extension Permissions
        </Button>
        <p className="text-sm text-[#72767d] mt-2">
          Review what permissions Ascend has access to
        </p>
      </div>
    </div>
  );
}