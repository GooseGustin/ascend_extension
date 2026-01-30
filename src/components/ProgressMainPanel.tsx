import { OverviewDashboard } from './OverviewDashboard';
import { SessionHistoryView } from './SessionHistoryView';
import { WeakQuestsView } from './WeakQuestsView';
import { BestQuestsView } from './BestQuestsView';
import { CompletionTrendsView } from './CompletionTrendsView';
import { XPLogsView } from './XPLogsView';
import { ByQuestView } from './ByQuestView';
import { AntiQuestAnalytics } from './AntiQuestAnalytics';
import type { Quest } from '../worker/models/Quest';

interface ProgressMainPanelProps {
  userId: string;
  selectedView: string;
  antiQuests?: Quest[];
}

export function ProgressMainPanel({ userId, selectedView, antiQuests = [] }: ProgressMainPanelProps) {
  const renderContent = () => {
    switch (selectedView) {
      case 'overview':
        return <OverviewDashboard userId={userId} timeView="overview" />;
      case 'by-day':
        return <OverviewDashboard userId={userId} timeView="by-day" />;
      case 'by-week':
        return <OverviewDashboard userId={userId} timeView="by-week" />;
      case 'by-month':
        return <OverviewDashboard userId={userId} timeView="by-month" />;
      case 'by-quest':
        return <ByQuestView userId={userId} />;
      case 'session-history':
        return <SessionHistoryView userId={userId} />;
      case 'xp-logs':
        return <XPLogsView userId={userId} />;
      case 'milestone-log':
        return <SessionHistoryView userId={userId} logType="milestone" />;
      case 'weak-quests':
        return <WeakQuestsView userId={userId} />;
      case 'best-quests':
        return <BestQuestsView userId={userId} />;
      case 'completion-trends':
        return <CompletionTrendsView userId={userId} />;
      // AntiQuest Analytics views
      case 'aq-overview':
        return <AntiQuestAnalytics antiQuests={antiQuests} view="aq-overview" userId={userId} />;
      case 'aq-trends':
        return <AntiQuestAnalytics antiQuests={antiQuests} view="aq-trends" userId={userId} />;
      case 'aq-impact':
        return <AntiQuestAnalytics antiQuests={antiQuests} view="aq-impact" userId={userId} />;
      case 'aq-gaps':
        return <AntiQuestAnalytics antiQuests={antiQuests} view="aq-gaps" userId={userId} />;
      default:
        return <OverviewDashboard userId={userId} timeView="overview" />;
    }
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col">
      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <span className="text-white">Progress</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#72767d]">Last synced: 2 mins ago</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}