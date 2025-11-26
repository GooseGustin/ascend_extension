import { Suspense } from 'react';
import { QuestDetails } from './QuestDetails';
import { DiscoveryView } from './DiscoveryView';
import type { Quest, Subtask } from '../worker/models/Quest';
import type { GoalComment } from '../worker/models/GoalComment';
import { Task } from '../App';
import { QuestCreationForm } from './QuestCreationForm';
// import { FloatingPlusButton } from './FloatingPlusButton';

interface QuestsMainPanelProps {
  quests: Quest[];
  tasks: Task[];
  selectedQuestId: string | null;
  discoveryMode: boolean;
  createQuestMode: boolean;
  questComments: Record<string, GoalComment[]>;
  publicQuests?: Quest[];
  onStartFocus: (subtask: Task | Subtask, questTitle: string) => void;
  onJoinQuest: (questId: string) => void;
  onWatchQuest: (questId: string) => void;
  onToggleSubtask: (questId: string, subtaskId: string) => void;
  onAddComment?: (questId: string, text: string) => void;
  // onCreateQuest: (quest: Omit<Quest, 'id' | 'currentXP' | 'progress'>) => void;
  onCreateQuest: () => void;
  onCancelCreate: () => void;
  onAddSubtask: (questId: string, title: string) => void;
  onFloatingPlusClick: () => void;
  onDeleteQuest?: (questId: string) => void;
  onArchiveQuest?: (questId: string) => void;
  onUpdateQuest?: (questId: string, updates: Partial<Quest>) => void;
}

export function QuestsMainPanel({
  quests,
  tasks,
  selectedQuestId,
  discoveryMode,
  createQuestMode, 
  questComments,
  publicQuests = [],
  onStartFocus,
  onJoinQuest,
  onWatchQuest,
  onToggleSubtask,
  onAddComment,
  onCreateQuest,
  onCancelCreate,
  onAddSubtask,
  onFloatingPlusClick,
}: QuestsMainPanelProps) {
  const selectedQuest = selectedQuestId ? quests.find(q => q.questId === selectedQuestId) : null;

  if (createQuestMode) {
    return (
      <Suspense fallback={<div>Loading form...</div>}>
        <QuestCreationForm
          onCreateQuest={onCreateQuest}
          onCancel={onCancelCreate}
        />
      </Suspense>
    );
  }

  if (discoveryMode) {
    return (
      <DiscoveryView
        quests={quests}
        publicQuests={publicQuests}
        onJoinQuest={onJoinQuest}
        onWatchQuest={onWatchQuest}
      />
    );
  }

  if (selectedQuest) {
    const comments = questComments[selectedQuest.questId] || [];
    return (
      <QuestDetails
        quest={selectedQuest}
        tasks={tasks}
        comments={comments}
        onStartFocus={onStartFocus}
        onToggleSubtask={onToggleSubtask}
        onAddSubtask={onAddSubtask}
        onAddComment={onAddComment}
      />
    );
  }

  // Default empty state
  return (
    <div className="flex-1 bg-[#36393f] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <h2 className="text-xl text-white mb-2">Select a Quest</h2>
        <p className="text-sm text-[#72767d]">Choose a quest from the sidebar to get started</p>
      </div>
    </div>
  );
}
