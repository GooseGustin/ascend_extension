/**
 * QuestService
 * Handles quest CRUD operations, watching, joining
 */

import { getDB } from '../db/indexed-db';
import type { Quest } from '../models/Quest';
import type { GoalComment } from '../models/GoalComment';
import { AuthService } from './auth.service';

export class QuestService {
  private db = getDB();
  private authService = new AuthService();

  /**
   * Get all user's quests
   */
  async getUserQuests(userId: string): Promise<Quest[]> {
    const quests = await this.db.quests
      .where('ownerId')
      .equals(userId)
      .toArray();
    console.log('in quest service, leaving getuserquests', quests)
    return quests; 
  }

  /**
   * Get single quest by ID
   */
  async getQuest(questId: string): Promise<Quest | undefined> {
    return await this.db.quests.get(questId);
  }

  /**
   * Get watched quests (where user is in watchers array)
   */
  async getWatchedQuests(userId: string): Promise<Quest[]> {
    const allQuests = await this.db.quests.toArray();
    console.log('in quest service, leaving getwatchedquests', allQuests)
    return allQuests.filter(q => q.watchers.includes(userId));
  }

  /**
   * Toggle watch status on a quest
   */
  async toggleWatch(userId: string, questId: string): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error('Quest not found');

    const isWatching = quest.watchers.includes(userId);
    
    if (isWatching) {
      // Remove from watchers
      quest.watchers = quest.watchers.filter(id => id !== userId);
    } else {
      // Add to watchers
      quest.watchers.push(userId);
    }

    await this.db.quests.update(questId, quest);
    
    // Queue for sync
    await this.db.queueSync({
      operation: 'update',
      collection: 'quests',
      documentId: questId,
      data: quest,
      priority: 6
    });

    return quest;
  }

  /**
   * Get comments for a quest
   */
  async getQuestComments(questId: string): Promise<GoalComment[]> {
    console.log('getting quest comments')
    const comments = await this.db.comments
      .where('questId')
      .equals(questId)
      .sortBy('timestamp');
    console.log('leaving get quest comments', comments); 
    return comments;
  }

  /**
   * Add comment to quest
   */
  async addComment(
    questId: string,
    userId: string,
    username: string,
    text: string,
    type: 'encouragement' | 'question' | 'suggestion' = 'encouragement'
  ): Promise<GoalComment> {
    const comment: GoalComment = {
      commentId: crypto.randomUUID(),
      questId,
      userId,
      username,
      text,
      type,
      timestamp: new Date().toISOString(),
      editedAt: null,
      reactions: []
    };

    await this.db.comments.add(comment);
    
    // Queue for sync
    await this.db.queueSync({
      operation: 'create',
      collection: 'comments',
      documentId: comment.commentId,
      data: comment,
      priority: 6
    });

    return comment;
  }

  /**
   * Get public/discoverable quests
   */
  async getPublicQuests(limit: number = 20): Promise<Quest[]> {
    return await this.db.quests
      .where('isPublic')
      .equals(1)
      .limit(limit)
      .toArray();
  }

  /**
   * Join a guild/dungeon quest
   */
  async joinQuest(userId: string, questId: string): Promise<Quest> {
    const quest = await this.db.quests.get(questId);
    if (!quest) throw new Error('Quest not found');

    if (!quest.members.includes(userId)) {
      quest.members.push(userId);
    }

    await this.db.quests.update(questId, quest);
    
    await this.db.queueSync({
      operation: 'update',
      collection: 'quests',
      documentId: questId,
      data: quest,
      priority: 7
    });

    return quest;
  }

  /**
 * Create a new quest with full configuration
 */
