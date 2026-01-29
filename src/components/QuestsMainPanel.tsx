import { Suspense, useState } from 'react';
import { QuestDetails } from './QuestDetails';
import { DiscoveryView } from './DiscoveryView';
import { AntiQuestDetails } from './AntiQuestDetails';
import { AntiQuestCreationForm } from './AntiQuestCreationForm';
import { AntiQuestEditForm } from './AntiQuestEditForm';
import type { Quest, Subtask, Severity } from '../worker/models/Quest';
import type { GoalComment } from '../worker/models/GoalComment';
import { Task } from '../App';
import { QuestCreationForm } from './QuestCreationForm';
import { QuestEditForm } from './QuestEditForm';
// import { FloatingPlusButton } from './FloatingPlusButton';

interface QuestsMainPanelProps {
  quests: Quest[];
  archivedQuests?: Quest[];
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
  onAddSubtask: (questId: string, title: string) => void | Promise<void>;
  // onFloatingPlusClick: () => void;
  onDeleteQuest?: (questId: string) => void;
  onArchiveQuest?: (questId: string) => void;
  onUpdateQuest?: (questId: string, updates: Partial<Quest>) => void;
  // AntiQuest props
  antiQuests?: Quest[];
  selectedAntiQuestId?: string | null;
  onLogOccurrence?: (antiQuestId: string, notes?: string, timestamp?: string) => void;
  createAntiQuestMode?: boolean;
  onCreateAntiQuest?: (data: { title: string; description?: string; severity: Severity; tags?: string[] }) => void;
  onCancelAntiQuestCreate?: () => void;
  onDeleteAntiQuest?: (antiQuestId: string) => void;
  onUpdateAntiQuest?: (antiQuestId: string, updates: { title?: string; description?: string; severity?: Severity; tags?: string[] }) => void;
}

export function QuestsMainPanel({
  quests,
  archivedQuests = [],
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
  onDeleteQuest,
  onArchiveQuest,
  onUpdateQuest,
  // AntiQuest props
  antiQuests = [],
  selectedAntiQuestId,
  onLogOccurrence,
  createAntiQuestMode = false,
  onCreateAntiQuest,
  onCancelAntiQuestCreate,
  onDeleteAntiQuest,
  onUpdateAntiQuest,
}: QuestsMainPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [antiQuestEditMode, setAntiQuestEditMode] = useState(false);
  const [editingAntiQuest, setEditingAntiQuest] = useState<Quest | null>(null);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  // Search both active and archived quests
  const allQuests = [...quests, ...archivedQuests];
  const selectedQuest = selectedQuestId ? allQuests.find(q => q.questId === selectedQuestId) : null;

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

  if (editMode && editingQuest) {
    return (
      <Suspense fallback={<div>Loading form...</div>}>
        <QuestEditForm
          quest={editingQuest}
          onSaveQuest={(updates) => {
            onUpdateQuest?.(editingQuest.questId, updates);
            setEditMode(false);
            setEditingQuest(null);
          }}
          onCancel={() => {
            setEditMode(false);
            setEditingQuest(null);
          }}
        />
      </Suspense>
    );
  }

  // AntiQuest Creation Mode
  if (createAntiQuestMode && onCreateAntiQuest && onCancelAntiQuestCreate) {
    return (
      <Suspense fallback={<div>Loading form...</div>}>
        <AntiQuestCreationForm
          onCreateAntiQuest={onCreateAntiQuest}
          onCancel={onCancelAntiQuestCreate}
        />
      </Suspense>
    );
  }

  // AntiQuest Edit Mode
  if (antiQuestEditMode && editingAntiQuest && onUpdateAntiQuest) {
    return (
      <Suspense fallback={<div>Loading form...</div>}>
        <AntiQuestEditForm
          antiQuest={editingAntiQuest}
          onSave={(updates) => {
            onUpdateAntiQuest(editingAntiQuest.questId, updates);
            setAntiQuestEditMode(false);
            setEditingAntiQuest(null);
          }}
          onCancel={() => {
            setAntiQuestEditMode(false);
            setEditingAntiQuest(null);
          }}
        />
      </Suspense>
    );
  }

  // AntiQuest Details View
  if (selectedAntiQuestId && onLogOccurrence) {
    const selectedAntiQuest = antiQuests.find(aq => aq.questId === selectedAntiQuestId);
    if (selectedAntiQuest) {
      return (
        <AntiQuestDetails
          antiQuest={selectedAntiQuest}
          onLogOccurrence={onLogOccurrence}
          onDeleteAntiQuest={onDeleteAntiQuest}
          onEditAntiQuest={(antiQuest) => {
            setEditingAntiQuest(antiQuest);
            setAntiQuestEditMode(true);
          }}
        />
      );
    }
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
        onDeleteQuest={onDeleteQuest}
        onArchiveQuest={onArchiveQuest}
        onUpdateQuest={onUpdateQuest}
        onEditModeStart={(quest) => {
          setEditingQuest(quest);
          setEditMode(true);
        }}
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
