import { Search, User, Bell, Palette, Clock, Brain, Database, Puzzle, Info, AlertTriangle } from 'lucide-react';
import { Input } from './ui/input';
import { useState } from 'react';

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

interface SettingsMiddlePanelProps {
  selectedSection: SettingsSection;
  onSectionSelect: (section: SettingsSection) => void;
}

export function SettingsMiddlePanel({ 
  selectedSection, 
  onSectionSelect 
}: SettingsMiddlePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const settingsSections = [
    // { id: 'account' as SettingsSection, icon: User, label: 'Account' },
    { id: 'notifications' as SettingsSection, icon: Bell, label: 'Notifications' },
    // { id: 'appearance' as SettingsSection, icon: Palette, label: 'Appearance' },
    { id: 'productivity' as SettingsSection, icon: Clock, label: 'Productivity' },
    // { id: 'ai' as SettingsSection, icon: Brain, label: 'Grandmaster AI' },
    { id: 'data' as SettingsSection, icon: Database, label: 'Data & Storage' },
    { id: 'extension' as SettingsSection, icon: Puzzle, label: 'Extension' },
    { id: 'about' as SettingsSection, icon: Info, label: 'About' },
    { id: 'danger' as SettingsSection, icon: AlertTriangle, label: 'Danger Zone' },
  ];

  const filteredSections = settingsSections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col shrink-0 border-r border-[#202225]">
      {/* Title Bar */}
      <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
        <span className="text-white uppercase tracking-wide text-xs">
          Settings
        </span>
      </div>

      {/* Search */}      
      <div className="p-2 border-b border-[#202225]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#202225] border-0 pl-8 h-8 text-sm placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
          />
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section.id)}
              // className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${
              className={`w-full text-left px-3 py-3 text-sm flex transition-colors relative ${
                selectedSection === section.id
                  ? 'bg-[#404249] text-white'
                  : 'text-[#b9bbbe] hover:bg-[#28292c] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="px-2 text-sm">{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// activeSection === section.id
//                     ? 'bg-[#404249] text-white'
//                     : 'text-[#b5bac1] hover:bg-[#35363c] hover:text-white'


// import {
//   User,
//   Bell,
//   Palette,
//   Clock,
//   Brain,
//   Database,
//   Puzzle,
//   Info,
//   AlertTriangle,
// } from "lucide-react";

// interface SettingsMiddlePanelProps {
//   selectedSection: string;
//   onSectionSelect: (section: string) => void;
// }

// const sections = [
//   { id: "account", icon: User, label: "Account" },
//   { id: "notifications", icon: Bell, label: "Notifications" },
//   { id: "appearance", icon: Palette, label: "Appearance" },
//   { id: "productivity", icon: Clock, label: "Productivity" },
//   { id: "grandmaster-ai", icon: Brain, label: "Grandmaster AI" },
//   { id: "data-storage", icon: Database, label: "Data & Storage" },
//   { id: "extension", icon: Puzzle, label: "Extension" },
//   { id: "about", icon: Info, label: "About" },
//   { id: "danger-zone", icon: AlertTriangle, label: "Danger Zone" },
// ];

// export function SettingsMiddlePanel({
//   selectedSection,
//   onSectionSelect,
// }: SettingsMiddlePanelProps) {
//   return (
//     <div className="w-60 bg-[#2f3136] border-r border-[#202225] flex flex-col overflow-hidden">
//       {/* Header */}
//       <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
//         <h2 className="text-lg text-white font-bold uppercase">Settings</h2>
//       </div>

//       {/* Navigation Items */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-2">
//         {sections.map((section) => {
//           const Icon = section.icon;
//           const isActive = selectedSection === section.id;

//           return (
//             <button
//               key={section.id}
//               onClick={() => onSectionSelect(section.id)}
//               className={`w-full px-3 py-2.5 rounded text-left flex items-center gap-3 transition-colors text-sm ${
//                 isActive
//                   ? "bg-[#5865F2] text-white font-medium"
//                   : "text-[#dcddde] hover:bg-[#34373c]"
//               }`}
//             >
//               <Icon className="w-4 h-4 flex-shrink-0" />
//               <span>{section.label}</span>
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
