/**
 * SeedService
 * Creates test data for development
 * Runs once on first load, prevented by localStorage flag
 */

import { getDB } from '../db/indexed-db';
import type { UserProfile } from '../models/UserProfile';
import type { Quest } from '../models/Quest';

const QUEST_COLORS = [
  "#4F8EF7", "#5CC8FF", "#3FA9D9", "#6ED3CF", "#7A85FF",
  "#4CB944", "#67D28B", "#A2E05A",
  "#FFB86B", "#FF9F6E", "#EFBF8C",
  "#FF6E6E", "#FF8CA3", "#E96075",
  "#A779E9", "#C59FFF", "#9A6AFF",
  "#2F4858", "#3D5A80", "#5C677D"
];


export class SeedService {
  private db = getDB();
  private readonly SEED_FLAG_KEY = 'ascend_seeded';
  private readonly TEST_USER_ID = 'test-user-001';

  /**
   * Check if database has been seeded
   */
  async isSeeded(): Promise<boolean> {
    // Check localStorage flag
    const flag = localStorage.getItem(this.SEED_FLAG_KEY);
    if (flag === 'true') return true;

    // Double-check: verify test user exists in DB
    const user = await this.db.users.get(this.TEST_USER_ID);
    if (user) {
      localStorage.setItem(this.SEED_FLAG_KEY, 'true');
      return true;
    }

    return false;
  }

