import { useState, useEffect } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from './ui/button';
import type { FocusSession, Task } from '../App';
import { SessionService } from '../worker';

interface FocusSessionModalProps {
  session: FocusSession;
  onEnd: () => void;
  tasks: Task[];
  sessionService: SessionService;
}

export function FocusSessionModal({ session, onEnd, tasks, sessionService }: FocusSessionModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(session.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Start session when modal opens
  useEffect(() => {
    const startSession = async () => {
      try {
        // Create session in worker
        const newSession = await sessionService.createSession(
          'test-user-001', // Replace with actual user ID
          'quest-001', // Replace with actual quest ID
          tasks.find(t => t.title === session.subtaskName)?.id || null,
          25 // duration in minutes
        );
        setCurrentSessionId(newSession.sessionId);
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    };

    startSession();
  }, []);

  useEffect(() => {
    if (isPaused || !currentSessionId) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, currentSessionId]);

  const handlePause = async () => {
    if (!currentSessionId) return;
    
    try {
      await sessionService.pauseSession(currentSessionId);
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  const handleResume = async () => {
    if (!currentSessionId) return;
    
    try {
      await sessionService.resumeSession(currentSessionId);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const handleSessionComplete = async () => {
    if (!currentSessionId) return;
    
    try {
      const actualMinutes = Math.ceil((session.duration - timeRemaining) / 60);
      const result = await sessionService.completeSession(
        currentSessionId,
        actualMinutes,
        'Session completed successfully'
      );
      
      // Show XP notification (you can implement this)
      console.log(`+${result.xpAwarded} XP earned! Quality: ${result.qualityScore}`);
      
      if (result.levelUp && typeof result.levelUp === 'object') {
        console.log(`Level Up! Now level ${result.levelUp.newLevel}`);
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
    } finally {
      onEnd();
    }
  };

  const handleAbandon = async () => {
    if (!currentSessionId) return;
    
    try {
      await sessionService.abandonSession(currentSessionId);
    } catch (error) {
      console.error('Failed to abandon session:', error);
    } finally {
      onEnd();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((session.duration - timeRemaining) / session.duration) * 100;

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
                stroke="#57F287"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 112}`}
                strokeDashoffset={`${2 * Math.PI * 112 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-white">{formatTime(timeRemaining)}</div>
                <div className="text-sm text-[#b9bbbe] mt-2">
                  {isPaused ? 'Paused' : 'Focus Time'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={isPaused ? handleResume : handlePause}
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
          <Button
            onClick={handleAbandon}
            variant="outline"
            className="bg-transparent border-[#ed4245] text-[#ed4245] hover:bg-[#ed4245] hover:text-white px-6"
          >
            <Square className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </div>

        {/* Today's Mini Task List */}
        <div className="bg-[#202225] rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">Today's Tasks</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 text-sm ${task.completed ? 'opacity-50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${task.completed ? 'bg-[#57F287]' : 'bg-[#4f545c]'}`} />
                <span className={`text-[#dcddde] ${task.completed ? 'line-through' : ''}`}>
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
