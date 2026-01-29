import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, MessageCircle, Bell, Compass, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { Input } from './ui/input';
import type { Quest, Severity } from '../worker/models/Quest';
import type { Notification as WorkerNotification } from '../worker/models/Notification';
import { QuestService } from '../worker';
import { GoalComment } from '../worker/models/GoalComment';

interface QuestsMiddlePanelProps {
  quests: Quest[];
  archivedQuests: Quest[];
  notifications: WorkerNotification[];
  onQuestSelect: (questId: string) => void;
  onDiscoverySelect: () => void;
  onNotificationClick: (questId: string) => void;
  onCreateQuestSelect: () => void;
  selectedQuestId: string | null;
  discoveryMode: boolean;
  createQuestMode: boolean;
  // AntiQuest props
  antiQuests?: Quest[];
  onAntiQuestSelect?: (antiQuestId: string) => void;
  selectedAntiQuestId?: string | null;
  onCreateAntiQuestSelect?: () => void;
  createAntiQuestMode?: boolean;
}

export function QuestsMiddlePanel({
  quests,
  archivedQuests,
  notifications,
  onQuestSelect,
  onDiscoverySelect,
  onNotificationClick,
  onCreateQuestSelect,
  selectedQuestId,
  discoveryMode,
  createQuestMode,
  // AntiQuest props
  antiQuests = [],
  onAntiQuestSelect,
  selectedAntiQuestId,
  onCreateAntiQuestSelect,
  createAntiQuestMode = false,
}: QuestsMiddlePanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    myQuests: boolean;
    watching: boolean;
    completed: boolean;
    archived: boolean;
    antiQuests: boolean;
  }>({
    myQuests: true,
    watching: true,
    completed: false,
    archived: false,
    antiQuests: false, // Collapsed by default
  });
  const [searchQuery, setSearchQuery] = useState('');
  // const [questComments, setQuestComments] = useState<Record<string, GoalComment[]>>({});
  // const questService = new QuestService();

  const toggleSection = (section: 'myQuests' | 'watching' | 'completed' | 'archived' | 'antiQuests') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

