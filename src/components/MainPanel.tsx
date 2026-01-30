import { useEffect, useState } from "react";
import { Filter, Plus, Play, RefreshCw } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TaskList } from "./TaskList";
import { ProgressHeatmap } from "./ProgressHeatmap";
import { QuestSelectDropdown } from "./QuestSelectDropdown";
import {
  AnalyticsService,
  AuthService,
  getTaskService,
  QuestUIAdapter,
  TaskService,
} from "../worker";
import type { Task } from "../App";
import type { TodayMetrics } from "../worker/services/analytics.service";
import type { UserProfile } from "../worker/models/UserProfile";
import { Quest, Subtask } from "../worker/models/Quest";
import { FloatingPlusButton } from "./FloatingPlusButton";
import { totalExpForLevel, xpToNextLevel, currentLevelFromExp, xpDeltaForLevel } from "../worker/utils/level-and-xp-converters";

interface MainPanelProps {
  userId: string;
  tasks: Task[];
  workerQuests: Quest[];
  dataVersion?: number;
  onToggleTask: (taskId: string) => void;
  onReorderTasks: (startIndex: number, endIndex: number) => void;
  onStartFocus: (task: Task | Subtask, questTitle?: string) => void;
  onFloatingPlusClick: () => void;
  onQuestSelect?: (questId: string) => void;
  onAddSubtask?: (questId: string, title: string) => void | Promise<void>;
  onRefresh?: () => void;
}

