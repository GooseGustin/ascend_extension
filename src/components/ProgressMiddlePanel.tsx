import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProgressMiddlePanelProps {
  selectedView: string;
  onViewSelect: (view: string) => void;
}

export function ProgressMiddlePanel({ selectedView, onViewSelect }: ProgressMiddlePanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    timeBreakdown: true,
    performance: true,
    logs: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const ViewButton = ({ id, label, indent = false }: { id: string; label: string; indent?: boolean }) => (
    <button
      onClick={() => onViewSelect(id)}
      className={`
        w-full text-left px-3 py-2 text-sm transition-colors relative
        ${indent ? 'pl-6' : ''}
        ${selectedView === id ? 'bg-[#404449] text-white' : 'text-[#dcddde] hover:bg-[#34373c]'}
      `}
    >
      {selectedView === id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5865F2]" />
      )}
      {label}
    </button>
  );

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col border-r border-[#202225]">
      {/* Title Bar */}
      <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
        <span className="text-white uppercase tracking-wide text-xs">Progress</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Category */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.overview ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Overview</span>
          </button>
          {expandedSections.overview && (
            <div>
              <ViewButton id="overview" label="Dashboard" indent />
            </div>
          )}
        </div>

        {/* Time Breakdown Category */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('timeBreakdown')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.timeBreakdown ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Time Breakdown</span>
          </button>
          {expandedSections.timeBreakdown && (
            <div>
              <ViewButton id="by-quest" label="By Quest" indent />
              <ViewButton id="by-day" label="By Day" indent />
              <ViewButton id="by-week" label="By Week" indent />
              <ViewButton id="by-month" label="By Month" indent />
            </div>
          )}
        </div>

        {/* Performance Indicators Category */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('performance')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.performance ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Performance</span>
          </button>
          {expandedSections.performance && (
            <div>
              <ViewButton id="best-quests" label="Best Quests" indent />
              <ViewButton id="weak-quests" label="Weak Quests" indent />
              <ViewButton id="completion-trends" label="Completion Trends" indent />
            </div>
          )}
        </div>

        {/* Logs Category */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('logs')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.logs ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Logs</span>
          </button>
          {expandedSections.logs && (
            <div>
              <ViewButton id="session-history" label="Session History" indent />
              <ViewButton id="xp-logs" label="XP Logs" indent />
              <ViewButton id="milestone-log" label="Milestone Log" indent />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
