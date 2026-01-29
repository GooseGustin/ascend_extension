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
import {
  AuthService,
  QuestService,
  NotificationService,
  SessionService,
  getTaskService,
  QuestUIAdapter,
  getSettingsService,
  getAntiQuestService,
} from "./worker";
import type { Severity } from "./worker/models/Quest";
import type {
  Quest,
  Subtask,
  Quest as WorkerQuest,
} from "./worker/models/Quest";
import type { GoalComment } from "./worker/models/GoalComment";
import type { Notification as WorkerNotification } from "./worker/models/Notification";
import { useModal } from "./context/ModalContext";
import {
  loadHomeTaskOrder,
  loadTaskOrder,
  saveHomeTaskOrder,
  saveTaskOrder,
} from "./worker/utils/task-order-storage";
import questToTasks from "./worker/utils/quest-to-tasks";
import { migrateTaskOrderStorage } from "./worker/utils/migrate-task-orders";
import { initializeTheme, applyAccentColor, applyTheme } from "./worker/utils/theme";
// import ("/worker/worker-debug"); // Load worker in dev mode
// import ("./worker/worker-debug")
import startWorkerLoop from "./worker/worker-debug";

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
const antiQuestService = getAntiQuestService();

export default function App() {
  const [activeNav, setActiveNav] = useState("home");
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [createQuestMode, setCreateQuestMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // AntiQuest state
  const [antiQuests, setAntiQuests] = useState<WorkerQuest[]>([]);
  const [selectedAntiQuestId, setSelectedAntiQuestId] = useState<string | null>(null);
  const [createAntiQuestMode, setCreateAntiQuestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [progressView, setProgressView] = useState("overview");
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<
    'account' | 'notifications' | 'appearance' | 
    'productivity' | 'ai' | 'data' | 'extension' | 
    'about' | 'danger'
    >('account');

  // Worker data
  const [workerQuests, setWorkerQuests] = useState<WorkerQuest[]>([]);
  const [archivedQuests, setArchivedQuests] = useState<WorkerQuest[]>([]);
  const [watchedQuests, setWatchedQuests] = useState<WorkerQuest[]>([]);
  const [publicQuests, setPublicQuests] = useState<WorkerQuest[]>([]);
  const [questComments, setQuestComments] = useState<
    Record<string, GoalComment[]>
  >({});

  // UI data (converted from worker data)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [dataVersion, setDataVersion] = useState(0);

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

  // Initialize worker once on mount
  useEffect(() => {
    console.log("[DEV] Starting worker loop once");
    startWorkerLoop().catch(e => {
      console.error("FATAL: Error starting worker:", e);
    });
    // Worker loop runs continuously via setInterval inside startWorkerLoop
    // No need to call it repeatedly from here
  }, []);

  useEffect(() => {
    initializeTheme();
    
    const loadAndApplySettings  = async () => {
      try {
        const settingsService = getSettingsService();
        const userId = await authService.getCurrentUserId();
        const userSettings = await settingsService.getUserSettings(userId);
        
        // Apply theme immediately
        applyTheme(userSettings.appearance.theme);
        applyAccentColor(userSettings.appearance.accentColor);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadAndApplySettings ();
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
      loadAntiQuests(uid),
    ]);
  };

  const loadAntiQuests = async (uid: string) => {
    if (!uid) return;
    const userAntiQuests = await antiQuestService.getAntiQuests(uid);
    setAntiQuests(userAntiQuests);
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
    const [myQuests, archived, watched, discovered] = await Promise.all([
      questService.getUserQuests(uid),
      questService.getArchivedQuests(uid),
      questService.getWatchedQuests(uid),
      questService.getPublicQuests(20),
    ]);

    setWorkerQuests(myQuests);
    setArchivedQuests(archived);
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

  const endFocusSession = async (sessionId: string, actualMinutes: number, notes?: string) => {
    console.log('[endFocusSession] Starting session completion:', {
      sessionId,
      activeSessionId,
      userId,
      actualMinutes,
      notes
    });

    if (sessionId && userId) {
      try {
        // Complete the session in worker
        console.log('[endFocusSession] Calling sessionService.completeSession...');
        const result = await sessionService.completeSession(
          sessionId,
          actualMinutes,  // Use actual duration from modal
          notes
        );

        console.log('[endFocusSession] ✅ Session completed!', {
          xpAwarded: result.xpAwarded,
          qualityScore: result.qualityScore,
          levelUp: result.levelUp
        });

        console.log(`+${result.xpAwarded} XP earned!`);
        if (result.levelUp && typeof result.levelUp === 'object') {
          console.log(`Level Up! Quest → Level ${result.levelUp.newLevel}`);
        }

        // FULL REFRESH - reload all data including stats
        console.log('[endFocusSession] Reloading all data...');
        await loadAllData(userId);

        // Verify user profile was updated
        const verifyUser = await authService.getCurrentUser();
        console.log('[endFocusSession] 🔍 User profile after reload:', {
          userId: verifyUser?.userId,
          xp: verifyUser?.experiencePoints,
          level: verifyUser?.totalLevel
        });

        setDataVersion(v => v + 1);  // Trigger MainPanel stats refresh
        console.log('[endFocusSession] ✅ Data reload complete, dataVersion incremented');
      } catch (error) {
        console.error("[endFocusSession] ❌ Failed to end session:", error);
        console.error("[endFocusSession] Error stack:", error);
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
          t.id === subtaskId ? { ...t, completed: !t.completed } : t
        )
      );

      // 3. Update workerQuests (so QuestDetails updates instantly)
      setWorkerQuests((prev) =>
        prev.map((q) => (q.questId === updatedQuest.questId ? updatedQuest : q))
      );

      // Reload quests and tasks to ensure consistency
      await Promise.all([
        loadQuests(userId),
        loadTasks(userId),
      ]);
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
      await Promise.all([
        loadQuests(userId),
        loadTasks(userId),
      ]);
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
    setCreateQuestMode(false);
    setSelectedAntiQuestId(null);
    setCreateAntiQuestMode(false);
  };

  const handleDiscoverySelect = () => {
    setDiscoveryMode(true);
    setSelectedQuestId(null);
    setCreateQuestMode(false);
    setSelectedAntiQuestId(null);
    setCreateAntiQuestMode(false);
  };

  const handleNotificationClick = async (questId: string) => {
    setSelectedQuestId(questId);
    setDiscoveryMode(false);
    setCreateQuestMode(false);
    setSelectedAntiQuestId(null);
    setCreateAntiQuestMode(false);
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
    setSelectedAntiQuestId(null);
    setCreateAntiQuestMode(false);
  };

  const handleFloatingPlusClick = () => {
    setActiveNav("quests");
    handleCreateQuestSelect();
  };

  const handleCreateQuest = async () => {
      if (!userId) return;

      try {
        // Quest is already created by QuestCreationForm via questService
        // Reload quests and tasks to show the new one
        await Promise.all([
          loadQuests(userId),
          loadTasks(userId),
        ]);

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

      // Reload quests and tasks to show new subtask
      await Promise.all([
        loadQuests(userId),
        loadTasks(userId),
      ]);
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  const handleRefresh = async () => {
    if (!userId) {
      console.warn("[REFRESH] No userId found");
      return;
    }

    try {
      console.log("[REFRESH] Starting refresh for userId:", userId);

      // Check user status in database
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        console.error("[REFRESH] ❌ USER NOT FOUND IN DATABASE - userId:", userId);
        console.log("[REFRESH] User may need to be recreated. Check database seeding.");
        return;
      }

      console.log("[REFRESH] ✅ User found:", {
        userId: currentUser.userId,
        username: currentUser.username,
        totalLevel: currentUser.totalLevel,
        experiencePoints: currentUser.experiencePoints,
        streakDays: currentUser.streakData.currentStreak
      });

      await loadAllData(userId);
      setDataVersion(v => v + 1);  // Trigger MainPanel stats refresh
      console.log("[REFRESH] ✅ Refresh completed successfully");
    } catch (error) {
      console.error("[REFRESH] ❌ Failed to refresh data:", error);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!userId) return;

    try {
      await questService.deleteQuest(userId, questId);

      // Remove from state
      setWorkerQuests((prev) => prev.filter((q) => q.questId !== questId));

      // Reload tasks to remove deleted quest's tasks from today's list
      await loadTasks(userId);

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
      const updatedQuest = await questService.archiveQuest(userId, questId);

      if (updatedQuest.hidden) {
        // Quest was archived: move from workerQuests to archivedQuests
        setWorkerQuests((prev) => prev.filter((q) => q.questId !== questId));
        setArchivedQuests((prev) => [...prev, updatedQuest]);
      } else {
        // Quest was unarchived: move from archivedQuests to workerQuests
        setArchivedQuests((prev) => prev.filter((q) => q.questId !== questId));
        setWorkerQuests((prev) => [...prev, updatedQuest]);
      }

      // Reload tasks to update today's tasks list
      await loadTasks(userId);

      // Clear selection after archiving/unarchiving
      setSelectedQuestId(null);
    } catch (error) {
      console.error("Failed to archive quest:", error);
    }
  };

  const handleUpdateQuest = async (questId: string, updates: Partial<Quest>) => {
    if (!userId) return;

    try {
      await questService.updateQuest(questId, updates);

      // Update state and reload tasks
      setWorkerQuests((prev) =>
        prev.map((q) =>
          q.questId === questId ? { ...q, ...updates } : q
        )
      );

      // Reload tasks in case quest title or other task-relevant properties changed
      await loadTasks(userId);
    } catch (error) {
      console.error("Failed to update quest:", error);
    }
  };

  // ========== AntiQuest Handlers ==========

  const handleAntiQuestSelect = (antiQuestId: string) => {
    setSelectedAntiQuestId(antiQuestId);
    setSelectedQuestId(null);
    setDiscoveryMode(false);
    setCreateQuestMode(false);
    setCreateAntiQuestMode(false);
  };

  const handleCreateAntiQuestSelect = () => {
    setCreateAntiQuestMode(true);
    setDiscoveryMode(false);
    setCreateQuestMode(false);
    setSelectedQuestId(null);
    setSelectedAntiQuestId(null);
  };

  const handleCreateAntiQuest = async (data: {
    title: string;
    description?: string;
    severity: Severity;
    tags?: string[];
  }) => {
    if (!userId) return;

    try {
      const newAntiQuest = await antiQuestService.createAntiQuest(data);
      setAntiQuests((prev) => [...prev, newAntiQuest]);
      setCreateAntiQuestMode(false);
      setSelectedAntiQuestId(newAntiQuest.questId);
    } catch (error) {
      console.error("Failed to create AntiQuest:", error);
    }
  };

  const handleCancelAntiQuestCreate = () => {
    setCreateAntiQuestMode(false);
  };

  const handleLogOccurrence = async (
    antiQuestId: string,
    notes?: string,
    timestamp?: string
  ) => {
    if (!userId) return;

    try {
      const { antiQuest } = await antiQuestService.logOccurrence(
        antiQuestId,
        notes,
        timestamp
      );

      // Update local state
      setAntiQuests((prev) =>
        prev.map((aq) =>
          aq.questId === antiQuestId ? antiQuest : aq
        )
      );

      // Reload user data to reflect XP changes
      await loadAllData(userId);
    } catch (error) {
      console.error("Failed to log occurrence:", error);
      alert(error instanceof Error ? error.message : "Failed to log occurrence");
    }
  };

  const handleDeleteAntiQuest = async (antiQuestId: string) => {
    if (!userId) return;

    try {
      await antiQuestService.deleteAntiQuest(antiQuestId);
      setAntiQuests((prev) => prev.filter((aq) => aq.questId !== antiQuestId));
      setSelectedAntiQuestId(null);
    } catch (error) {
      console.error("Failed to delete AntiQuest:", error);
    }
  };

  const handleUpdateAntiQuest = async (
    antiQuestId: string,
    updates: { title?: string; description?: string; severity?: Severity; tags?: string[] }
  ) => {
    if (!userId) return;

    try {
      const updatedAntiQuest = await antiQuestService.updateAntiQuest(antiQuestId, updates);
      setAntiQuests((prev) =>
        prev.map((aq) => (aq.questId === antiQuestId ? updatedAntiQuest : aq))
      );
    } catch (error) {
      console.error("Failed to update AntiQuest:", error);
      alert(error instanceof Error ? error.message : "Failed to update AntiQuest");
    }
  };

  // ========== End AntiQuest Handlers ==========

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

      // Use quest's custom pomodoro duration (set during quest creation)
      const pomodoroDuration = workerQuest.schedule.pomodoroDurationMin;

      const session = await sessionService.createSession(
        userId,
        workerQuest.questId,
        subtaskId,
        pomodoroDuration
      );

      setActiveSessionId(session.sessionId);

      // Create session object for modal
      const sessionData: FocusSession = {
        questTitle: questTitle || workerQuest.title,
        subtaskName: task.title,
        duration: pomodoroDuration * 60, // Convert min to sec
      };

      // Show modal immediately with the session data
      showModal(
        <FocusSessionModal
          session={sessionData}
          sessionId={session.sessionId}
          onEnd={async (sessionId: string, actualMinutes: number, notes?: string) => {
            await endFocusSession(sessionId, actualMinutes, notes);
            hideModal();
          }}
          tasks={tasks}
          sessionService={sessionService}
          userId={userId}
          quest={workerQuest}
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
          archivedQuests={archivedQuests}
          notifications={notifications}
          onQuestSelect={handleQuestSelect}
          onDiscoverySelect={handleDiscoverySelect}
          onNotificationClick={handleNotificationClick}
          onCreateQuestSelect={handleCreateQuestSelect}
          selectedQuestId={selectedQuestId}
          discoveryMode={discoveryMode}
          createQuestMode={createQuestMode}
          // AntiQuest props
          antiQuests={antiQuests}
          onAntiQuestSelect={handleAntiQuestSelect}
          selectedAntiQuestId={selectedAntiQuestId}
          onCreateAntiQuestSelect={handleCreateAntiQuestSelect}
          createAntiQuestMode={createAntiQuestMode}
        />
      )}
      {activeNav === "progress" && (
        <ProgressMiddlePanel
          selectedView={progressView}
          onViewSelect={setProgressView}
          // userId={userId!}
        />
      )}
      {activeNav === "settings" && (
        <SettingsMiddlePanel
          selectedSection={selectedSettingsSection}
          onSectionSelect={setSelectedSettingsSection}
        />
      )}

      {/* Conditional Main Panel */}
      {activeNav === "home" && (
        <MainPanel
          userId={userId}
          tasks={tasks}
          workerQuests={workerQuests}
          dataVersion={dataVersion}
          // selectedQuestId={selectedQuestId}
          onToggleTask={toggleTaskComplete}
          onReorderTasks={reorderTasks}
          onStartFocus={startFocusWithModal}
          onFloatingPlusClick={handleFloatingPlusClick}
          onQuestSelect={handleQuestSelect}
          onAddSubtask={handleAddSubtask}
          onRefresh={handleRefresh}
        />
      )}
      {activeNav === "settings" && (
        <SettingsMainPanel selectedSection={selectedSettingsSection} />
      )}
      {activeNav === "quests" && (
        <QuestsMainPanel
          quests={workerQuests}
          archivedQuests={archivedQuests}
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
          // onFloatingPlusClick={handleFloatingPlusClick}
          onDeleteQuest={handleDeleteQuest}
          onArchiveQuest={handleArchiveQuest}
          onUpdateQuest={handleUpdateQuest}
          // AntiQuest props
          antiQuests={antiQuests}
          selectedAntiQuestId={selectedAntiQuestId}
          onLogOccurrence={handleLogOccurrence}
          createAntiQuestMode={createAntiQuestMode}
          onCreateAntiQuest={handleCreateAntiQuest}
          onCancelAntiQuestCreate={handleCancelAntiQuestCreate}
          onDeleteAntiQuest={handleDeleteAntiQuest}
          onUpdateAntiQuest={handleUpdateAntiQuest}
        />
      )}
      {activeNav === "progress" && (
        <ProgressMainPanel selectedView={progressView} userId={userId!} />
      )}
    </div>
  );
}
