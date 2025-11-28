import { useState } from "react";
import { useModal } from "../context/ModalContext";
import { Checkbox as UICheckbox } from "./ui/checkbox";
import {
  SectionHeader,
  Toggle,
  TextInput,
  NumberInput,
  Select,
  RadioGroup,
  SettingsButton,
  ColorSwatch,
  ExpandableSection,
  ControlGroup,
} from "./SettingsUIComponents";
import {
  User,
  Bell,
  Palette,
  Clock,
  Brain,
  Database,
  Puzzle,
  Info,
  AlertTriangle,
} from "lucide-react";

interface SettingsMainPanelProps {
  selectedSection: string;
}

export function SettingsMainPanel({
  selectedSection,
}: SettingsMainPanelProps) {
  const { showModal, hideModal } = useModal();

  // Global settings state
  const [settings, setSettings] = useState({
    // Account
    displayName: "Player One",
    email: "player@ascend.game",
    emailVerified: true,
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",

    // Notifications
    dailySummary: true,
    dailySummaryTime: "09:00",
    taskDueReminders: true,
    questScheduleReminders: true,
    aiNudges: true,

    // Appearance
    theme: "dark",
    accentColor: "#5865F2",

    // Productivity
    defaultFocusDuration: 25,
    defaultBreakDuration: 5,
    longBreakDuration: 15,
    longBreakAfterSessions: 4,
    autoStartNextSession: false,
    defaultTaskPriority: "B",
    defaultTaskPomodoros: 1,
    defaultQuestType: "Quest",
    defaultQuestFrequency: "Daily",
    defaultQuestTime: "09:00",

    // AI
    aiTone: "standard",
    nudgeFrequency: "medium",
    dailyPlanSuggestions: true,
    questTips: true,
    scheduleHints: true,
    weeklyAnalysis: false,

    // Extension
    autoOpenNewTab: false,
    keyboardShortcutOverlay: false,

    // Sync
    syncToCloud: false,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const showConfirmationModal = (
    title: string,
    description: string,
    onConfirm: () => void,
    isDanger = false
  ) => {
    showModal(
      <div className="bg-[#36393f] rounded-lg shadow-lg max-w-md p-6 border border-[#202225]">
        <h2 className="text-xl text-white font-semibold mb-2">{title}</h2>
        <p className="text-sm text-[#b9bbbe] mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => hideModal()}
            className="px-4 py-2 rounded text-sm text-[#dbdee1] bg-[#2f3136] hover:bg-[#4f545c] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              hideModal();
            }}
            className={`px-4 py-2 rounded text-sm text-white transition-colors ${
              isDanger
                ? "bg-[#ED4245] hover:bg-[#c03537]"
                : "bg-[#5865F2] hover:bg-[#4752C4]"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  };

  // Render sections
  const renderSection = () => {
    switch (selectedSection) {
      case "account":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<User className="w-6 h-6" />}
              title="Account"
              description="Manage your profile and authentication settings"
            />

            <TextInput
              label="Display Name"
              value={settings.displayName}
              onChange={(val) => handleSettingChange("displayName", val)}
              placeholder="Your name"
            />

            <div className="bg-[#2f3136] rounded border border-[#202225] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#dcddde]">Email</p>
                  <p className="text-xs text-[#72767d] mt-1">
                    {settings.email}
                  </p>
                </div>
                {settings.emailVerified && (
                  <span className="text-xs px-2 py-1 bg-[#57F287] bg-opacity-20 text-[#57F287] rounded">
                    ✓ Verified
                  </span>
                )}
              </div>
              {!settings.emailVerified && (
                <SettingsButton
                  label="Resend Verification Email"
                  onClick={() => alert("Verification email sent!")}
                  variant="secondary"
                />
              )}
            </div>

            <ExpandableSection title="Change Password">
              <div className="space-y-5">
                <TextInput
                  label="Old Password"
                  value={settings.oldPassword}
                  onChange={(val) => handleSettingChange("oldPassword", val)}
                  type="password"
                />
                <TextInput
                  label="New Password"
                  value={settings.newPassword}
                  onChange={(val) => handleSettingChange("newPassword", val)}
                  type="password"
                />
                <TextInput
                  label="Confirm Password"
                  value={settings.confirmPassword}
                  onChange={(val) => handleSettingChange("confirmPassword", val)}
                  type="password"
                />
                <SettingsButton
                  label="Update Password"
                  onClick={() => alert("Password updated!")}
                  variant="primary"
                />
              </div>
            </ExpandableSection>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Bell className="w-6 h-6" />}
              title="Notifications"
              description="Control when and how Ascend notifies you"
            />

            <div className="space-y-5">
              <Toggle
                label="Daily Summary"
                description="Get a summary of your tasks at a preferred time"
                checked={settings.dailySummary}
                onChange={(val) => handleSettingChange("dailySummary", val)}
              />

              {settings.dailySummary && (
                <div className="pl-4 border-l-2 border-[#5865F2]">
                  <TextInput
                    label="Preferred Time"
                    value={settings.dailySummaryTime}
                    onChange={(val) =>
                      handleSettingChange("dailySummaryTime", val)
                    }
                    type="time"
                  />
                </div>
              )}

              <Toggle
                label="Task Due Reminders"
                description="Notify me when tasks are due"
                checked={settings.taskDueReminders}
                onChange={(val) => handleSettingChange("taskDueReminders", val)}
              />

              <Toggle
                label="Quest Schedule Reminders"
                description="Remind me about scheduled quests"
                checked={settings.questScheduleReminders}
                onChange={(val) =>
                  handleSettingChange("questScheduleReminders", val)
                }
              />

              <Toggle
                label="Grandmaster AI Nudges"
                description="Gentle reminders about inactive quests and productivity tips"
                checked={settings.aiNudges}
                onChange={(val) => handleSettingChange("aiNudges", val)}
              />
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Palette className="w-6 h-6" />}
              title="Appearance"
              description="Customize how Ascend looks"
            />

            <RadioGroup
              label="Theme"
              value={settings.theme}
              onChange={(val) => handleSettingChange("theme", val)}
              options={[
                { value: "light", label: "Light (Coming Soon)" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System Default" },
              ]}
            />

            <div>
              <label className="text-xs font-medium uppercase text-[#b9bbbe] block mb-3">
                Accent Color
              </label>
              <div className="grid grid-cols-4 gap-4">
                <ColorSwatch
                  color="#5865F2"
                  label="Blue"
                  isSelected={settings.accentColor === "#5865F2"}
                  onSelect={() => handleSettingChange("accentColor", "#5865F2")}
                />
                <ColorSwatch
                  color="#57F287"
                  label="Emerald"
                  isSelected={settings.accentColor === "#57F287"}
                  onSelect={() => handleSettingChange("accentColor", "#57F287")}
                />
                <ColorSwatch
                  color="#8B5CF6"
                  label="Purple"
                  isSelected={settings.accentColor === "#8B5CF6"}
                  onSelect={() => handleSettingChange("accentColor", "#8B5CF6")}
                />
                <ColorSwatch
                  color="#FEE75C"
                  label="Gold"
                  isSelected={settings.accentColor === "#FEE75C"}
                  onSelect={() => handleSettingChange("accentColor", "#FEE75C")}
                />
              </div>
            </div>
          </div>
        );

      case "productivity":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Clock className="w-6 h-6" />}
              title="Productivity Preferences"
              description="Set defaults for your tasks and focus sessions"
            />

            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-semibold text-[#dcddde] mb-4">
                  Pomodoro Defaults
                </h4>
                <div className="space-y-5">
                  <NumberInput
                    label="Focus Duration"
                    value={settings.defaultFocusDuration}
                    onChange={(val) =>
                      handleSettingChange("defaultFocusDuration", val)
                    }
                    min={1}
                    max={60}
                    suffix="minutes"
                  />
                  <NumberInput
                    label="Break Duration"
                    value={settings.defaultBreakDuration}
                    onChange={(val) =>
                      handleSettingChange("defaultBreakDuration", val)
                    }
                    min={1}
                    max={30}
                    suffix="minutes"
                  />
                  <NumberInput
                    label="Long Break Duration"
                    value={settings.longBreakDuration}
                    onChange={(val) =>
                      handleSettingChange("longBreakDuration", val)
                    }
                    min={1}
                    max={60}
                    suffix="minutes"
                  />
                  <Toggle
                    label="Auto-start Next Session"
                    checked={settings.autoStartNextSession}
                    onChange={(val) =>
                      handleSettingChange("autoStartNextSession", val)
                    }
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-[#202225]">
                <h4 className="text-sm font-semibold text-[#dcddde] mb-4">
                  Task Defaults
                </h4>
                <div className="space-y-5">
                  <Select
                    label="Default Priority"
                    value={settings.defaultTaskPriority}
                    onChange={(val) =>
                      handleSettingChange("defaultTaskPriority", val)
                    }
                    options={[
                      { value: "A", label: "A - High" },
                      { value: "B", label: "B - Medium" },
                      { value: "C", label: "C - Low" },
                    ]}
                  />
                  <NumberInput
                    label="Default Pomodoro Estimate"
                    value={settings.defaultTaskPomodoros}
                    onChange={(val) =>
                      handleSettingChange("defaultTaskPomodoros", val)
                    }
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-[#202225]">
                <h4 className="text-sm font-semibold text-[#dcddde] mb-4">
                  Quest Defaults
                </h4>
                <div className="space-y-5">
                  <Select
                    label="Default Quest Type"
                    value={settings.defaultQuestType}
                    onChange={(val) =>
                      handleSettingChange("defaultQuestType", val)
                    }
                    options={[
                      { value: "Quest", label: "Quest" },
                      { value: "TodoQuest", label: "Todo Quest" },
                    ]}
                  />
                  <Select
                    label="Default Frequency"
                    value={settings.defaultQuestFrequency}
                    onChange={(val) =>
                      handleSettingChange("defaultQuestFrequency", val)
                    }
                    options={[
                      { value: "Daily", label: "Daily" },
                      { value: "Weekly", label: "Weekly" },
                      { value: "Custom", label: "Custom" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "grandmaster-ai":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Brain className="w-6 h-6" />}
              title="Grandmaster AI"
              description="Configure your AI coach's personality and behavior"
            />

            <RadioGroup
              label="AI Persona Tone"
              value={settings.aiTone}
              onChange={(val) => handleSettingChange("aiTone", val)}
              options={[
                {
                  value: "mild",
                  label: "Mild Mentor",
                  description: "Gentle guidance",
                },
                {
                  value: "standard",
                  label: "Standard Grandmaster",
                  description: "Balanced wisdom",
                },
                {
                  value: "tough",
                  label: "Tough-Love Drill Sergeant",
                  description: "Direct feedback",
                },
              ]}
            />

            <Select
              label="Nudge Frequency"
              value={settings.nudgeFrequency}
              onChange={(val) => handleSettingChange("nudgeFrequency", val)}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />

            <div className="pt-6 border-t border-[#202225]">
              <h4 className="text-sm font-semibold text-[#dcddde] mb-4">
                Auto Suggestions
              </h4>
              <div className="space-y-4">
                <Toggle
                  label="Daily Plan Suggestions"
                  checked={settings.dailyPlanSuggestions}
                  onChange={(val) =>
                    handleSettingChange("dailyPlanSuggestions", val)
                  }
                />
                <Toggle
                  label="Quest Improvement Tips"
                  checked={settings.questTips}
                  onChange={(val) => handleSettingChange("questTips", val)}
                />
                <Toggle
                  label="Schedule Adjustment Hints"
                  checked={settings.scheduleHints}
                  onChange={(val) => handleSettingChange("scheduleHints", val)}
                />
                <Toggle
                  label="Weekly Progress Analysis"
                  checked={settings.weeklyAnalysis}
                  onChange={(val) => handleSettingChange("weeklyAnalysis", val)}
                />
              </div>
            </div>

            <SettingsButton
              label="Reset AI Memory"
              onClick={() =>
                showConfirmationModal(
                  "Reset AI Memory?",
                  "This will clear all learned preferences. Are you sure?",
                  () => alert("AI memory reset!")
                )
              }
              variant="secondary"
            />
          </div>
        );

      case "data-storage":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Database className="w-6 h-6" />}
              title="Data & Storage"
              description="Manage your data, backups, and storage"
            />

            <SettingsButton
              label="Export My Data"
              onClick={() => alert("Data exported as JSON")}
              variant="primary"
              description="Download all quests, tasks, and stats as JSON"
            />

            <SettingsButton
              label="Clear Cached Data"
              onClick={() =>
                showConfirmationModal(
                  "Clear Cached Data?",
                  "This will reset local state but not delete cloud data.",
                  () => alert("Cache cleared!")
                )
              }
              variant="secondary"
              description="Reset local state (will not delete cloud data)"
            />

            <Toggle
              label="Sync to Cloud"
              description="Automatically backup your progress"
              checked={settings.syncToCloud}
              onChange={(val) => handleSettingChange("syncToCloud", val)}
              disabled
            />

            <div className="bg-[#2f3136] rounded border border-[#202225] p-4">
              <p className="text-xs text-[#72767d] mb-2">Storage Usage</p>
              <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[#5865F2]"
                  style={{ width: "15%" }}
                />
              </div>
              <p className="text-xs text-[#dcddde]">
                Using 2.3 MB of 50 MB available
              </p>
            </div>
          </div>
        );

      case "extension":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Puzzle className="w-6 h-6" />}
              title="Extension Settings"
              description="Configure Chrome extension behavior"
            />

            <Toggle
              label="Auto-open on New Tab"
              checked={settings.autoOpenNewTab}
              onChange={(val) => handleSettingChange("autoOpenNewTab", val)}
            />

            <Toggle
              label="Keyboard Shortcut Overlay"
              description="Press Alt+A to quick-add tasks"
              checked={settings.keyboardShortcutOverlay}
              onChange={(val) =>
                handleSettingChange("keyboardShortcutOverlay", val)
              }
            />

            <SettingsButton
              label="View Extension Permissions"
              onClick={() => alert("Opening Chrome extensions page...")}
              variant="secondary"
            />

            <a
              href="chrome://extensions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors inline-block"
            >
              Manage in Chrome Extensions →
            </a>
          </div>
        );

      case "about":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<Info className="w-6 h-6" />}
              title="About"
              description="Version info, support, and legal"
            />

            <div className="bg-[#2f3136] rounded border border-[#202225] p-6 text-center">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="text-lg font-bold text-white mb-1">
                Ascend v1.0.0-beta
              </h3>
              <p className="text-sm text-[#b9bbbe]">
                Solo Leveling-inspired productivity system
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="#"
                className="block text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                📖 Documentation
              </a>
              <a
                href="mailto:support@ascend.game"
                className="block text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                💬 Contact Support
              </a>
              <a
                href="#"
                className="block text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                🔐 Privacy Policy
              </a>
              <a
                href="#"
                className="block text-sm text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                📜 Terms of Service
              </a>
            </div>

            <SettingsButton
              label="Check for Updates"
              onClick={() => alert("You're running the latest version!")}
              variant="secondary"
            />
          </div>
        );

      case "danger-zone":
        return (
          <div className="space-y-8">
            <SectionHeader
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Danger Zone"
              description="Irreversible actions - proceed with caution"
            />

            <div className="bg-[#ED424515] border border-[#ED4245] rounded-lg p-6 space-y-4">
              <SettingsButton
                label="Reset All Progress"
                onClick={() =>
                  showConfirmationModal(
                    "Reset All Progress?",
                    "This action cannot be undone. All quests, tasks, and stats will be deleted.",
                    () => alert("Progress reset!"),
                    true
                  )
                }
                variant="danger"
                description="Permanently delete all your quests, tasks, and progress"
              />

              <SettingsButton
                label="Delete Account"
                onClick={() =>
                  showConfirmationModal(
                    "Delete Account?",
                    "This action cannot be undone. Your account and all data will be permanently deleted.",
                    () => alert("Account deleted!"),
                    true
                  )
                }
                variant="danger"
                description="Permanently delete your account and all associated data"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl">{renderSection()}</div>
      </div>

      {/* Save Button */}
      <div className="border-t border-[#202225] bg-[#2f3136] px-8 py-4 flex justify-end gap-3">
        <button className="px-8 py-2 rounded text-sm text-[#dbdee1] bg-[#202225] hover:bg-[#4f545c] transition-colors font-medium">
          Cancel
        </button>
        <button className="px-8 py-2 rounded text-sm text-white bg-[#5865F2] hover:bg-[#4752C4] transition-colors font-medium">
          Save Changes
        </button>
      </div>
    </div>
  );
}
