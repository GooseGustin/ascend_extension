import { useEffect, useState } from 'react';
import { getSettingsService, AuthService } from '../worker';
import type { UserSettings } from '../worker/models/UserSettings';
import { AccountSection } from './settings/AccountSection';
import { NotificationsSection } from './settings/NotificationsSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { ProductivitySection } from './settings/ProductivitySection';
import { AISection } from './settings/AISection';
import { DataSection } from './settings/DataSection';
import { ExtensionSection } from './settings/ExtensionSection';
import { AboutSection } from './settings/AboutSection';
import { DangerSection } from './settings/DangerSection';

type SettingsSection = 
  | 'account' 
  | 'notifications' 
  | 'appearance' 
  | 'productivity' 
  | 'ai' 
  | 'data' 
  | 'extension' 
  | 'about' 
  | 'danger';

interface SettingsMainPanelProps {
  selectedSection: SettingsSection;
}

export function SettingsMainPanel({ selectedSection }: SettingsMainPanelProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const settingsService = getSettingsService();
  const authService = new AuthService();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Get userId from auth service (same as rest of app)
      const userId = await authService.getCurrentUserId();
      console.log('[SETTINGS] Loading settings for userId:', userId);
      const userSettings = await settingsService.getUserSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<UserSettings>) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await settingsService.updateSettings(settings.userId, updates);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#36393f] flex items-center justify-center">
        <div className="text-[#dcddde]">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 bg-[#36393f] flex items-center justify-center">
        <div className="text-[#ed4245]">Failed to load settings</div>
      </div>
    );
  }

  const getSectionTitle = () => {
    const titles: Record<SettingsSection, string> = {
      account: 'Account',
      notifications: 'Notifications',
      appearance: 'Appearance',
      productivity: 'Productivity Preferences',
      ai: 'Grandmaster AI',
      data: 'Data & Storage',
      extension: 'Extension Settings',
      about: 'About & Support',
      danger: 'Danger Zone',
    };
    return titles[selectedSection];
  };

  const renderSection = () => {
    const props = { settings, onUpdate: handleUpdate, isSaving };

    switch (selectedSection) {
      case 'account':
        return <AccountSection {...props} />;
      case 'notifications':
        return <NotificationsSection {...props} />;
      case 'appearance':
        return <AppearanceSection {...props} />;
      case 'productivity':
        return <ProductivitySection {...props} />;
      case 'ai':
        return <AISection {...props} />;
      case 'data':
        return <DataSection {...props} />;
      case 'extension':
        return <ExtensionSection {...props} />;
      case 'about':
        return <AboutSection />;
      case 'danger':
        return <DangerSection settings={settings} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col overflow-hidden">
      {/* Title Bar */}
      {/* <div className="h-12 px-6 flex items-center border-b border-[#202225] shrink-0">
        <h2 className="text-white font-semibold">{getSectionTitle()}</h2>
        {isSaving && (
          <span className="ml-4 text-xs text-[#72767d]">Saving...</span>
        )}
      </div> */}

      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <span className="text-white">{getSectionTitle()}</span>
        {isSaving && (
          <span className="ml-4 text-xs text-[#72767d]">Saving...</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

