import { useState, useEffect, useRef } from 'react';
import { Pause, Play, Square, Zap } from 'lucide-react';
import { Button } from './ui/button';
import type { FocusSession, Task } from '../App';
import { SessionService } from '../worker';
import type { Quest } from '../worker/models/Quest';
import {
  requestNotificationPermission,
  notifySessionEnd,
  notifyBreakEnd,
} from '../worker/utils/session-notifications';

interface FocusSessionModalProps {
  session: FocusSession;
  sessionId: string;  // Add sessionId from parent
  onEnd: (sessionId: string, actualMinutes: number, notes?: string) => void;
  tasks: Task[];
  sessionService: SessionService;
  userId: string;
  quest: Quest;
}

type SessionMode = 'pomodoro' | 'deep_focus' | 'break' | 'session_complete';

export function FocusSessionModal({
  session,
  sessionId,
  onEnd,
  tasks,
  sessionService,
  userId,
  quest,
}: FocusSessionModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(session.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionId);  // Use sessionId from parent
  const [sessionMode, setSessionMode] = useState<SessionMode>('pomodoro');
  const [deepFocusElapsed, setDeepFocusElapsed] = useState(0);
  const [deepFocusMaxSeconds, setDeepFocusMaxSeconds] = useState(7200); // Default 2 hours, will load from settings
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    sessionEndPopup: true,
    breakEndPopup: true,
    soundEnabled: true,
  });

  // Pomodoro settings
  const [pomodoroSettings, setPomodoroSettings] = useState({
    autoStartBreak: true,
    autoStartNext: false,
    breakDuration: 5, // minutes
  });

  // Track if current session has been completed (to avoid double-completion)
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Time-based tracking (instead of tick-based) to persist across window minimize
  const sessionStartTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0);
  const initialDurationRef = useRef<number>(session.duration);

  // Load settings when modal opens
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load user settings for deep focus max duration
        const settingsService = await import('../worker').then(m => m.getSettingsService());
        const userSettings = await settingsService.getUserSettings(userId);
        const deepFocusMaxMin = userSettings.productivity.deepFocus.maxDurationMin;
        setDeepFocusMaxSeconds(deepFocusMaxMin * 60); // Convert min to sec

        // Load notification settings
        setNotificationSettings({
          sessionEndPopup: userSettings.notifications.sessionEndPopup ?? true,
          breakEndPopup: userSettings.notifications.breakEndPopup ?? true,
          soundEnabled: userSettings.notifications.soundEnabled ?? true,
        });

        // Load pomodoro settings
        setPomodoroSettings({
          autoStartBreak: userSettings.productivity.pomodoro.autoStartBreak ?? true,
          autoStartNext: userSettings.productivity.pomodoro.autoStartNext ?? false,
          breakDuration: userSettings.productivity.pomodoro.breakDuration ?? 5,
        });

        // Request notification permission if popups are enabled
        if (userSettings.notifications.sessionEndPopup || userSettings.notifications.breakEndPopup) {
          await requestNotificationPermission();
        }

        // Initialize timer start time
        sessionStartTimeRef.current = Date.now();
        totalPausedTimeRef.current = 0;

        console.log('[FocusSessionModal] Session started with ID:', sessionId);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Timer logic - TIME-BASED instead of tick-based (persists across window minimize)
  useEffect(() => {
    if (isPaused || !currentSessionId) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = Math.floor((now - sessionStartTimeRef.current - totalPausedTimeRef.current) / 1000);

      if (sessionMode === 'pomodoro' || sessionMode === 'break') {
        // Countdown timer - calculate based on elapsed time
        const newTimeRemaining = Math.max(0, initialDurationRef.current - elapsedSinceStart);
        setTimeRemaining(newTimeRemaining);

        if (newTimeRemaining <= 0) {
          handleTimerComplete();
        }
      } else if (sessionMode === 'deep_focus') {
        // Up-counter - based on elapsed time
        const newElapsed = elapsedSinceStart;
        setDeepFocusElapsed(newElapsed);

        // Auto-stop at max duration (from settings)
        if (newElapsed >= deepFocusMaxSeconds) {
          handleDeepFocusCapReached();
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, currentSessionId, sessionMode]);

  const handleTimerComplete = async () => {
    if (sessionMode === 'pomodoro') {
      await handlePomodoroComplete();
    } else if (sessionMode === 'break') {
      await handleBreakComplete();
    }
  };

  const handlePomodoroComplete = async () => {
    if (!currentSessionId) return;

    console.log('Pomodoro timer complete');

    // 1. Complete the current session
    try {
      const actualMinutes = Math.ceil(session.duration / 60); // Full duration completed
      const result = await sessionService.completeSession(
        currentSessionId,
        actualMinutes,
        'Session completed'
      );
      setSessionCompleted(true);
      console.log(`[FocusSessionModal] ✅ Session completed! +${result.xpAwarded} XP`);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }

    // 2. Trigger notification (sound + popup)
    await notifySessionEnd(quest.title, {
      popup: notificationSettings.sessionEndPopup,
      sound: notificationSettings.soundEnabled,
    });

    // 3. Check if auto-start break is enabled
    if (pomodoroSettings.autoStartBreak) {
      // Auto-start break timer - use quest's break duration, fallback to settings
      console.log('Auto-starting break timer...');
      const breakDurationMin = quest.schedule?.breakDurationMin || pomodoroSettings.breakDuration;
      const breakDurationSeconds = breakDurationMin * 60;

      setSessionMode('break');
      setTimeRemaining(breakDurationSeconds);

      // Reset timer tracking for break
      sessionStartTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;
      initialDurationRef.current = breakDurationSeconds;

      setIsPaused(false);
      console.log(`[FocusSessionModal] ✅ Break started for ${breakDurationMin} minutes`);
    } else {
      // Show session complete state and wait for user action
      setSessionMode('session_complete');
      setTimeRemaining(0);
      setIsPaused(true);
      console.log('Pomodoro timer complete - waiting for user action');
    }
  };

  const handleBreakComplete = async () => {
    console.log('Break complete!');

    // Trigger notification first
    await notifyBreakEnd(quest.title, {
      popup: notificationSettings.breakEndPopup,
      sound: notificationSettings.soundEnabled,
    });

    // Check if auto-start next session is enabled
    if (pomodoroSettings.autoStartNext) {
      console.log('Auto-starting next pomodoro session...');
      try {
        // Create a new session for the same quest/subtask
        const subtaskId = tasks.find((t) => t.title === session.subtaskName)?.id || null;
        const newSession = await sessionService.createSession(
          userId,
          quest.questId,
          subtaskId,
          quest.schedule.pomodoroDurationMin,
          'pomodoro'
        );
        console.log('[FocusSessionModal] ✅ New session created:', newSession.sessionId);

        // Reset state for new session
        setCurrentSessionId(newSession.sessionId);
        setSessionMode('pomodoro');
        setSessionCompleted(false);
        const sessionDuration = quest.schedule.pomodoroDurationMin * 60;
        setTimeRemaining(sessionDuration);

        // Reset timer tracking
        sessionStartTimeRef.current = Date.now();
        totalPausedTimeRef.current = 0;
        initialDurationRef.current = sessionDuration;

        setIsPaused(false);
        console.log('[FocusSessionModal] ✅ Auto-started new pomodoro session!');
      } catch (error) {
        console.error('Failed to auto-start new session:', error);
        // Fall back to session_complete state
        setSessionMode('session_complete');
        setTimeRemaining(0);
        setIsPaused(true);
      }
    } else {
      // Set to session_complete mode - keep modal open and wait for user action
      setSessionMode('session_complete');
      setTimeRemaining(0);
      setIsPaused(true);
      console.log('Waiting for user to start new session or close.');
    }
  };

  const handleStartNewSession = async () => {
    try {
      // Complete the current session only if not already completed (e.g., after auto-break)
      if (!sessionCompleted) {
        const actualMinutes = Math.ceil(session.duration / 60); // Full duration
        const notes = 'Session completed';

        console.log('[FocusSessionModal] Completing current session...');
        const result = await sessionService.completeSession(
          currentSessionId,
          actualMinutes,
          notes
        );
        console.log(`[FocusSessionModal] ✅ Session completed! +${result.xpAwarded} XP`);
      } else {
        console.log('[FocusSessionModal] Session already completed, skipping...');
      }

      // Create a new session for the same quest/subtask
      console.log('[FocusSessionModal] Creating new session...');
      const subtaskId = tasks.find((t) => t.title === session.subtaskName)?.id || null;
      const newSession = await sessionService.createSession(
        userId,
        quest.questId,
        subtaskId,
        quest.schedule.pomodoroDurationMin,
        'pomodoro'
      );
      console.log('[FocusSessionModal] ✅ New session created:', newSession.sessionId);

      // Reset state for new session
      setCurrentSessionId(newSession.sessionId);
      setSessionMode('pomodoro');
      setSessionCompleted(false); // Reset completion flag for new session
      const sessionDuration = quest.schedule.pomodoroDurationMin * 60;
      setTimeRemaining(sessionDuration);

      // Reset timer tracking
      sessionStartTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;
      initialDurationRef.current = sessionDuration;

      setIsPaused(false);

      console.log('[FocusSessionModal] ✅ New pomodoro session started!');
    } catch (error) {
      console.error('Failed to start new session:', error);
    }
  };

  const handleDeepFocusCapReached = () => {
    setIsPaused(true);
    alert("You've reached the 2-hour deep focus limit! Click 'End Session' to log your work.");
  };

  const handlePause = async () => {
    if (!currentSessionId) return;
    try {
      await sessionService.pauseSession(currentSessionId);
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  const handleResume = async () => {
    if (!currentSessionId) return;
    try {
      await sessionService.resumeSession(currentSessionId);

      // Track paused duration
      if (pausedAtRef.current !== null) {
        const pauseDuration = Date.now() - pausedAtRef.current;
        totalPausedTimeRef.current += pauseDuration;
        pausedAtRef.current = null;
      }

      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const handleSwitchToDeepFocus = async () => {
    if (!currentSessionId) return;
    try {
      const deepSession = await sessionService.switchToDeepFocus(currentSessionId);
      setCurrentSessionId(deepSession.sessionId);
      setSessionMode('deep_focus');
      setDeepFocusElapsed(deepSession.deepFocusElapsedSec || 0);

      // Reset timer tracking for deep focus mode
      sessionStartTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;

      setIsPaused(false);
    } catch (error) {
      console.error('Failed to switch to deep focus:', error);
    }
  };

  const handleEndSession = async () => {
    if (!currentSessionId) return;
    try {
      // If session already completed (after auto-break), just close the modal
      if (sessionCompleted) {
        console.log('[FocusSessionModal] Session already completed, closing modal');
        onEnd(currentSessionId, 0, 'Session already completed');
        return;
      }

      let actualMinutes = 0;

      if (sessionMode === 'deep_focus') {
        actualMinutes = Math.ceil(deepFocusElapsed / 60);
      } else {
        actualMinutes = Math.ceil((session.duration - timeRemaining) / 60);
      }

      const notes = sessionMode === 'deep_focus'
        ? 'Deep focus session completed'
        : 'Session ended early';

      console.log('[FocusSessionModal] Calling onEnd with sessionId:', currentSessionId);

      // Call parent to handle session completion - PASS SESSION ID
      onEnd(currentSessionId, actualMinutes, notes);
    } catch (error) {
      console.error('Failed to end session:', error);
      onEnd(currentSessionId, 0, 'Error ending session');
    }
  };

  // const handleAbandon = async () => {
  //   if (!currentSessionId) return;
  //   try {
  //     await sessionService.abandonSession(currentSessionId);
  //   } catch (error) {
  //     console.error('Failed to abandon session:', error);
  //   } finally {
  //     onEnd();
  //   }
  // };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (sessionMode === 'deep_focus') {
      return (deepFocusElapsed / deepFocusMaxSeconds) * 100; // Progress toward max cap (from settings)
    }
    return ((session.duration - timeRemaining) / session.duration) * 100;
  };

  const getModeLabel = () => {
    if (sessionMode === 'session_complete') return 'Session Complete!';
    if (sessionMode === 'break') return 'Break Time';
    if (sessionMode === 'deep_focus') return 'Deep Focus';
    return 'Focus Time';
  };

  const getTimerDisplay = () => {
    if (sessionMode === 'deep_focus') {
      return formatTime(deepFocusElapsed);
    }
    return formatTime(timeRemaining);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[#2f3136] rounded-lg p-8 w-full max-w-2xl mx-4 shadow-2xl">
        {/* Quest Tag */}
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-1 rounded bg-[#5865F2] text-white text-sm">
            {session.questTitle}
          </span>
        </div>

        {/* Subtask Name */}
        <h2 className="text-center text-2xl text-white mb-8">
          {session.subtaskName}
        </h2>

        {/* Circular Progress Timer */}
        <div className="flex justify-center mb-8">
          <div className="relative w-64 h-64">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="112"
                stroke="#202225"
                strokeWidth="12"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="112"
                stroke={
                  sessionMode === 'break'
                    ? '#FEE75C'
                    : sessionMode === 'deep_focus'
                    ? '#EB459E'
                    : '#57F287'
                }
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 112}`}
                strokeDashoffset={`${2 * Math.PI * 112 * (1 - getProgress() / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-white">{getTimerDisplay()}</div>
                <div className="text-sm text-[#b9bbbe] mt-2">
                  {isPaused ? 'Paused' : getModeLabel()}
                </div>
                {sessionMode === 'deep_focus' && (
                  <div className="text-xs text-[#72767d] mt-1">
                    Cap: {formatTime(deepFocusMaxSeconds)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          {sessionMode === 'session_complete' ? (
            // Show Start and Close buttons when session is complete
            <>
              <Button
                onClick={handleStartNewSession}
                className="bg-[#57F287] hover:bg-[#4ade80] text-black px-8"
              >
                <Play className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
              <Button
                onClick={handleEndSession}
                // variant="outline"
                className="bg-transparent py-2 border-[#b9bbbe] text-[#b9bbbe] hover:bg-[#b9bbbe] hover:text-black px-8"
              >
                Close
              </Button>
            </>
          ) : (
            // Normal session controls
            <>
              {/* Pause/Resume */}
              <Button
                onClick={isPaused ? handleResume : handlePause}
                disabled={sessionMode === 'deep_focus' && deepFocusElapsed >= deepFocusMaxSeconds}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>

              {/* End Session */}
              <Button
                onClick={handleEndSession}
                variant="outline"
                className="bg-transparent border-[#57F287] text-[#57F287] hover:bg-[#57F287] hover:text-black px-6"
              >
                <Square className="w-4 h-4 mr-2" />
                End Session
              </Button>

              {/* Deep Focus (only show for pomodoro mode) */}
              {sessionMode === 'pomodoro' && (
                <Button
                  onClick={handleSwitchToDeepFocus}
                  className="bg-[#EB459E] hover:bg-[#d63d8f] text-white px-6"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Deep Focus
                </Button>
              )}
            </>
          )}
        </div>

        {/* Today's Mini Task List */}
        <div className="bg-[#202225] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">
            Today's Tasks
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 text-sm ${
                  task.completed ? 'opacity-50' : ''
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.completed ? 'bg-[#57F287]' : 'bg-[#4f545c]'
                  }`}
                />
                <span
                  className={`text-[#dcddde] ${task.completed ? 'line-through' : ''}`}
                >
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