async createQuest(questData: {
  title: string;
  description: string;
  type: 'Quest' | 'DungeonQuest' | 'TodoQuest';
  difficulty: 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Epic';
  priority: 'A' | 'B' | 'C';
  isPublic: boolean;
  dueDate?: string;
  tags: string[];
  schedule: {
    frequency: 'Daily' | 'Weekly' | 'Custom';
    customDays?: number[];
    pomodoroDurationMin: number;
    breakDurationMin: number;
  };
  subtasks: Array<{
    title: string;
    estimatePomodoros: number;
  }>;
  icon?: string;
}): Promise<Quest> {
  const userId = await this.authService.getCurrentUserId();
  
  // Calculate XP per pomodoro based on difficulty
  const xpPerPomodoro = this.getXpForDifficulty(questData.difficulty);
  
  // Generate quest ID
  const questId = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create subtasks with proper IDs
  const subtasks = questData.subtasks
    .filter(st => st.title.trim())
    .map((st, index) => ({
      id: `subtask_${questId}_${index}`,
      title: st.title.trim(),
      estimatePomodoros: st.estimatePomodoros,
      isComplete: false,
      completedAt: null,
      revisionCount: 0
    }));
  
  // Determine quest type flags
  const isDungeon = questData.type === 'DungeonQuest';
  const isTodoQuest = questData.type === 'TodoQuest';
  
  // Create the quest object
  const quest: Quest = {
    questId,
    ownerId: userId,
    title: questData.title,
    description: questData.description,
    type: questData.type,
    isDungeon,
    isPublic: questData.isPublic,
    tags: questData.tags,
    hidden: false,
    priority: questData.priority,
    
    difficulty: {
      userAssigned: isTodoQuest ? 'Trivial' : questData.difficulty,
      gmValidated: null,
      isLocked: false,
      validatedAt: null,
      xpPerPomodoro: isTodoQuest ? 50 : xpPerPomodoro
    },
    
    schedule: {
      frequency: questData.schedule.frequency,
      targetCompletionsPerCycle: questData.schedule.frequency === 'Daily' ? 1 : 7,
      pomodoroDurationMin: questData.schedule.pomodoroDurationMin,
      breakDurationMin: questData.schedule.breakDurationMin,
      preferredTimeSlots: [],
      customDays: questData.schedule.customDays
    },
    
    subtasks,
    
    watchers: [],
    members: isDungeon ? [userId] : [],
    isTrackAligned: false, // Will be calculated based on specialization
    dueDate: questData.dueDate || null,
    isCompleted: false,
    completedAt: null,
    
    activeBuffs: [],
    
    gamification: {
      currentLevel: 1,
      currentExp: 0,
      expToNextLevel: 500
    },
    
    progressHistory: [],
    
    tracking: {
      totalTrackedTime: 0,
      velocity: 0,
      averageSessionQuality: 0,
      lastSessionAt: null
    },
    
    registeredAt: null, // Will be set when GM validates
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Check track alignment
  const userProfile = await this.db.users.get(userId);
  if (userProfile) {
    quest.isTrackAligned = this.isQuestAlignedWithTrack(
      quest,
      userProfile.specializationTrack
    );
  }
  
  // Save to database
  await this.db.quests.add(quest);
  
  // Create sync operation
  await this.db.queueSync({
    operation: 'create',
    collection: 'quests',
    documentId: questId,
    data: quest
  });
  
  return quest;
}

/**
 * Get XP per pomodoro based on difficulty
 */
private getXpForDifficulty(difficulty: string): number {
  const xpMap = {
    'Trivial': 50,
    'Easy': 100,
    'Medium': 200,
    'Hard': 300,
    'Epic': 500
  };
  return xpMap[difficulty as keyof typeof xpMap] || 100;
}

/**
 * Check if quest aligns with user's specialization track
 */
private isQuestAlignedWithTrack(
  quest: Quest,
  track: 'Architect' | 'Scholar' | 'Vanguard'
): boolean {
  // Simple heuristic based on tags
  const trackKeywords = {
    Architect: ['build', 'design', 'create', 'develop', 'code', 'system'],
    Scholar: ['learn', 'study', 'research', 'read', 'analyze', 'understand'],
    Vanguard: ['lead', 'manage', 'organize', 'plan', 'coordinate', 'execute']
  };
  
  const keywords = trackKeywords[track];
  const questText = `${quest.title} ${quest.description} ${quest.tags.join(' ')}`.toLowerCase();
  
  return keywords.some(keyword => questText.includes(keyword));
}

/**
 * Add a subtask to an existing quest
 */
async addSubtask(
  questId: string,
  subtaskData: {
    title: string;
    estimatePomodoros?: number;
  }
): Promise<Quest> {
  const quest = await this.db.quests.get(questId);
  if (!quest) throw new Error('Quest not found');
  
  const newSubtask = {
    id: `subtask_${questId}_${Date.now()}`,
    title: subtaskData.title.trim(),
    estimatePomodoros: subtaskData.estimatePomodoros || 1,
    isComplete: false,
    completedAt: null,
    revisionCount: 0
  };
  
  quest.subtasks.push(newSubtask);
  quest.updatedAt = new Date().toISOString();
  
  await this.db.quests.put(quest);
  
  // Sync
  await this.db.queueSync({
    operation: 'update',
    collection: 'quests',
    documentId: questId,
    data: { subtasks: quest.subtasks }
  });
  
  return quest;
}
}