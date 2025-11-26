import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, MessageCircle, Bell, Compass, Plus, Sparkles } from 'lucide-react';
import { Input } from './ui/input';
import type { Quest } from '../worker/models/Quest';
import type { Notification as WorkerNotification } from '../worker/models/Notification';
import { QuestService } from '../worker';
import { GoalComment } from '../worker/models/GoalComment';

interface QuestsMiddlePanelProps {
  quests: Quest[];
  notifications: WorkerNotification[];
  onQuestSelect: (questId: string) => void;
  onDiscoverySelect: () => void;
  onNotificationClick: (questId: string) => void;
  onCreateQuestSelect: () => void; 
  selectedQuestId: string | null;
  discoveryMode: boolean;
  createQuestMode: boolean;
}

export function QuestsMiddlePanel({
  quests,
  notifications,
  onQuestSelect,
  onDiscoverySelect,
  onNotificationClick,
  onCreateQuestSelect, 
  selectedQuestId,
  discoveryMode,
  createQuestMode,
}: QuestsMiddlePanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    myQuests: boolean;
    watching: boolean;
  }>({
    myQuests: true,
    watching: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  // const [questComments, setQuestComments] = useState<Record<string, GoalComment[]>>({});
  // const questService = new QuestService();

  const toggleSection = (section: 'myQuests' | 'watching') => {
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
  const myQuests = quests.filter(q => q.ownerId); // Quests I own
  const watchingQuests = quests.filter(q => q.watchers && q.watchers.length > 0);

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

        {/* Notifications */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-[#faa61a]" />
            <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Notifications</span>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <button
                key={notification.notificationId}
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