/**
 * SessionService
 * Handles session lifecycle, pause/resume, quality calculation
 */

import { getDB } from '../db/indexed-db';
import type { Session, PauseEvent } from '../models/Session';
import type { UserProfile } from '../models/UserProfile';
import type { Quest } from '../models/Quest';

export class SessionService {
  private db = getDB();

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    questId: string,
    subtaskId: string | null,
    plannedDurationMin: number,
    sessionType: 'pomodoro' | 'deep_focus' = 'pomodoro'
  ): Promise<Session> {
    const session: Session = {
      sessionId: crypto.randomUUID(),
      sessionType,
      userId,
      questId,
      subtaskId,
      startTime: new Date().toISOString(),
      endTime: null,
      // plannedDurationMin,
      actualDurationMin: 0,
      status: 'active',
      pauseEvents: [],
      interruptions: [],
      quality: {
        score: 0,
        factors: {
          completionRate: 0,
          interruptionPenalty: 0,
          overtimeBonus: 0,
          consistencyBonus: 0
        }
      },
      xpEarned: 0,
      xpMultipliers: [],
      deepFocusElapsedSec: 0,
      notes: null,
      tags: []
    };

    await this.db.sessions.add(session);
    
    // Queue for sync (priority 9 - active session)
    await this.db.queueSync({
      operation: 'create',
      collection: 'sessions',
      documentId: session.sessionId,
      data: session,
      priority: 9
    });

    return session;
  }

  /**
   * Create break session (auto-triggered after pomodoro)
   */
  // async createBreakSession(
  //   userId: string,
  //   questId: string,
  //   breakDurationMin: number
  // ): Promise<Session> {
  //   const breakSession: Session = {
  //     sessionId: crypto.randomUUID(),
  //     userId,
  //     questId,
  //     subtaskId: null,
  //     sessionType: 'break', // NEW
  //     startTime: new Date().toISOString(),
  //     endTime: null,
  //     plannedDurationMin: breakDurationMin,
  //     actualDurationMin: 0,
  //     status: 'active',
  //     pauseEvents: [],
  //     interruptions: [],
  //     quality: {
  //       score: 100, // Breaks always get 100 quality
  //       factors: {
  //         completionRate: 100,
  //         interruptionPenalty: 0,
  //         overtimeBonus: 0,
  //         consistencyBonus: 0,
  //       },
  //     },
  //     xpEarned: 0, // Breaks don't earn XP
  //     xpMultipliers: [],
  //     deepFocusElapsedSec: 0,
  //     notes: null,
  //     tags: ['break'],
  //   };

  //   await this.db.sessions.add(breakSession);
  //   await this.db.queueSync({
  //     operation: 'create',
  //     collection: 'sessions',
  //     documentId: breakSession.sessionId,
  //     data: breakSession,
  //     priority: 8,
  //   });

  //   return breakSession;
  // }

  /**
   * Switch session to deep focus mode
   */
  async switchToDeepFocus(sessionId: string): Promise<Session> {
    const session = await this.db.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const elapsed = this.getSessionElapsedSeconds(session);

    // If less than 2 minutes, discard and create new deep focus session
    if (elapsed < 120) {
      await this.db.sessions.delete(sessionId);
      
      const deepFocusSession: Session = {
        sessionId: crypto.randomUUID(),
        userId: session.userId,
        questId: session.questId,
        subtaskId: session.subtaskId,
        sessionType: 'deep_focus',
        startTime: new Date().toISOString(),
        endTime: null,
        plannedDurationMin: 120, // 2 hour cap
        actualDurationMin: 0,
        status: 'active',
        pauseEvents: [],
        interruptions: [],
        quality: {
          score: 0,
          factors: {
            completionRate: 0,
            interruptionPenalty: 0,
            overtimeBonus: 0,
            consistencyBonus: 0,
          },
        },
        xpEarned: 0,
        xpMultipliers: [],
        deepFocusElapsedSec: 0,
        notes: null,
        tags: ['deep_focus'],
      };

      await this.db.sessions.add(deepFocusSession);
      await this.db.queueSync({
        operation: 'create',
        collection: 'sessions',
        documentId: deepFocusSession.sessionId,
        data: deepFocusSession,
        priority: 9,
      });

      return deepFocusSession;
    }

    // Otherwise, convert existing session
    session.sessionType = 'deep_focus';
    session.deepFocusElapsedSec = elapsed;
    session.plannedDurationMin = 120; // 2 hour cap from now
    session.startTime = new Date().toISOString(); // Reset start time for deep focus
    session.tags.push('deep_focus');

    await this.db.sessions.update(sessionId, session);
    await this.db.queueSync({
      operation: 'update',
      collection: 'sessions',
      documentId: sessionId,
      data: session,
      priority: 9,
    });

    return session;
  }

  /**
   * Helper: Get elapsed seconds for a session
   */
  private getSessionElapsedSeconds(session: Session): number {
    const start = new Date(session.startTime).getTime();
    const now = Date.now();
    const pauseTime = session.pauseEvents.reduce((sum, p) => sum + p.durationSec, 0);
    return Math.floor((now - start) / 1000) - pauseTime;
  }

  /**
   * Pause active session
   */
  async pauseSession(sessionId: string): Promise<Session> {
    const session = await this.db.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'active') {
      throw new Error('Cannot pause non-active session');
    }

    const pauseEvent: PauseEvent = {
      timestamp: new Date().toISOString(),
      durationSec: 0, // Will be calculated on resume
      reason: null,
      wasAutomatic: false
    };

    session.status = 'paused';
    session.pauseEvents.push(pauseEvent);

    await this.db.sessions.update(sessionId, session);
    
    // Queue for sync (priority 9)
    await this.db.queueSync({
      operation: 'update',
      collection: 'sessions',
      documentId: sessionId,
      data: session,
      priority: 9
    });

    return session;
  }

  /**
   * Resume paused session
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const session = await this.db.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'paused') {
      throw new Error('Cannot resume non-paused session');
    }

    // Calculate pause duration
    const lastPause = session.pauseEvents[session.pauseEvents.length - 1];
    const pauseDuration = Math.floor(
      (Date.now() - new Date(lastPause.timestamp).getTime()) / 1000
    );
    
    lastPause.durationSec = pauseDuration;

    // Add to interruptions
    session.interruptions.push({
      timestamp: lastPause.timestamp,
      durationSec: pauseDuration,
      reason: 'manual_pause'
    });

    session.status = 'active';

    await this.db.sessions.update(sessionId, session);
    
    await this.db.queueSync({
      operation: 'update',
      collection: 'sessions',
      documentId: sessionId,
      data: session,
      priority: 9
    });

    return session;
  }

  /**
   * Complete session and calculate XP
   */
  async completeSession(
    sessionId: string,
    actualDurationMin: number,
    notes?: string
  ): Promise<{
    session: Session;
    xpAwarded: number;
    qualityScore: number;
    levelUp: boolean | { newLevel: number; questId: string };
    shouldStartBreak?: boolean; // NEW
    breakDurationMin?: number; // NEW
  }> {
    const session = await this.db.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const userProfile = await this.db.users.get(session.userId);
    if (!userProfile) throw new Error('User not found');

    const quest = await this.db.quests.get(session.questId);
    if (!quest) throw new Error('Quest not found');

    // Get user settings
    const settingsService = await import('./settings.service').then(m => m.getSettingsService());
    const settings = await settingsService.getUserSettings(session.userId);

    // Calculate quality score
    const qualityScore = this.calculateQuality(
      session,
      actualDurationMin,
      userProfile.streakData.currentStreak
    );

    // Calculate XP based on session type
    let xpEarned = 0;
    
    if (session.sessionType === 'pomodoro') {
      const baseXP = quest.difficulty.xpPerPomodoro;
      const qualityMultiplier = qualityScore >= 50 ? 1.0 : 0.5;
      xpEarned = Math.floor(baseXP * qualityMultiplier);

      // Apply additional multipliers
      if (quest.isTrackAligned) {
        xpEarned = Math.floor(xpEarned * 1.1);
      }
      if (quest.isDungeon) {
        xpEarned = Math.floor(xpEarned * 1.5);
      }
    } else if (session.sessionType === 'deep_focus') {
      // Deep focus XP calculation
      const pomodoroXPRate = quest.difficulty.xpPerPomodoro / 25; // XP per minute
      const deepFocusXPRate = pomodoroXPRate * settings.productivity.deepFocus.xpRateMultiplier;
      xpEarned = Math.floor(actualDurationMin * deepFocusXPRate);

      // Apply dungeon multiplier only (no track alignment for deep focus)
      if (quest.isDungeon) {
        xpEarned = Math.floor(xpEarned * 1.5);
      }
    }
    // Break sessions don't earn XP

    // Update session
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.actualDurationMin = actualDurationMin;
    session.xpEarned = xpEarned;
    session.notes = notes || null;
    session.quality = {
      score: qualityScore,
      factors: {
        completionRate: (actualDurationMin / session.plannedDurationMin) * 100,
        interruptionPenalty: this.calculateInterruptionPenalty(session),
        overtimeBonus: this.calculateOvertimeBonus(session, actualDurationMin),
        consistencyBonus: Math.min(10, (userProfile.streakData.currentStreak / 30) * 10),
      },
    };

    await this.db.sessions.update(sessionId, session);

    // Update quest XP
    quest.gamification.currentExp += xpEarned;
    quest.tracking.totalTrackedTime += actualDurationMin;
    quest.tracking.lastSessionAt = session.endTime;

    // Check for level up
    const levelUp = await this.checkQuestLevelUp(quest);

    await this.db.quests.update(quest.questId, quest);

    // Update user total XP
    userProfile.experiencePoints += xpEarned;
    await this.db.users.update(userProfile.userId, userProfile);

    // Queue for sync
    await this.db.queueSync({
      operation: 'update',
      collection: 'sessions',
      documentId: sessionId,
      data: session,
      priority: 10,
    });

    await this.db.queueSync({
      operation: 'update',
      collection: 'quests',
      documentId: quest.questId,
      data: quest,
      priority: 9,
    });

    // Determine if break should auto-start
    const shouldStartBreak =
      session.sessionType === 'pomodoro' &&
      settings.productivity.pomodoro.autoStartBreak;

    return {
      session,
      xpAwarded: xpEarned,
      qualityScore,
      levelUp,
      shouldStartBreak,
      breakDurationMin: settings.productivity.pomodoro.breakDuration,
    };
  }

  /**
   * Calculate session quality score
   * Formula from SRS Section 6.2
   */
  private calculateQuality(
    session: Session,
    actualDurationMin: number,
    userStreak: number
  ): number {
    const { plannedDurationMin, pauseEvents } = session;

    // Base score from completion rate
    const completionRate = Math.min(actualDurationMin / plannedDurationMin, 1.5);
    let baseScore = 100 * completionRate;

    // Interruption penalty
    const totalPauseTime = pauseEvents.reduce((sum, p) => sum + p.durationSec, 0);
    const pauseTimePercent = (totalPauseTime / (plannedDurationMin * 60)) * 100;
    const interruptionPenalty = Math.min(50, pauseTimePercent);
    
    baseScore -= interruptionPenalty;

    // Overtime bonus
    const overtimePercent = Math.max(0, (actualDurationMin - plannedDurationMin) / plannedDurationMin);
    const overtimeBonus = Math.min(10, overtimePercent * 20);
    
    baseScore += overtimeBonus;

    // Consistency bonus
    const consistencyBonus = Math.min(10, (userStreak / 30) * 10);
    baseScore += consistencyBonus;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  private calculateInterruptionPenalty(session: Session): number {
    const totalPauseTime = session.pauseEvents.reduce((sum, p) => sum + p.durationSec, 0);
    const pauseTimePercent = (totalPauseTime / (session.plannedDurationMin * 60)) * 100;
    return Math.min(50, pauseTimePercent);
  }

  private calculateOvertimeBonus(session: Session, actualDuration: number): number {
    const overtimePercent = Math.max(
      0,
      (actualDuration - session.plannedDurationMin) / session.plannedDurationMin
    );
    return Math.min(10, overtimePercent * 20);
  }

  private async checkQuestLevelUp(quest: Quest): Promise<boolean | { newLevel: number; questId: string }> {
    const { currentLevel, currentExp, expToNextLevel } = quest.gamification;
    
    if (currentExp >= expToNextLevel) {
      const newLevel = currentLevel + 1;
      const remainingExp = currentExp - expToNextLevel;
      
      // Calculate new exp requirement
      const baseExp = 500;
      const newExpToNextLevel = Math.floor(baseExp * Math.pow(1.5, newLevel));
      
      quest.gamification.currentLevel = newLevel;
      quest.gamification.currentExp = remainingExp;
      quest.gamification.expToNextLevel = newExpToNextLevel;
      
      // Log to progress history
      quest.progressHistory.push({
        date: new Date().toISOString().split('T')[0],
        completions: 0,
        expEarned: 0,
        timeSpentMin: 0,
        isMilestone: true,
        sessionsCompleted: 0
      });
      
      return { newLevel, questId: quest.questId };
    }
    
    return false;
  }

  /**
   * Abandon session (stopped early)
   */
  // async abandonSession(sessionId: string): Promise<Session> {
  //   const session = await this.db.sessions.get(sessionId);
  //   if (!session) throw new Error('Session not found');

  //   session.status = 'abandoned';
  //   session.endTime = new Date().toISOString();
  //   session.xpEarned = 0; // No XP for abandoned sessions

  //   await this.db.sessions.update(sessionId, session);
    
  //   await this.db.queueSync({
  //     operation: 'update',
  //     collection: 'sessions',
  //     documentId: sessionId,
  //     data: session,
  //     priority: 7
  //   });

  //   return session;
  // }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<Session | null> {
    const sessions = await this.db.sessions
      .where('userId')
      .equals(userId)
      .and(s => s.status === 'active' || s.status === 'paused')
      .toArray();
    
    return sessions[0] || null;
  }
}