// const loadQuestComments = async (questId: string) => {
//     try {
//       const comments = await questService.getQuestComments(questId);
//       setQuestComments(prev => ({
//         ...prev,
//         [questId]: comments
//       }));
//     } catch (error) {
//       console.error('Failed to load comments:', error);
//     }
//   };
  // Filter quests based on watchers array (using worker Quest model)
  // IMPORTANT: Exclude AntiQuests from regular quest lists - they have their own section
  const myQuests = quests.filter(q => q.ownerId && !q.hidden && !q.isCompleted && q.type !== 'AntiQuest');
  const completedQuests = quests.filter(q => q.ownerId && !q.hidden && q.isCompleted && q.type !== 'AntiQuest');
  // archivedQuests is now passed as a prop (already filtered to exclude AntiQuests)
  const watchingQuests = quests.filter(q => q.watchers && q.watchers.length > 0 && !q.hidden && q.type !== 'AntiQuest');

  // Categorize my quests
  const personalQuests = myQuests.filter(q => !q.isDungeon && (!q.members || q.members.length <= 1));
  const dungeonQuests = myQuests.filter(q => q.isDungeon);
  const guildQuests = myQuests.filter(q => !q.isDungeon && q.members && q.members.length > 1);

  // Search filter
  const filteredMyQuests = myQuests.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredWatching = watchingQuests.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCompleted = completedQuests.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredArchived = archivedQuests.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) && q.type !== 'AntiQuest'
  );
  const filteredAntiQuests = antiQuests.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to get severity color
  const getSeverityColor = (severity: Severity | undefined) => {
    switch (severity) {
      case 'mild':
        return '#f59e0b';
      case 'moderate':
        return '#ea580c';
      case 'severe':
        return '#dc2626';
      case 'critical':
        return '#be123c';
      default:
        return '#ed4245';
    }
  };

  const QuestItem = ({ quest, isWatching = false }: { quest: Quest; isWatching?: boolean }) => {
    const progress = Math.round((quest.gamification.currentExp / quest.gamification.expToNextLevel) * 100);
    const color = getColorForQuest(quest);
    
    return (
      <button
        onClick={() => onQuestSelect(quest.questId)}
        className={`
          w-full text-left px-2 py-2 rounded hover:bg-[#34373c] transition-colors
          ${selectedQuestId === quest.questId && !discoveryMode ? 'bg-[#404449]' : ''}
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{getIconForQuest(quest)}</span>
          <span className="text-sm text-[#dcddde] flex-1 truncate">{quest.title}</span>
          {isWatching && quest.watchers.length > 0 && (
            <div className="w-5 h-5 rounded-full bg-[#ed4245] flex items-center justify-center shrink-0">
              <span className="text-xs text-white">{quest.watchers.length}</span>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-[40%] h-1 bg-[#202225] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </button>
    );
  };

  const AntiQuestItem = ({ antiQuest }: { antiQuest: Quest }) => {
    // Calculate weekly occurrence count for badge
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = (antiQuest.antiEvents || []).filter(o => new Date(o.timestamp) >= weekStart).length;
    const severity = antiQuest.severity?.userAssigned;
    const severityColor = getSeverityColor(severity);

    return (
      <button
        onClick={() => onAntiQuestSelect?.(antiQuest.questId)}
        className={`
          w-full text-left px-2 py-2 rounded hover:bg-[#34373c] transition-colors
          ${selectedAntiQuestId === antiQuest.questId ? 'bg-[#404449]' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: severityColor }} />
          <span className="text-sm text-[#dcddde] flex-1 truncate">{antiQuest.title}</span>
          {weekCount > 0 && (
            <div className="w-5 h-5 rounded-full bg-[#ed4245] flex items-center justify-center shrink-0">
              <span className="text-xs text-white">{weekCount}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col border-r border-[#202225]">
      {/* Title Bar */}
      <div className="h-12 px-4 flex items-center border-b border-[#202225] shrink-0">
        <span className="text-white uppercase tracking-wide text-xs">Quests</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="p-2 border-b border-[#202225]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
            <Input
              placeholder="Search quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#202225] border-0 pl-8 h-8 text-sm placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
            />
          </div>
        </div>

        {/* Create New Quest (Non-collapsible, always at top) */}
        <div className="border-b border-[#202225] bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#4752C4] bg-opacity-10">
          <button
            onClick={onCreateQuestSelect}
            className={`
              w-full px-3 py-3 flex items-center gap-2 transition-all
              ${createQuestMode ? 'bg-[#5865F2] bg-opacity-20 border-l-4 border-[#5865F2]' : 'hover:bg-[#5865F2] hover:bg-opacity-10'}
            `}
          >
            <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-white">Create New Quest</span>
            <Sparkles className="w-4 h-4 text-[#faa61a] ml-auto" />
          </button>
        </div>

        {/* My Quests (Collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('myQuests')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.myQuests ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">My Quests</span>
            <span className="text-xs text-[#72767d] ml-auto">{filteredMyQuests.length}</span>
          </button>

          {expandedSections.myQuests && (
            <div className="px-2 pb-2 space-y-1">
              {/* Personal Quests */}
              {personalQuests.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1">
                    <span className="text-xs text-[#72767d] uppercase">Personal</span>
                  </div>
                  {personalQuests.filter(q =>
                    q.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(quest => (
                    <QuestItem key={quest.questId} quest={quest} />
                  ))}
                </div>
              )}

              {/* Dungeon Quests */}
              {dungeonQuests.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1">
                    <span className="text-xs text-[#72767d] uppercase">Dungeon</span>
                  </div>
                  {dungeonQuests.filter(q =>
                    q.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(quest => (
                    <QuestItem key={quest.questId} quest={quest} />
                  ))}
                </div>
              )}

              {/* Guild Quests */}
              {guildQuests.length > 0 && (
                <div>
                  <div className="px-2 py-1">
                    <span className="text-xs text-[#72767d] uppercase">Guild</span>
                  </div>
                  {guildQuests.filter(q =>
                    q.title.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(quest => (
                    <QuestItem key={quest.questId} quest={quest} />
                  ))}
                </div>
              )}

              {filteredMyQuests.length === 0 && (
                <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                  No quests found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Watching (Collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('watching')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.watching ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <MessageCircle className="w-4 h-4 text-[#57F287]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Watching</span>
            <span className="text-xs text-[#72767d] ml-auto">{filteredWatching.length}</span>
          </button>

          {expandedSections.watching && (
            <div className="px-2 pb-2 space-y-1">
              {filteredWatching.map(quest => (
                <QuestItem key={quest.questId} quest={quest} isWatching />
              ))}
              {filteredWatching.length === 0 && (
                <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                  No quests being watched
                </div>
              )}
            </div>
          )}
        </div>

        {/* Discover (Link-like, not collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={onDiscoverySelect}
            className={`
              w-full px-3 py-3 flex items-center gap-2 hover:bg-[#34373c] transition-colors
              ${discoveryMode ? 'bg-[#404449]' : ''}
            `}
          >
            <Compass className="w-4 h-4 text-[#00b0f4]" />
            <span className="text-sm text-[#00b0f4]">Discover Quests</span>
          </button>
        </div>

        {/* Completed Quests (Collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('completed')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.completed ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#57F287]">Completed</span>
            <span className="text-xs text-[#72767d] ml-auto">{filteredCompleted.length}</span>
          </button>

          {expandedSections.completed && (
            <div className="px-2 pb-2 space-y-1">
              {filteredCompleted.map(quest => (
                <QuestItem key={quest.questId} quest={quest} />
              ))}
              {filteredCompleted.length === 0 && (
                <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                  No completed quests
                </div>
              )}
            </div>
          )}
        </div>

        {/* Archived Quests (Collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('archived')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.archived ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Archived</span>
            <span className="text-xs text-[#72767d] ml-auto">{filteredArchived.length}</span>
          </button>

          {expandedSections.archived && (
            <div className="px-2 pb-2 space-y-1">
              {/* Archived Quests */}
              {filteredArchived.map(quest => (
                <QuestItem key={quest.questId} quest={quest} />
              ))}

              {filteredArchived.length === 0 && (
                <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                  No archived quests
                </div>
              )}
            </div>
          )}
        </div>

        {/* Anti Quests (Collapsible) */}
        <div className="border-b border-[#202225]">
          <button
            onClick={() => toggleSection('antiQuests')}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#34373c] transition-colors"
          >
            {expandedSections.antiQuests ? (
              <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
            )}
            <AlertTriangle className="w-4 h-4 text-[#ed4245]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Anti Quests</span>
            <span className="text-xs text-[#72767d] ml-auto">{filteredAntiQuests.length}</span>
          </button>

          {expandedSections.antiQuests && (
            <div className="px-2 pb-2 space-y-1">
              {/* Create New AntiQuest Button */}
              {onCreateAntiQuestSelect && (
                <button
                  onClick={onCreateAntiQuestSelect}
                  className={`
                    w-full px-2 py-2.5 rounded flex items-center gap-2 transition-all mb-2
                    ${createAntiQuestMode ? 'bg-[#ed4245] bg-opacity-30 border-2 border-[#ed4245]' : 'bg-[#202225] hover:bg-[#2a2d31] border border-[#202225]'}
                  `}
                >
                  <div className="w-5 h-5 rounded-full bg-[#ed4245] flex items-center justify-center">
                    <Plus className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-[#dcddde]">Create New AntiQuest</span>
                </button>
              )}

              {filteredAntiQuests.map(antiQuest => (
                <AntiQuestItem key={antiQuest.questId} antiQuest={antiQuest} />
              ))}
              {filteredAntiQuests.length === 0 && (
                <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                  No anti quests yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-[#faa61a]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Notifications</span>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <button
                key={notification.id}
                onClick={() => notification.questId && onNotificationClick(notification.questId)}
                className="w-full text-left p-2 rounded bg-[#202225] hover:bg-[#34373c] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={`
                    w-2 h-2 rounded-full shrink-0 mt-1
                    ${notification.type === 'milestone' ? 'bg-[#57F287]' : ''}
                    ${notification.type === 'quest_default' ? 'bg-[#ed4245]' : ''}
                    ${notification.type === 'comment' ? 'bg-[#faa61a]' : ''}
                  `} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#dcddde]">{notification.message}</p>
                    <span className="text-xs text-[#72767d]">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {notifications.length === 0 && (
              <div className="px-2 py-3 text-xs text-[#72767d] text-center">
                No notifications
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getIconForQuest(quest: Quest): string {
  if (quest.isDungeon) return '⚔️';
  if (quest.members && quest.members.length > 1) return '👥';
  return '📋';
}

function getColorForQuest(quest: Quest): string {
  const colors: Record<string, string> = {
    'Trivial': '#72767d',
    'Easy': '#57F287',
    'Medium': '#5865F2',
    'Hard': '#FEE75C',
    'Epic': '#EB459E'
  };
  return colors[quest.difficulty.userAssigned] || '#5865F2';
}