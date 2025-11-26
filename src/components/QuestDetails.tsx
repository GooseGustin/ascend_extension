import { React, useState, useEffect } from "react";
import {
  Play,
  ChevronDown,
  ChevronRight,
  Check,
  MessageSquare,
  History,
  Shield,
  Users,
  Calendar,
  Plus,
  GripVertical,
  Edit,
  Archive,
  Trash2,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import type { Quest, Subtask } from "../worker/models/Quest";
import type { GoalComment } from "../worker/models/GoalComment";
import { Task } from "../App";
import { QuestService } from "../worker";
import { AuthService, getTaskService } from "../worker";
import { useModal } from "../context/ModalContext";
import { QuestEditForm } from "./QuestEditForm";
import {
  saveTaskOrder,
  loadTaskOrder,
  saveQuestSubtaskOrder,
  loadQuestSubtaskOrder,
} from "../worker/utils/task-order-storage";
import { TaskOrder, TaskOrderItem } from "../worker/models/TaskOrder";

interface QuestDetailsProps {
  quest: Quest;
  tasks: Task[];
  comments: GoalComment[];
  onStartFocus: (task: Task | Subtask, questTitle: string) => void;
  onToggleSubtask: (questId: string, subtaskId: string) => void;
  onAddComment?: (questId: string, text: string) => void;
  onAddSubtask: (questId: string, title: string) => void;
  onDeleteQuest?: (questId: string) => void;
  onArchiveQuest?: (questId: string) => void;
  onUpdateQuest?: (questId: string, updates: Partial<Quest>) => void;
}

export function QuestDetails({
  quest,
  tasks,
  comments,
  onStartFocus,
  onToggleSubtask,
  onAddSubtask,
  onAddComment,
}: QuestDetailsProps) {
  const [expandedSections, setExpandedSections] = useState({
    milestones: true,
    subtasks: true,
    comments: true,
    history: false,
  });
  const [commentText, setCommentText] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(quest.subtasks);
  const [draggedSubtaskIndex, setDraggedSubtaskIndex] = useState<number | null>(
    null
  );
  const [dragOverSubtaskIndex, setDragOverSubtaskIndex] = useState<
    number | null
  >(null);

  // Sync local state when quest changes
  useEffect(() => {
    setLocalSubtasks(quest.subtasks);
  }, [quest.questId]);

  // Load saved order on mount
  // useEffect(() => {
  //   async function loadSubtaskOrder() {
  //     try {
  //       const authService = new AuthService();
  //       const userId = await authService.getCurrentUserId();

  //       // Load from localStorage first (primary source)
  //       const savedOrder = loadTaskOrder(userId, quest.questId);

  //       if (savedOrder && savedOrder.length > 0) {
  //         // Apply the saved order (you'll need to trigger parent re-render)
  //         // For now, this just logs - you'd need a callback to parent to update quest.subtasks
  //         console.log("[QuestDetails] Loaded subtask order:", savedOrder);
  //       }
  //     } catch (error) {
  //       console.error("Failed to load subtask order:", error);
  //     }
  //   }

  //   loadSubtaskOrder();
  // }, [quest.questId]);

  useEffect(() => {
    async function loadSubtaskOrder() {
      try {
        const authService = new AuthService();
        const userId = await authService.getCurrentUserId();

        const savedOrder = loadQuestSubtaskOrder(userId, quest.questId);

        if (savedOrder && savedOrder.length > 0) {
          // Apply saved order to local state
          const orderMap = new Map(
            savedOrder.map((item, idx) => [item.taskId, idx])
          );

          const reordered = [...quest.subtasks].sort((a, b) => {
            const idxA = orderMap.get(a.id) ?? 999999;
            const idxB = orderMap.get(b.id) ?? 999999;
            return idxA - idxB;
          });

          setLocalSubtasks(reordered);
        }
      } catch (error) {
        console.error("Failed to load subtask order:", error);
      }
    }

    loadSubtaskOrder();
  }, [quest.questId, quest.subtasks]); // quest.subtasks.length

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      // Import at top of file
      // const questService = new QuestService();

      // await questService.addSubtask(quest.questId, {
      //   title: newSubtaskTitle.trim(),
      //   estimatePomodoros: 1,
      // });

      // Call parent handler
      onAddSubtask(quest.questId, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  const handleSubtaskDragStart = (index: number) => {
    console.log("[QuestDetails] Started dragging a subtask");
    setDraggedSubtaskIndex(index);
  };

  const handleSubtaskDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverSubtaskIndex(index);
  };

  const handleSubtaskDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedSubtaskIndex === null || draggedSubtaskIndex === dropIndex) {
      setDraggedSubtaskIndex(null);
      setDragOverSubtaskIndex(null);
      return;
    }

    // Optimistic update - reorder locally first
    const reordered = Array.from(localSubtasks);
    console.log("Reordered array is of type:", typeof reordered, reordered);

    const [removed] = reordered.splice(draggedSubtaskIndex, 1);
    reordered.splice(dropIndex, 0, removed);

    setLocalSubtasks(reordered);
    setDraggedSubtaskIndex(null);
    setDragOverSubtaskIndex(null);

    // Persist to storage
    try {
      const authService = new AuthService();
      const userId = await authService.getCurrentUserId();

      const orderItems = reordered.map((st) => ({
        taskId: st.id,
        questId: quest.questId,
      }));

      // Save to localStorage
      saveQuestSubtaskOrder(userId, quest.questId, orderItems);
    } catch (error) {
      console.error("Failed to save subtask order:", error);
      // Revert on error
      setLocalSubtasks(quest.subtasks);
    }
  };

  const handleSubtaskDragEnd = () => {
    setDraggedSubtaskIndex(null);
    setDragOverSubtaskIndex(null);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getTypeIcon = () => {
    if (quest.isDungeon) return <Users className="w-4 h-4" />;
    if (quest.members && quest.members.length > 1)
      return <Users className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const getTypeColor = () => {
    if (quest.isDungeon) return "#ED4245";
    if (quest.members && quest.members.length > 1) return "#FEE75C";
    return "#5865F2";
  };

  const getTypeLabel = () => {
    if (quest.isDungeon) return "dungeon";
    if (quest.members && quest.members.length > 1) return "guild";
    return "personal";
  };

  const handlePostComment = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(quest.questId, commentText);
      setCommentText("");
    }
  };

  const showDeleteConfirmation = () => {
    showModal(
      <div className="bg-[#36393f] rounded-lg shadow-lg max-w-md p-6 border border-[#202225]">
        <h2 className="text-xl text-white font-semibold mb-2">Delete Quest?</h2>
        <p className="text-sm text-[#b9bbbe] mb-6">
          This action is permanent and cannot be undone. The quest "{quest.title}" will be permanently deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => hideModal()}
            className="px-4 py-2 rounded text-sm text-[#dbdee1] bg-[#2f3136] hover:bg-[#4f545c] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                hideModal();
                onDeleteQuest?.(quest.questId);
              } catch (error) {
                console.error("Failed to delete quest:", error);
              }
            }}
            className="px-4 py-2 rounded text-sm text-white bg-[#ED4245] hover:bg-[#da373f] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  const showEditForm = () => {
    showModal(
      <QuestEditForm
        quest={quest}
        onSaveQuest={async (updates) => {
          try {
            hideModal();
            onEditQuest?.(updates as any);
          } catch (error) {
            console.error("Failed to save quest:", error);
          }
        }}
        onCancel={() => hideModal()}
      />
    );
  };

  const progress = Math.round(
    (quest.gamification.currentExp / quest.gamification.expToNextLevel) * 100
  );
  const color = getColorForDifficulty(quest.difficulty.userAssigned);

  // Convert progressHistory to milestones format
  const milestones = quest.progressHistory
    .filter((h) => h.isMilestone)
    .map((h) => ({
      id: h.date,
      title: `Milestone on ${new Date(h.date).toLocaleDateString()}`,
      completed: true,
      xp: h.expEarned,
    }));

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col">
      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl">{getIconForQuest(quest)}</span>
          <span className="text-white truncate">{quest.title}</span>
          <div
            className="px-2 py-1 rounded text-xs uppercase tracking-wide flex items-center gap-1 flex-shrink-0"
            style={{
              backgroundColor: `${getTypeColor()}20`,
              color: getTypeColor(),
            }}
          >
            {getTypeIcon()}
            {getTypeLabel()}
          </div>
          {quest.members && quest.members.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#b9bbbe] flex-shrink-0">
              <Users className="w-3 h-3" />
              {quest.members.length} warriors
            </div>
          )}
          {quest.dueDate && (
            <div className="flex items-center gap-1 text-xs text-[#b9bbbe] flex-shrink-0">
              <Calendar className="w-3 h-3" />
              {new Date(quest.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => showEditForm()}
            className="p-1.5 text-[#72767d] hover:text-[#5865F2] transition-colors rounded hover:bg-[#4f545c]"
            title="Edit quest"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onArchiveQuest?.(quest.questId)}
            className="p-1.5 text-[#72767d] hover:text-[#FEE75C] transition-colors rounded hover:bg-[#4f545c]"
            title="Archive quest"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            onClick={() => showDeleteConfirmation()}
            className="p-1.5 text-[#72767d] hover:text-[#ED4245] transition-colors rounded hover:bg-[#4f545c]"
            title="Delete quest"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Level & XP Section */}
          <div className="bg-[#2f3136] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">Quest Level</div>
                <div className="text-2xl text-white">
                  {quest.gamification.currentLevel}
                </div>
              </div>
              <div className="flex-1 max-w-md mx-8">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[#b9bbbe]">XP Progress</span>
                  <span className="text-xs text-[#b9bbbe]">
                    {quest.gamification.currentExp} /{" "}
                    {quest.gamification.expToNextLevel}
                  </span>
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
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-2">
              Description
            </h3>
            <p className="text-sm text-[#dcddde]">{quest.description}</p>
          </div>

          {/* Difficulty & Schedule Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-[#2f3136] rounded-lg p-3">
              <div className="text-xs text-[#b9bbbe] mb-1">Difficulty</div>
              <div className="text-sm text-white font-medium">
                {quest.difficulty.gmValidated || quest.difficulty.userAssigned}
                {quest.difficulty.isLocked && " ✓"}
              </div>
              <div className="text-xs text-[#00b0f4] mt-1">
                {quest.difficulty.xpPerPomodoro} XP/pomodoro
              </div>
            </div>
            <div className="bg-[#2f3136] rounded-lg p-3">
              <div className="text-xs text-[#b9bbbe] mb-1">Frequency</div>
              <div className="text-sm text-white font-medium">
                {quest.schedule.frequency}
              </div>
              <div className="text-xs text-[#72767d] mt-1">
                Target: {quest.schedule.targetCompletionsPerCycle} / cycle
              </div>
            </div>
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection("milestones")}
                className="flex items-center gap-2 mb-2 hover:text-white transition-colors"
              >
                {expandedSections.milestones ? (
                  <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
                )}
                <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">
                  Milestones ({milestones.length})
                </h3>
              </button>

              {expandedSections.milestones && (
                <div className="space-y-2">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="bg-[#2f3136] rounded px-3 py-3 flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#57F287]">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-[#dcddde]">
                          {milestone.title}
                        </span>
                      </div>
                      <span className="text-xs text-[#faa61a]">
                        +{milestone.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtasks */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection("subtasks")}
              className="flex items-center gap-2 mb-2 hover:text-white transition-colors"
            >
              {expandedSections.subtasks ? (
                <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
              )}
              <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">
                Subtasks ({quest.subtasks.filter((s) => s.isComplete).length}/
                {quest.subtasks.length})
              </h3>
            </button>

            {expandedSections.subtasks && (
              <div className="space-y-2">
                {/* Add Subtask Input */}
                <div className="bg-[#2f3136] rounded px-3 py-2 flex items-center gap-2 border-2 border-transparent hover:border-[#5865F2] transition-colors">
                  <Plus className="w-4 h-4 text-[#72767d]" />
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-[#72767d] outline-none border-0"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="text-[#5865F2] hover:text-[#4752C4] disabled:opacity-0 transition-all text-sm px-2 py-1"
                  >
                    Add
                  </button>
                </div>

                {localSubtasks.map((subtask, index) => (
                  <div
                    key={subtask.id}
                    draggable
                    onDragStart={() => handleSubtaskDragStart(index)}
                    onDragOver={(e) => handleSubtaskDragOver(e, index)}
                    onDrop={(e) => handleSubtaskDrop(e, index)}
                    onDragEnd={handleSubtaskDragEnd}
                    // add a border class and set its color from quest.color
                    className={`border group bg-[#2f3136] rounded px-3 py-3 flex items-center gap-3
                      hover:bg-[#34373c] transition-colors cursor-move
                      ${draggedSubtaskIndex === index ? "opacity-50" : ""}
                      ${
                        dragOverSubtaskIndex === index &&
                        draggedSubtaskIndex !== index
                          ? "border-t-2"
                          : ""
                      }
                      ${subtask.isComplete ? "opacity-60" : ""}
                    `}
                    style={{ borderColor: quest.color }}
                  >
                    {/* Drag Handle */}
                    <GripVertical className="w-4 h-4 text-[#4f545c] group-hover:text-[#72767d] shrink-0" />

                    <Checkbox
                      checked={subtask.isComplete}
                      onCheckedChange={() => {
                        onToggleSubtask(quest.questId, subtask.id);

                        setLocalSubtasks((prev) =>
                          prev.map((st) =>
                            st.id === subtask.id
                              ? { ...st, isComplete: !st.isComplete }
                              : st
                          )
                        );
                      }}
                      className="border-[#4f545c] data-[state=checked]:bg-[#57F287] data-[state=checked]:border-[#57F287]"
                    />
                    <div className="flex-1">
                      <span
                        className={`text-sm ${
                          subtask.isComplete
                            ? "line-through text-[#72767d]"
                            : "text-[#dcddde]"
                        }`}
                      >
                        {subtask.title}
                      </span>
                      {subtask.revisionCount > 0 && (
                        <span className="text-xs text-[#72767d] ml-2">
                          (rev: {subtask.revisionCount})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#00b0f4]">
                      ~{subtask.estimatePomodoros}🍅
                    </span>
                    {!subtask.isComplete && (
                      <button
                        onClick={() => onStartFocus(subtask, quest.title)}
                        className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752C4] flex items-center justify-center group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Play
                          className="w-4 h-4 text-white ml-0.5"
                          fill="white"
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection("comments")}
              className="flex items-center gap-2 mb-2 hover:text-white transition-colors"
            >
              {expandedSections.comments ? (
                <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
              )}
              <MessageSquare className="w-4 h-4 text-[#b9bbbe]" />
              <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">
                Comments ({comments.length})
              </h3>
            </button>

            {expandedSections.comments && (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.commentId}
                    className="bg-[#2f3136] rounded p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center">
                        <span>👤</span>
                      </div>
                      <div>
                        <div className="text-sm text-white">
                          {comment.username}
                        </div>
                        <div className="text-xs text-[#72767d]">
                          {new Date(comment.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`
                        ml-auto text-xs px-2 py-1 rounded
                        ${
                          comment.type === "encouragement"
                            ? "bg-[#57F287]20 text-[#57F287]"
                            : ""
                        }
                        ${
                          comment.type === "question"
                            ? "bg-[#00b0f4]20 text-[#00b0f4]"
                            : ""
                        }
                        ${
                          comment.type === "suggestion"
                            ? "bg-[#faa61a]20 text-[#faa61a]"
                            : ""
                        }
                      `}
                      >
                        {comment.type}
                      </span>
                    </div>
                    <p className="text-sm text-[#dcddde]">{comment.text}</p>
                  </div>
                ))}
                {onAddComment && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="bg-[#202225] border-[#202225] min-h-[80px] placeholder:text-[#72767d] focus-visible:ring-1 focus-visible:ring-[#00b0f4]"
                    />
                    <Button
                      onClick={handlePostComment}
                      disabled={!commentText.trim()}
                      className="bg-[#5865F2] hover:bg-[#4752C4]"
                    >
                      Post Comment
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History / Log */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection("history")}
              className="flex items-center gap-2 mb-2 hover:text-white transition-colors"
            >
              {expandedSections.history ? (
                <ChevronDown className="w-4 h-4 text-[#b9bbbe]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#b9bbbe]" />
              )}
              <History className="w-4 h-4 text-[#b9bbbe]" />
              <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">
                Activity History
              </h3>
            </button>

            {expandedSections.history && (
              <div className="space-y-2">
                {quest.progressHistory
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={index}
                      className="pl-3 border-l-2 border-[#202225] hover:border-[#5865F2] transition-colors py-1"
                    >
                      <p className="text-sm text-[#dcddde]">
                        {item.sessionsCompleted} sessions completed •{" "}
                        {item.expEarned} XP earned
                      </p>
                      <span className="text-xs text-[#72767d]">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                {quest.progressHistory.length === 0 && (
                  <div className="text-sm text-[#72767d] text-center py-4">
                    No activity yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          const firstIncompleteSubtask = quest.subtasks.find(
            (s) => !s.isComplete
          );
          if (firstIncompleteSubtask)
            onStartFocus(firstIncompleteSubtask, quest.title);
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#57F287] hover:bg-[#3ba55d] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
      >
        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
      </button>
    </div>
  );
}

function getIconForQuest(quest: Quest) {
  if (quest.isDungeon) return <Users className="w-6 h-6 text-[#ED4245]" />;
  if (quest.members && quest.members.length > 1)
    return <Users className="w-6 h-6 text-[#FEE75C]" />;
  return <Shield className="w-6 h-6 text-[#5865F2]" />;
}
function getColorForDifficulty(difficulty: string): string {
  const colors: Record<string, string> = {
    Trivial: "#72767d",
    Easy: "#57F287",
    Medium: "#faa61a",
    Hard: "#ED4245",
    Extreme: "#8B0000",
  };
  return colors[difficulty] || "#72767d";
}
