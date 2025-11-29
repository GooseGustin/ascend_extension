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

interface SettingsMiddlePanelProps {
  selectedSection: string;
  onSectionSelect: (section: string) => void;
}

const sections = [
  { id: "account", icon: User, label: "Account" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "productivity", icon: Clock, label: "Productivity" },
  { id: "grandmaster-ai", icon: Brain, label: "Grandmaster AI" },
  { id: "data-storage", icon: Database, label: "Data & Storage" },
  { id: "extension", icon: Puzzle, label: "Extension" },
  { id: "about", icon: Info, label: "About" },
  { id: "danger-zone", icon: AlertTriangle, label: "Danger Zone" },
];

export function SettingsMiddlePanel({
  selectedSection,
  onSectionSelect,
}: SettingsMiddlePanelProps) {
  return (
    <div className="w-60 bg-[#2f3136] border-r border-[#202225] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
        <h2 className="text-lg text-white font-bold uppercase">Settings</h2>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = selectedSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section.id)}
              className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-3 transition-colors text-sm ${
                isActive
                  ? "bg-[#5865F2] text-white font-medium"
                  : "text-[#dcddde] hover:bg-[#34373c]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