  /**
   * Seed database with test data
   */
  async seedDatabase(): Promise<string> {
    const alreadySeeded = await this.isSeeded();
    if (alreadySeeded) {
      console.log('Database already seeded, skipping...');
      return this.TEST_USER_ID;
    }

    console.log('Seeding database with test data...');

    try {
      // Create test user
      const user = await this.createTestUser();
      
      // Create test quests
      await this.createTestQuests(user.userId);
      
      // Mark as seeded
      localStorage.setItem(this.SEED_FLAG_KEY, 'true');
      
      console.log('✅ Database seeded successfully');
      return user.userId;
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Create test user profile
   */
  private async createTestUser(): Promise<UserProfile> {
    const user: UserProfile = {
      userId: this.TEST_USER_ID,
      username: 'TestWarrior',
      totalLevel: 12,
      experiencePoints: 5420,
      isPublic: true,
      joinDate: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
      specializationTrack: 'Architect',
      grade: 'Silver II',
      rankPoints: 1250,
      
      inventory: [
        {
          itemId: 'artifact-001',
          name: 'Ring of Consistent Focus',
          type: 'Artifact',
          effect: '+3 minutes to Pomodoro duration',
          rarity: 'Rare',
          usesRemaining: null,
          durability: null,
          slotType: 'Accessory',
          isEquipped: true,
          acquiredAt: new Date(Date.now() - 15 * 86400000).toISOString()
        },
        {
          itemId: 'rune-001',
          name: 'Rune of Temporal Acceleration',
          type: 'Rune',
          effect: '×2 XP multiplier',
          rarity: 'Epic',
          usesRemaining: 3,
          durability: null,
          slotType: null,
          isEquipped: false,
          acquiredAt: new Date(Date.now() - 7 * 86400000).toISOString()
        }
      ],
      
      equippedArtifacts: {
        weapon: null,
        armor: null,
        accessory: 'artifact-001'
      },
      
      activeBuffs: [
        {
          buffId: 'buff-streak-7',
          name: '7-Day Streak',
          source: 'streak',
          effect: { xpBonus: 0.05 },
          multiplier: 1.05,
          expiresAt: null
        }
      ],
      
      activeDebuffs: [],
      
      agentProfile: {
        motivationalStyle: 'neutral',
        preferredDifficulty: 'medium',
        trustLevel: 75
      },
      
      streakData: {
        currentStreak: 7,
        longestStreak: 14,
        lastActivityDate: new Date().toISOString().split('T')[0],
        streakStartDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      },
      
      consistencyScore: 78,
      achievements: ['first_quest', 'week_streak', 'level_10']
    };

    await this.db.users.add(user);
    console.log('✅ Created test user:', user.username);
    return user;
  }

  /**
   * Create test quests with subtasks
   */
  private async createTestQuests(userId: string): Promise<void> {
    const quests: Quest[] = [
      // Quest 1: Active daily quest
      {
        questId: 'quest-001',
        ownerId: userId,
        title: 'Master React Hooks',
        description: 'Deep dive into advanced React hooks patterns and best practices',
        type: 'Quest',
        isDungeon: false,
        isPublic: true,
        tags: ['react', 'frontend', 'learning'],
        hidden: false,
        priority: 'A',
        color: QUEST_COLORS[Math.floor(Math.random() * QUEST_COLORS.length)],
        
        difficulty: {
          userAssigned: 'Medium',
          gmValidated: 'Medium',
          isLocked: true,
          validatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          xpPerPomodoro: 200
        },
        
        schedule: {
          frequency: 'Daily',
          targetCompletionsPerCycle: 2,
          pomodoroDurationMin: 25,
          breakDurationMin: 5,
          preferredTimeSlots: ['09:00', '14:00']
        },
        
        subtasks: [
          {
            id: 'subtask-001',
            title: 'Study useReducer patterns',
            estimatePomodoros: 3,
            isComplete: true,
            completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            revisionCount: 0
          },
          {
            id: 'subtask-002',
            title: 'Build custom hook for API calls',
            estimatePomodoros: 4,
            isComplete: false,
            completedAt: null,
            revisionCount: 1
          },
          {
            id: 'subtask-003',
            title: 'Implement useContext optimization',
            estimatePomodoros: 3,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          }
        ],
        
        watchers: [],
        members: [],
        isTrackAligned: true,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
        isCompleted: false,
        completedAt: null,
        
        activeBuffs: [],
        
        gamification: {
          currentLevel: 5,
          currentExp: 1200,
          expToNextLevel: 1875
        },
        
        progressHistory: [
          {
            date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
            completions: 2,
            expEarned: 400,
            timeSpentMin: 50,
            isMilestone: false,
            sessionsCompleted: 2
          },
          {
            date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
            completions: 1,
            expEarned: 200,
            timeSpentMin: 25,
            isMilestone: false,
            sessionsCompleted: 1
          }
        ],
        
        tracking: {
          totalTrackedTime: 300, // 5 hours
          velocity: 240, // 1200 XP / 5 hours
          averageSessionQuality: 82,
          lastSessionAt: new Date(Date.now() - 86400000).toISOString()
        },
        
        registeredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        validationStatus: 'validated'
      },

      // Quest 2: Weekly project quest
      {
        questId: 'quest-002',
        ownerId: userId,
        title: 'Build Productivity Dashboard',
        description: 'Create a comprehensive analytics dashboard for the Ascend app',
        type: 'Quest',
        isDungeon: false,
        isPublic: false,
        tags: ['project', 'dashboard', 'analytics'],
        hidden: false,
        priority: 'A',
        color: QUEST_COLORS[Math.floor(Math.random() * QUEST_COLORS.length)],
        
        difficulty: {
          userAssigned: 'Hard',
          gmValidated: null,
          isLocked: false,
          validatedAt: null,
          xpPerPomodoro: 300
        },
        
        schedule: {
          frequency: 'Weekly',
          targetCompletionsPerCycle: 10,
          pomodoroDurationMin: 25,
          breakDurationMin: 5,
          preferredTimeSlots: ['10:00', '15:00', '20:00']
        },
        
        subtasks: [
          {
            id: 'subtask-004',
            title: 'Design dashboard wireframes',
            estimatePomodoros: 2,
            isComplete: true,
            completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            revisionCount: 0
          },
          {
            id: 'subtask-005',
            title: 'Implement heatmap component',
            estimatePomodoros: 5,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask-006',
            title: 'Add velocity chart',
            estimatePomodoros: 4,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask-007',
            title: 'Connect to IndexedDB',
            estimatePomodoros: 3,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          }
        ],
        
        watchers: [],
        members: [],
        isTrackAligned: true,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        isCompleted: false,
        completedAt: null,
        
        activeBuffs: [],
        
        gamification: {
          currentLevel: 2,
          currentExp: 300,
          expToNextLevel: 1125
        },
        
        progressHistory: [
          {
            date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
            completions: 1,
            expEarned: 300,
            timeSpentMin: 50,
            isMilestone: false,
            sessionsCompleted: 2
          }
        ],
        
        tracking: {
          totalTrackedTime: 50,
          velocity: 360, // 300 XP / 0.83 hours
          averageSessionQuality: 88,
          lastSessionAt: new Date(Date.now() - 3 * 86400000).toISOString()
        },
        
        registeredAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(), 
        validationStatus: 'pending'
      },

      // Quest 3: Todo Quest
      {
        questId: 'quest-003',
        ownerId: userId,
        title: 'Daily Admin Tasks',
        description: 'Miscellaneous small tasks and administrative work',
        type: 'TodoQuest',
        isDungeon: false,
        isPublic: false,
        tags: ['admin', 'quick-tasks'],
        hidden: false,
        priority: 'C',
        color: QUEST_COLORS[Math.floor(Math.random() * QUEST_COLORS.length)],
        
        difficulty: {
          userAssigned: 'Trivial',
          gmValidated: 'Trivial',
          isLocked: true,
          validatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          xpPerPomodoro: 50
        },
        
        schedule: {
          frequency: 'Daily',
          targetCompletionsPerCycle: 1,
          pomodoroDurationMin: 25,
          breakDurationMin: 5,
          preferredTimeSlots: ['08:00']
        },
        
        subtasks: [
          {
            id: 'subtask-008',
            title: 'Check and respond to emails',
            estimatePomodoros: 1,
            isComplete: true,
            completedAt: new Date().toISOString(),
            revisionCount: 0
          },
          {
            id: 'subtask-009',
            title: 'Update project documentation',
            estimatePomodoros: 1,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask-010',
            title: 'Review pull requests',
            estimatePomodoros: 1,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          }
        ],
        
        watchers: [],
        members: [],
        isTrackAligned: false,
        dueDate: null,
        isCompleted: false,
        completedAt: null,
        
        activeBuffs: [],
        
        gamification: {
          currentLevel: 8,
          currentExp: 450,
          expToNextLevel: 2531
        },
        
        progressHistory: [],
        
        tracking: {
          totalTrackedTime: 150,
          velocity: 100, // 50 XP flat rate
          averageSessionQuality: 65,
          lastSessionAt: new Date().toISOString()
        },
        
        registeredAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(), 
        validationStatus: 'validated'
      },

      // Quest 4: Overdue quest for testing
      {
        questId: 'quest-004',
        ownerId: userId,
        title: 'Learn TypeScript Advanced Types',
        description: 'Master conditional types, mapped types, and template literal types',
        type: 'Quest',
        isDungeon: false,
        isPublic: true,
        tags: ['typescript', 'learning'],
        hidden: false,
        priority: 'B',
        color: QUEST_COLORS[Math.floor(Math.random() * QUEST_COLORS.length)],
        
        difficulty: {
          userAssigned: 'Medium',
          gmValidated: 'Medium',
          isLocked: true,
          validatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          xpPerPomodoro: 200
        },
        
        schedule: {
          frequency: 'Weekly',
          targetCompletionsPerCycle: 5,
          pomodoroDurationMin: 25,
          breakDurationMin: 5,
          preferredTimeSlots: ['11:00', '16:00']
        },
        
        subtasks: [
          {
            id: 'subtask-011',
            title: 'Study conditional types',
            estimatePomodoros: 3,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask-012',
            title: 'Practice mapped types',
            estimatePomodoros: 3,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          }
        ],
        
        watchers: [],
        members: [],
        isTrackAligned: true,
        dueDate: new Date(Date.now() - 2 * 86400000).toISOString(), // OVERDUE!
        isCompleted: false,
        completedAt: null,
        
        activeBuffs: [],
        
        gamification: {
          currentLevel: 1,
          currentExp: 0,
          expToNextLevel: 750
        },
        
        progressHistory: [],
        
        tracking: {
          totalTrackedTime: 0,
          velocity: 0,
          averageSessionQuality: 0,
          lastSessionAt: null
        },
        
        registeredAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(), 
        validationStatus: 'queued'
      }
    ];

    // Add all quests to database
    for (const quest of quests) {
      await this.db.quests.add(quest);
      console.log(`✅ Created quest: ${quest.title}`);
    }

    // Create some historical sessions for heatmap visualization
    await this.createHistoricalSessions(userId, quests);
  }

  /**
   * Create historical sessions for heatmap data
   */
  private async createHistoricalSessions(userId: string, quests: Quest[]): Promise<void> {
    const sessionsToCreate = [
      // 7 days ago - 2 sessions
      { daysAgo: 7, count: 2, questId: quests[0].questId, xp: 200 },
      // 6 days ago - 1 session
      { daysAgo: 6, count: 1, questId: quests[1].questId, xp: 300 },
      // 5 days ago - 3 sessions
      { daysAgo: 5, count: 3, questId: quests[0].questId, xp: 200 },
      // 4 days ago - 2 sessions
      { daysAgo: 4, count: 2, questId: quests[1].questId, xp: 300 },
      // 3 days ago - 1 session
      { daysAgo: 3, count: 1, questId: quests[2].questId, xp: 50 },
      // 2 days ago - 4 sessions (high activity)
      { daysAgo: 2, count: 4, questId: quests[0].questId, xp: 200 },
      // 1 day ago - 2 sessions
      { daysAgo: 1, count: 2, questId: quests[1].questId, xp: 300 },
      // Today - 1 session
      { daysAgo: 0, count: 1, questId: quests[2].questId, xp: 50 }
    ];

    for (const { daysAgo, count, questId, xp } of sessionsToCreate) {
      for (let i = 0; i < count; i++) {
        const sessionDate = new Date(Date.now() - daysAgo * 86400000);
        
        const session = {
          sessionId: `session-${daysAgo}-${i}-${Date.now()}`,
          userId,
          questId,
          subtaskId: null,
          startTime: new Date(sessionDate.getTime() + i * 3600000).toISOString(), // Spread throughout day
          endTime: new Date(sessionDate.getTime() + i * 3600000 + 1500000).toISOString(), // 25 min later
          plannedDurationMin: 25,
          actualDurationMin: 25,
          status: 'completed' as const,
          pauseEvents: [],
          interruptions: [],
          quality: {
            score: 75 + Math.floor(Math.random() * 20),
            factors: {
              completionRate: 100,
              interruptionPenalty: 0,
              overtimeBonus: 0,
              consistencyBonus: 5
            }
          },
          xpEarned: xp,
          xpMultipliers: [
            { source: 'difficulty' as const, value: 1.0 }
          ],
          notes: null,
          tags: []
        };

        await this.db.sessions.add(session);
      }
    }

    console.log('✅ Created historical sessions for heatmap');
  }

  /**
   * Clear all data and reseed (for testing)
   */
  async reseedDatabase(): Promise<string> {
    console.log('Clearing database...');
    await this.db.clearAll();
    localStorage.removeItem(this.SEED_FLAG_KEY);
    
    console.log('Reseeding database...');
    return await this.seedDatabase();
  }
}