import { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, Users, Calendar, ListTodo, Eye, UserPlus } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import type { Quest } from '../worker/models/Quest';

interface DiscoveryViewProps {
  quests: Quest[]; // User's quests (for checking watch status)
  publicQuests: Quest[]; // Discoverable public quests
  onJoinQuest: (questId: string) => void;
  onWatchQuest: (questId: string) => void;
}

export function DiscoveryView({ quests, publicQuests, onJoinQuest, onWatchQuest }: DiscoveryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Extract unique tags from public quests
  const allTags = Array.from(new Set(publicQuests.flatMap(q => q.tags)));
  const tags = allTags.length > 0 ? allTags.slice(0, 10) : ['Programming', 'Fitness', 'Learning', 'Creative', 'Team'];

  const filteredQuests = publicQuests.filter(quest => {
    const matchesSearch = quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quest.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => quest.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const toggleQuestExpansion = (questId: string) => {
    setExpandedQuestId(expandedQuestId === questId ? null : questId);
  };

  const getQuestProgress = (quest: Quest): number => {
    return Math.round((quest.gamification.currentExp / quest.gamification.expToNextLevel) * 100);
  };

  const getQuestColor = (quest: Quest): string => {
    const colors: Record<string, string> = {
      'Trivial': '#72767d',
      'Easy': '#57F287',
      'Medium': '#5865F2',
      'Hard': '#FEE75C',
      'Epic': '#EB459E'
    };
    return colors[quest.difficulty.userAssigned] || '#5865F2';
  };

  const isWatching = (questId: string): boolean => {
    return quests.some(q => q.questId === questId && q.watchers.includes(questId));
  };

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col">
      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <span className="text-white">Discover Quests</span>
      </div>

      {/* Search & Filters Bar */}
      <div className="px-6 py-4 border-b border-[#202225] shrink-0">
        <div className="flex gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
            <Input
              placeholder="Search quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#202225] border-[#202225] pl-10 h-10 placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
            />
          </div>
          <Button
            variant="outline"
            className="bg-transparent border-[#4f545c] hover:bg-[#4f545c] hover:text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                );
              }}
              className={`
                px-3 py-1 rounded text-xs transition-colors
                ${selectedTags.includes(tag)
                  ? 'bg-[#5865F2] text-white'
                  : 'bg-[#2f3136] text-[#b9bbbe] hover:bg-[#4f545c]'
                }
              `}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Quest List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {filteredQuests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-[#b9bbbe]">No quests found</p>
              <p className="text-sm text-[#72767d] mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuests.map(quest => {
                const isExpanded = expandedQuestId === quest.questId;
                const watchingQuest = isWatching(quest.questId);
                const progress = getQuestProgress(quest);
                const color = getQuestColor(quest);

                return (
                  <div key={quest.questId} className="bg-[#2f3136] rounded-lg overflow-hidden">
                    {/* Quest Header */}
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="text-3xl shrink-0">
                          {quest.isDungeon ? '⚔️' : quest.members.length > 1 ? '👥' : '📋'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white mb-1">{quest.title}</h3>
                              <p className="text-sm text-[#b9bbbe]">{quest.description}</p>
                            </div>
                          </div>

                          {/* Quest Stats */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1 text-xs text-[#b9bbbe]">
                              <Users className="w-3 h-3" />
                              {quest.members.length || 0} warriors
                            </div>
                            {quest.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-[#b9bbbe]">
                                <Calendar className="w-3 h-3" />
                                {new Date(quest.dueDate).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-[#b9bbbe]">
                              <ListTodo className="w-3 h-3" />
                              {quest.subtasks.length} subtasks
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#b9bbbe]">Cumulative Progress</span>
                              <span className="text-xs text-[#b9bbbe]">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => onJoinQuest(quest.questId)}
                              className="bg-[#57F287] hover:bg-[#3ba55d] text-white"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Join Quest
                            </Button>
                            <Button
                              onClick={() => onWatchQuest(quest.questId)}
                              variant="outline"
                              className={`
                                ${watchingQuest
                                  ? 'bg-[#5865F2] border-[#5865F2] text-white hover:bg-[#4752C4]'
                                  : 'bg-transparent border-[#4f545c] hover:bg-[#4f545c] hover:text-white'
                                }
                              `}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {watchingQuest ? 'Watching' : 'Watch'}
                            </Button>
                            <Button
                              onClick={() => toggleQuestExpansion(quest.questId)}
                              variant="ghost"
                              className="hover:bg-[#4f545c]"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-2" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-4 h-4 mr-2" />
                                  Show Details
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Quest Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-[#202225] pt-4">
                        <h4 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">
                          Subtasks ({quest.subtasks.length})
                        </h4>
                        <div className="space-y-2">
                          {quest.subtasks.map((subtask, index) => (
                            <div
                              key={subtask.id}
                              className="bg-[#202225] rounded px-3 py-2 flex items-center gap-3"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#4f545c] flex items-center justify-center shrink-0 text-xs text-[#b9bbbe]">
                                {index + 1}
                              </div>
                              <span className="text-sm text-[#dcddde] flex-1">{subtask.title}</span>
                              <span className="text-xs text-[#00b0f4]">
                                ~{subtask.estimatePomodoros}🍅
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Additional Quest Info */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="bg-[#202225] rounded p-3">
                            <div className="text-xs text-[#b9bbbe] mb-1">Difficulty</div>
                            <div className="text-sm text-white">
                              {quest.difficulty.gmValidated || quest.difficulty.userAssigned}
                            </div>
                          </div>
                          <div className="bg-[#202225] rounded p-3">
                            <div className="text-xs text-[#b9bbbe] mb-1">Frequency</div>
                            <div className="text-sm text-white">{quest.schedule.frequency}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}