export function MainPanel({
  userId,
  tasks,
  workerQuests,
  dataVersion,
  onToggleTask,
  onReorderTasks,
  onStartFocus,
  onFloatingPlusClick,
  onQuestSelect,
  onAddSubtask,
  onRefresh,
}: MainPanelProps) {
  const [filter, setFilter] = useState<"all" | "scheduled" | "pomodoro">("all");
  const [stats, setStats] = useState<TodayMetrics | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const analyticsService = new AnalyticsService();
  const authService = new AuthService();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Filter tasks to only show those from quests scheduled for today
  const isQuestScheduledForToday = (quest: Quest): boolean => {
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const frequency = quest.schedule?.frequency?.toLowerCase();

    if (frequency === 'daily') {
      return true;
    }

    if (frequency === 'custom' && quest.schedule?.customDays) {
      return quest.schedule.customDays.includes(today);
    }

    // Default to showing if no schedule defined
    return true;
  };

  const scheduledQuestIds = new Set(
    workerQuests.filter(isQuestScheduledForToday).map(q => q.questId)
  );

  const todaysTasks = tasks.filter(task => scheduledQuestIds.has(task.questId));


  useEffect(() => {
    loadStats();
  }, [userId, dataVersion]);

  const loadStats = async () => {
    console.log('[MainPanel] loadStats triggered - dataVersion:', dataVersion);
    try {
      const [metrics, profile] = await Promise.all([
        analyticsService.getTodayMetrics(userId),
        authService.getCurrentUser(),
      ]);

      console.log('[MainPanel] Stats loaded:', {
        todaySessions: metrics.sessionsCompleted,
        userXP: profile?.experiencePoints,
        userLevel: profile?.totalLevel
      });

      setStats(metrics);
      setUserProfile(profile || null);

      // Get total sessions count
      const { getDB } = await import("../worker");
      const db = getDB();
      const allSessions = await db.sessions
        .where("userId")
        .equals(userId)
        .and(s => s.status === "completed")
        .toArray();
      setTotalSessions(allSessions.length);

      console.log('[MainPanel] ✅ Stats loaded - Total Sessions:', allSessions.length);
    } catch (error) {
      console.error("[MainPanel] ❌ Failed to load stats:", error);
    }
  };

  const handleAddSubtaskSubmit = async () => {
    if (!newSubtaskTitle.trim() || !selectedQuestId) return;
    try {
      await onAddSubtask?.(selectedQuestId, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  // useEffect(() => {
  //   async function loadTaskOrder() {
  //     try {
  //       // const { TaskService } = await import("../worker/services/task.service");

  //       const taskService = getTaskService();

  //       const orderedTasks = await taskService.applySavedOrder(tasks);
  //       if (JSON.stringify(orderedTasks) !== JSON.stringify(tasks)) {
  //         onReorderTasks(0, 0); // Trigger parent to update with ordered tasks
  //       }
  //     } catch (error) {
  //       console.error("Failed to load task order:", error);
  //     }
  //   }

  //   loadTaskOrder();
  // }, []); // Only on mount

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col">
      {/* Title Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-[#202225] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white">Today</span>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-7 w-7 p-0 hover:bg-[#4f545c]"
              title="Refresh tasks"
            >
              <RefreshCw className="w-4 h-4 text-[#b9bbbe]" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className={`h-7 text-xs ${
              filter === "all"
                ? "bg-[#5865F2] hover:bg-[#4752C4]"
                : "hover:bg-[#4f545c]"
            }`}
          >
            All Tasks
          </Button>
          <Button
            variant={filter === "scheduled" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("scheduled")}
            className={`h-7 text-xs ${
              filter === "scheduled"
                ? "bg-[#5865F2] hover:bg-[#4752C4]"
                : "hover:bg-[#4f545c]"
            }`}
          >
            Scheduled
          </Button>
          <Button
            variant={filter === "pomodoro" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("pomodoro")}
            className={`h-7 text-xs ${
              filter === "pomodoro"
                ? "bg-[#5865F2] hover:bg-[#4752C4]"
                : "hover:bg-[#4f545c]"
            }`}
          >
            <Filter className="w-3 h-3 mr-1" />
            Pomodoro-Ready
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Top Summary Section */}
          <div className="bg-[#2f3136] rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">Level</div>
                <div className="text-2xl text-white">
                  {userProfile ? currentLevelFromExp(userProfile.experiencePoints) : 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">XP</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl text-[#57F287]">
                    {userProfile ?
                      Math.round(userProfile.experiencePoints - totalExpForLevel(currentLevelFromExp(userProfile.experiencePoints)))
                      : 0}
                  </span>
                  <span className="text-sm text-[#72767d]">
                    / {userProfile ? Math.round(xpDeltaForLevel(currentLevelFromExp(userProfile.experiencePoints))) : 0}
                  </span>
                </div>
                <div className="w-32 h-1 bg-[#202225] rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-[#57F287] rounded-full transition-all"
                    style={{
                      width: `${
                        userProfile
                          ? ((userProfile.experiencePoints - totalExpForLevel(currentLevelFromExp(userProfile.experiencePoints))) /
                             xpDeltaForLevel(currentLevelFromExp(userProfile.experiencePoints))) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">
                  Today's Sessions
                </div>
                <div className="text-2xl text-white">
                  {stats?.sessionsCompleted || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">
                  Total Sessions
                </div>
                <div className="text-2xl text-white">
                  {totalSessions}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#b9bbbe] mb-1">Active Quests</div>
                <div className="text-2xl text-[#5865F2]">
                  {workerQuests.filter(q => !q.isCompleted && !q.hidden).length}
                </div>
              </div>
            </div>
          </div>

          {/* Add Subtask Bar */}
          <div className="mb-6">
            <div className="flex flex-col gap-3">
              <div className="bg-[#2f3136] rounded px-3 py-2 flex items-center gap-2 border-2 border-transparent hover:border-[#5865F2] transition-colors">
                <Plus className="w-4 h-4 text-[#72767d]" />
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtaskSubmit();
                    }
                  }}
                  placeholder="Add a quick subtask to any quest..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-[#72767d] outline-none border-0"
                />
                <button
                  onClick={handleAddSubtaskSubmit}
                  disabled={!newSubtaskTitle.trim() || !selectedQuestId}
                  className="text-[#5865F2] hover:text-[#4752C4] disabled:opacity-0 transition-all text-sm px-2 py-1"
                >
                  Add
                </button>
              </div>

              <QuestSelectDropdown
                quests={workerQuests
                  .filter((q) => q.type !== 'AntiQuest') // Exclude AntiQuests
                  .map((q) => ({
                    questId: q.questId,
                    title: q.title,
                    color: q.color,
                  }))}
                selectedQuestId={selectedQuestId || null}
                onSelect={(questId) => {
                  setSelectedQuestId(questId);
                  onQuestSelect?.(questId);
                }}
                placeholder="Select a quest..."
              />
              
            </div>
          </div>

          {/* Today's Task List */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">
              Today's Tasks
            </h3>
            <TaskList
              tasks={todaysTasks}
              onToggleTask={onToggleTask}
              onReorderTasks={onReorderTasks}
              onStartFocus={onStartFocus}
            />
          </div>

          {/* Progress Heatmap */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">
              Monthly Progress
            </h3>
            <ProgressHeatmap userId={userId} />
          </div>
        </div>
      </div>

      
      {/* Floating Plus Button - Only on Home and Quests */}
        <FloatingPlusButton onClick={onFloatingPlusClick} />

      {/* Floating Action Button */}
      <button
        onClick={() => {
          console.log('[MainPanel], clicked on floating action button')
          const firstIncompleteTask = todaysTasks.find((t) => !t.completed);
          if (firstIncompleteTask)
            onStartFocus(firstIncompleteTask, firstIncompleteTask.questTag);
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#57F287] hover:bg-[#3ba55d] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 group"
      >
        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
      </button>
    </div>
  );
}
