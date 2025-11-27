import { useState, useEffect } from "react";
import { NavigationSidebar } from "./components/NavigationSidebar";
import { MiddlePanel } from "./components/MiddlePanel";
import { MainPanel } from "./components/MainPanel";
import { QuestsMiddlePanel } from "./components/QuestsMiddlePanel";
import { QuestsMainPanel } from "./components/QuestsMainPanel";
import { FocusSessionModal } from "./components/FocusSessionModal";
import { ProgressMainPanel } from "./components/ProgressMainPanel";
import { ProgressMiddlePanel } from "./components/ProgressMiddlePanel";
import { SettingsMiddlePanel } from "./components/SettingsMiddlePanel";
import { SettingsMainPanel } from "./components/SettingsMainPanel";
// import { FloatingPlusButton } from "./components/FloatingPlusButton";
import {
  AuthService,
  QuestService,
  NotificationService,
  SessionService,
  getTaskService,
  QuestUIAdapter,
} from "./worker";
import type {
  Quest,
  Subtask,
  Quest as WorkerQuest,
} from "./worker/models/Quest";
import type { GoalComment } from "./worker/models/GoalComment";
import type { Notification as WorkerNotification } from "./worker/models/Notification";
// import { TaskOrderItem } from "./worker/models/TaskOrder";
import { useModal } from "./context/ModalContext";
import {
  loadHomeTaskOrder,
  loadTaskOrder,
  saveHomeTaskOrder,
  saveTaskOrder,
} from "./worker/utils/task-order-storage";
import questToTasks from "./worker/utils/quest-to-tasks";
import { migrateTaskOrderStorage } from "./worker/utils/migrate-task-orders";

// Keep existing UI interfaces for Figma compatibility
export interface Task {
  id: string;
  title: string;
  questId: string;
  questTag: string;
  levelReq: number;
  completed: boolean;
  questColor: string;
}

export interface FocusSession {
  questTitle: string;
  subtaskName: string;
  duration: number;
}

const taskService = getTaskService();

export default function App() {
  const [activeNav, setActiveNav] = useState("home");
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [createQuestMode, setCreateQuestMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [progressView, setProgressView] = useState("overview");
  const [selectedSettingsSection, setSelectedSettingsSection] = useState("account");

  // Worker data
  const [workerQuests, setWorkerQuests] = useState<WorkerQuest[]>([]);
  const [watchedQuests, setWatchedQuests] = useState<WorkerQuest[]>([]);
  const [publicQuests, setPublicQuests] = useState<WorkerQuest[]>([]);
  const [questComments, setQuestComments] = useState<
    Record<string, GoalComment[]>
  >({});

  // UI data (converted from worker data)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);

  // Services
  const authService = new AuthService();
  const questService = new QuestService();
  const notificationService = new NotificationService();
  const sessionService = new SessionService();

  const { showModal, hideModal } = useModal();

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Load quest-specific data when quest is selected
  useEffect(() => {
    if (selectedQuestId) {
      loadQuestComments(selectedQuestId);
    }
  }, [selectedQuestId]);

  const initializeApp = async () => {
    try {
      const id = await authService.getCurrentUserId();
      setUserId(id);

      // // Run migration once
      // if (!localStorage.getItem('ascend:migration:v2')) {
      //   migrateTaskOrderStorage(id);
      //   localStorage.setItem('ascend:migration:v2', 'true');
      // }

      await loadAllData(id);
      setIsLoading(false);
      console.log("in initializeapp, loaded all data");
    } catch (error) {
      console.error("Failed to initialize:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllData = async (uid: string) => {
    await Promise.all([
      loadTasks(uid),
      loadQuests(uid),
      loadNotifications(uid),
    ]);
  };

  const loadTasks = async (userId: string) => {
    if (!userId) return;

    const todaysQuests = await taskService.getTodaysTasks(userId);
    let allTasks = questToTasks(todaysQuests);

    const savedOrder = loadHomeTaskOrder(userId);

    if (savedOrder) {
      const map = new Map(
        savedOrder.map((item, index) => [
          `${item.taskId}_${item.questId}`,
          index,
        ])
      );

      allTasks.sort((a, b) => {
        const A = map.get(`${a.id}_${a.questId}`) ?? 999999;
        const B = map.get(`${b.id}_${b.questId}`) ?? 999999;
        return A - B;
      });
    }

    setTasks(allTasks);
  };

  const loadQuests = async (uid: string) => {
    const [myQuests, watched, discovered] = await Promise.all([
      questService.getUserQuests(uid),
      questService.getWatchedQuests(uid),
      questService.getPublicQuests(20),
    ]);

    setWorkerQuests(myQuests);
    setWatchedQuests(watched);
    setPublicQuests(discovered);

    // Convert to UI format
    const uiQuests = convertQuestsToUI(myQuests, watched);
    setQuests(uiQuests);
  };

  const loadNotifications = async (uid: string) => {
    const notifs = await notificationService.getUserNotifications(uid);
    setNotifications(notifs); // Store worker notifications directly
  };

  const loadQuestComments = async (questId: string) => {
    console.log("in load quest comments");
    try {
      const comments = await questService.getQuestComments(questId);
      setQuestComments((prev) => ({
        ...prev,
        [questId]: comments,
      }));
      console.log("done loading quest comments");
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const handleAddComment = async (questId: string, text: string) => {
    if (!userId) return;

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      await questService.addComment(
        questId,
        userId,
        user.username,
        text,
        "encouragement"
      );

      // Reload comments
      await loadQuestComments(questId);
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const convertQuestsToUI = (
    myQuests: WorkerQuest[],
    watched: WorkerQuest[]
  ): any[] => {
    const watchedIds = new Set(watched.map((q) => q.questId));

    return myQuests.map((wq) => ({
      id: wq.questId,
      title: wq.title,
      icon: "⚔️", // Default icon, could be enhanced
      type: wq.isDungeon
        ? "dungeon"
        : wq.members.length > 1
        ? "guild"
        : "personal",
      level: wq.gamification.currentLevel,
      currentXP: wq.gamification.currentExp,
      totalXP: wq.gamification.expToNextLevel,
      description: wq.description,
      color: getColorForDifficulty(wq.difficulty.userAssigned),
      progress: Math.round(
        (wq.gamification.currentExp / wq.gamification.expToNextLevel) * 100
      ),
      milestones: [], // TODO: Map from progressHistory
      subtasks: wq.subtasks.map((st) => ({
        id: st.id,
        title: st.title,
        completed: st.isComplete,
        xp: 50, // Default, could be calculated
      })),
      comments:
        questComments[wq.questId]?.map((c) => ({
          id: c.commentId,
          user: c.username,
          avatar: "👤",
          text: c.text,
          timestamp: new Date(c.timestamp).toLocaleTimeString(),
        })) || [],
      watching: watchedIds.has(wq.questId),
      unreadComments: 0, // TODO: Calculate
      warriors: wq.members.length || undefined,
      deadline: wq.dueDate || undefined,
    }));
  };

  const getColorForDifficulty = (difficulty: string): string => {
    const colors: Record<string, string> = {
      Trivial: "#72767d",
      Easy: "#57F287",
      Medium: "#5865F2",
      Hard: "#FEE75C",
      Epic: "#EB459E",
    };
    return colors[difficulty] || "#5865F2";
  };

  // const startFocusSession = async (
  //   task: Task | Subtask,
  //   questTitle?: string
  // ) => {
  //   console.log("[StartFocusSession] Starting a focus session");

  //   if (!userId) return;

  //   try {
  //     let workerQuest: WorkerQuest | undefined;
  //     let subtaskId: string;

  //     if ("questTag" in task) {
  //       // It's a Task from home view
  //       const found = await QuestUIAdapter.findQuestAndSubtask(
  //         task.id,
  //         workerQuests
  //       );
  //       if (!found) return;
  //       workerQuest = found.quest;
  //       subtaskId = found.subtask.id;
  //     } else {
  //       // It's a Subtask from quest detail view
  //       workerQuest = workerQuests.find((q) =>
  //         q.subtasks.some((st) => st.id === task.id)
  //       );
  //       if (!workerQuest) return;
  //       subtaskId = task.id;
  //     }

  //     const session = await sessionService.createSession(
  //       userId,
  //       workerQuest.questId,
  //       subtaskId,
  //       25
  //     );

  //     setActiveSessionId(session.sessionId);
  //     setFocusSession({
  //       questTitle: questTitle || workerQuest.title,
  //       subtaskName: task.title,
  //       duration: 25 * 60,
  //     });
  //   } catch (error) {
  //     console.error("Failed to start session:", error);
  //   }
  // };

  const endFocusSession = async () => {
    if (activeSessionId && userId) {
      try {
        // Complete the session in worker
        await sessionService.completeSession(
          activeSessionId,
          25, // actual duration
          undefined // no notes
        );

        // Reload tasks to reflect XP changes
        await loadTasks(userId);
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    }

    setFocusSession(null);
    setActiveSessionId(null);
  };

  const toggleTaskComplete = async (taskId: string) => {
    if (!userId) return;

    // Optimistic UI update
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );

    try {
      const found = await QuestUIAdapter.findQuestAndSubtask(
        taskId,
        workerQuests
      );
      if (!found) return;

      await taskService.toggleSubtaskCompletion(
        userId,
        found.quest.questId,
        found.subtask.id
      );

      await loadAllData(userId);
    } catch (error) {
      console.error("Failed to toggle task:", error);
      await loadTasks(userId); // Revert on error
    }
  };

  const toggleSubtaskComplete = async (questId: string, subtaskId: string) => {
    if (!userId) return;

    // Optimistic UI update
    setQuests(
      quests.map((quest) => {
        if (quest.id === questId) {
          return {
            ...quest,
            subtasks: quest.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, isComplete: !st.isComplete } : st
            ),
          };
        }
        console.log("subtask toggled!");
        return quest;
      })
    );

    try {
      // 1. Update DB
      const updatedQuest = await taskService.toggleSubtaskCompletion(
        userId,
        questId,
        subtaskId
      );

      // 2. Update global task list
      setTasks((prev) =>
        prev.map((t) =>
          t.id === subtaskId ? { ...t, isComplete: !t.isComplete } : t
        )
      );

      // 3. Update workerQuests (so QuestDetails updates instantly)
      setWorkerQuests((prev) =>
        prev.map((q) => (q.questId === updatedQuest.questId ? updatedQuest : q))
      );

      await loadQuests(userId);
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
      await loadQuests(userId); // Revert
    }
  };

  const reorderTasks = (startIndex: number, endIndex: number) => {
    const arr = [...tasks];
    const [removed] = arr.splice(startIndex, 1);
    arr.splice(endIndex, 0, removed);

    setTasks(arr);

    // persist
    if (userId) {
      saveHomeTaskOrder(
        userId,
        arr.map((t) => ({ taskId: t.id, questId: t.questId }))
      );
    }
  };

  const handleQuestSelect = (questId: string) => {
    setSelectedQuestId(questId);
    setDiscoveryMode(false);
  };

  const handleDiscoverySelect = () => {
    setDiscoveryMode(true);
    setSelectedQuestId(null);
  };

  const handleNotificationClick = async (questId: string) => {
    setSelectedQuestId(questId);
    setDiscoveryMode(false);
    setActiveNav("quests");

    // Mark notification as read
    const notification = notifications.find((n) => n.questId === questId);
    if (notification) {
      await notificationService.markAsRead(notification.id);
      await loadNotifications(userId!);
    }
  };

  const handleJoinQuest = async (questId: string) => {
    if (!userId) return;

    try {
      await questService.joinQuest(userId, questId);
      await loadQuests(userId);
      alert("Successfully joined quest!");
    } catch (error) {
      console.error("Failed to join quest:", error);
      alert("Failed to join quest");
    }
  };

  const handleWatchQuest = async (questId: string) => {
    if (!userId) return;

    try {
      await questService.toggleWatch(userId, questId);
      await loadQuests(userId);
    } catch (error) {
      console.error("Failed to toggle watch:", error);
    }
  };

  const handleCreateQuestSelect = () => {
    setCreateQuestMode(true);
    setDiscoveryMode(false);
    setSelectedQuestId(null);
  };

  const handleFloatingPlusClick = () => {
    setActiveNav("quests");
    handleCreateQuestSelect();
  };

  const handleCreateQuest = async () =>
    // newQuestData: Omit<any, "id" | "currentXP" | "progress">
    {
      if (!userId) return;

      try {
        // Quest is already created by QuestCreationForm via questService
        // Just reload quests to show the new one
        await loadQuests(userId);

        setCreateQuestMode(false);

        // Optionally select the newly created quest
        // We'd need to return the questId from createQuest to do this
      } catch (error) {
        console.error("Failed to create quest:", error);
      }
    };

  const handleCancelCreate = () => {
    setCreateQuestMode(false);
  };

  const handleAddSubtask = async (questId: string, title: string) => {
    if (!userId) return;

    try {
      await questService.addSubtask(questId, {
        title: title.trim(),
        estimatePomodoros: 1,
      });

      // Reload quests to show new subtask
      await loadQuests(userId);
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!userId) return;

    try {
      await questService.deleteQuest(questId);

      // Remove from state
      setWorkerQuests((prev) => prev.filter((q) => q.questId !== questId));

      // Clear selection if deleted quest was selected
      if (selectedQuestId === questId) {
        setSelectedQuestId(null);
      }
    } catch (error) {
      console.error("Failed to delete quest:", error);
    }
  };

  const handleArchiveQuest = async (questId: string) => {
    if (!userId) return;

    try {
      await questService.archiveQuest(questId);

      // Update state
      setWorkerQuests((prev) =>
        prev.map((q) =>
          q.questId === questId ? { ...q, hidden: true } : q
        )
      );

      // Clear selection if archived quest was selected
      if (selectedQuestId === questId) {
        setSelectedQuestId(null);
      }
    } catch (error) {
      console.error("Failed to archive quest:", error);
    }
  };

  const handleUpdateQuest = async (questId: string, updates: Partial<Quest>) => {
    if (!userId) return;

    try {
      await questService.updateQuest(questId, updates);

      // Update state
      setWorkerQuests((prev) =>
        prev.map((q) =>
          q.questId === questId ? { ...q, ...updates } : q
        )
      );
    } catch (error) {
      console.error("Failed to update quest:", error);
    }
  };

  const startFocusWithModal = async (
    task: Task | Subtask,
    questTitle?: string
  ) => {
    if (!userId) return;

    try {
      let workerQuest: WorkerQuest | undefined;
      let subtaskId: string;

      if ("questTag" in task) {
        const found = await QuestUIAdapter.findQuestAndSubtask(
          task.id,
          workerQuests
        );
        if (!found) return;
        workerQuest = found.quest;
        subtaskId = found.subtask.id;
      } else {
        workerQuest = workerQuests.find((q) =>
          q.subtasks.some((st) => st.id === task.id)
        );
        if (!workerQuest) return;
        subtaskId = task.id;
      }

      const session = await sessionService.createSession(
        userId,
        workerQuest.questId,
        subtaskId,
        25
      );

      setActiveSessionId(session.sessionId);

      // Create session object for modal
      const sessionData: FocusSession = {
        questTitle: questTitle || workerQuest.title,
        subtaskName: task.title,
        duration: 25 * 60,
      };

      // Show modal immediately with the session data
      showModal(
        <FocusSessionModal
          session={sessionData}
          onEnd={async () => {
            await endFocusSession();
            hideModal();
          }}
          tasks={tasks}
          sessionService={sessionService}
        />
      );
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#36393f]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2] mx-auto mb-4"></div>
          <p className="text-[#dcddde]">Loading Ascend...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#36393f]">
        <div className="text-center text-[#ed4245]">
          <p>Failed to initialize. Please refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#36393f] text-[#dcddde] overflow-hidden">
      <NavigationSidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      {/* Conditional Middle Panel */}
      {activeNav === "home" && <MiddlePanel userId={userId} />}
      {activeNav === "quests" && (
        <QuestsMiddlePanel
          quests={workerQuests}
          notifications={notifications}
          onQuestSelect={handleQuestSelect}
          onDiscoverySelect={handleDiscoverySelect}
          onNotificationClick={handleNotificationClick}
          onCreateQuestSelect={handleCreateQuestSelect}
          selectedQuestId={selectedQuestId}
          discoveryMode={discoveryMode}
          createQuestMode={createQuestMode}
        />
      )}
      {activeNav === "progress" && (
        <ProgressMiddlePanel
          selectedView={progressView}
          onViewSelect={setProgressView}
          // userId={userId!}
        />
      )}

      {/* Conditional Main Panel */}
      {activeNav === "home" && (
        <MainPanel
          userId={userId}
          tasks={tasks}
          workerQuests={workerQuests}
          selectedQuestId={selectedQuestId}
          onToggleTask={toggleTaskComplete}
          onReorderTasks={reorderTasks}
          onStartFocus={startFocusWithModal}
          onFloatingPlusClick={handleFloatingPlusClick}
          onQuestSelect={handleQuestSelect}
          onAddSubtask={handleAddSubtask}
        />
      )}
      {activeNav === "quests" && (
        <QuestsMainPanel
          quests={workerQuests}
          tasks={tasks}
          selectedQuestId={selectedQuestId}
          discoveryMode={discoveryMode}
          createQuestMode={createQuestMode}
          questComments={questComments}
          publicQuests={publicQuests}
          onStartFocus={startFocusWithModal}
          onJoinQuest={handleJoinQuest}
          onWatchQuest={handleWatchQuest}
          onToggleSubtask={toggleSubtaskComplete}
          onAddComment={handleAddComment}
          onCreateQuest={handleCreateQuest}
          onCancelCreate={handleCancelCreate}
          onAddSubtask={handleAddSubtask}
          onFloatingPlusClick={handleFloatingPlusClick}
          onDeleteQuest={handleDeleteQuest}
          onArchiveQuest={handleArchiveQuest}
          onUpdateQuest={handleUpdateQuest}
        />
      )}
      {activeNav === "progress" && (
        <ProgressMainPanel selectedView={progressView} userId={userId!} />
      )}
    </div>
  );
}
