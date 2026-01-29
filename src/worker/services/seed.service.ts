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
      // await this.createTestQuests(user.userId);
      
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
      totalLevel: 0, // 12,
      experiencePoints: 0, // 5420,
      isPublic: true,
      joinDate: new Date().toISOString(), // new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
      specializationTrack: 'Architect',
      grade: 'Bronze',
      rankPoints: 0, // 1250,
      
      inventory: [],
       /*[
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
      ],*/
      
      equippedArtifacts: {
        weapon: null,
        armor: null,
        accessory: null // 'artifact-001'
      },
      
      activeBuffs: [
        // {
        //   buffId: 'buff-streak-7',
        //   name: '7-Day Streak',
        //   source: 'streak',
        //   effect: { xpBonus: 0.05 },
        //   multiplier: 1.05,
        //   expiresAt: null
        // }
      ],
      
      activeDebuffs: [],
      
      agentProfile: {
        motivationalStyle: 'neutral',
        preferredDifficulty: 'medium',
        trustLevel: 75
      },
      
      streakData: {
        currentStreak: 0, // 7,
        longestStreak: 0, // 14,
        lastActivityDate: new Date().toISOString().split('T')[0],
        streakStartDate: new Date().toISOString().split('T')[0], // new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      },
      
      consistencyScore: 0, // 78,
      achievements: [] // 'first_quest', 'week_streak', 'level_10']
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
      // Quest 1: Network Automation & Security
      {
        questId: 'quest_a857ac64-2680-4c2d-828e-bf6bb53fd667',
        ownerId: userId,
        title: 'Network Automation & Security',
        description: 'This quest will make me employable as a network automation and security engineer',
        type: 'Quest',
        isDungeon: false,
        isPublic: false,
        tags: ['Career', 'Engineering', 'Study'],
        hidden: false,
        behavior: 'progressive',
        priority: 'A',
        color: '#5C677D',

        difficulty: {
          userAssigned: 'Hard',
          gmValidated: 'Hard',
          isLocked: true,
          validatedAt: '2026-01-25T10:02:16.886Z',
          xpPerPomodoro: 150
        },

        schedule: {
          frequency: 'Daily',
          targetCompletionsPerCycle: 1,
          pomodoroDurationMin: 15,
          breakDurationMin: 5,
          preferredTimeSlots: []
        },

        subtasks: [
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_1769335319321_0',
            title: 'Advanced orchestration and professional practices',
            estimatePomodoros: 5,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_0',
            title: 'Policy enforcement and compliance automation',
            estimatePomodoros: 1,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_1',
            title: 'Threat detection and automated response orchestration',
            estimatePomodoros: 5,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_2',
            title: 'Automated vulnerability management and patching',
            estimatePomodoros: 3,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_3',
            title: 'Orchestration and automation workflow',
            estimatePomodoros: 5,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_4',
            title: 'Network automation and security context',
            estimatePomodoros: 4,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_a857ac64-2680-4c2d-828e-bf6bb53fd667_1769396076210',
            title: 'Setup lab',
            estimatePomodoros: 1,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          }
        ],

        watchers: [],
        members: [],
        isTrackAligned: false,
        dueDate: '2026-04-26',
        isCompleted: false,
        completedAt: null,

        activeBuffs: [],

        gamification: {
          currentLevel: 1,
          currentExp: 203,
          expToNextLevel: 750
        },

        progressHistory: [
          {
            date: '2026-01-25',
            completions: 0,
            expEarned: 0,
            timeSpentMin: 0,
            isMilestone: true,
            sessionsCompleted: 0
          }
        ],

        tracking: {
          totalTrackedTime: 56,
          velocity: 0,
          averageSessionQuality: 0,
          lastSessionAt: '2026-01-26T01:37:46.149Z'
        },

        registeredAt: null,
        createdAt: '2026-01-25T09:55:55.806Z',
        updatedAt: '2026-01-26T02:54:36.210Z',
        validationStatus: 'validated'
      },

      // Quest 2: GRE Study
      {
        questId: 'quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81',
        ownerId: userId,
        title: 'GRE study',
        description: 'This quest will help me earn a high score in the GRE exams',
        type: 'Quest',
        isDungeon: false,
        isPublic: true,
        tags: ['Study', 'Career'],
        hidden: false,
        behavior: 'progressive',
        priority: 'A',
        color: '#E96075',

        difficulty: {
          userAssigned: 'Hard',
          gmValidated: 'Medium',
          isLocked: true,
          validatedAt: '2026-01-25T09:51:05.364Z',
          xpPerPomodoro: 80
        },

        schedule: {
          frequency: 'Custom',
          targetCompletionsPerCycle: 5,
          pomodoroDurationMin: 25,
          breakDurationMin: 5,
          preferredTimeSlots: [],
          customDays: [1, 2, 4, 5, 6]
        },

        subtasks: [
          {
            id: 'subtask_quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81_1769334652066_0',
            title: 'Practice in test conditions',
            estimatePomodoros: 5,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81_0',
            title: 'Essay writing',
            estimatePomodoros: 10,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81_1',
            title: 'Vocabulary practice',
            estimatePomodoros: 10,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81_2',
            title: 'Quantitative study',
            estimatePomodoros: 10,
            isComplete: false,
            completedAt: null,
            revisionCount: 0
          },
          {
            id: 'subtask_quest_c7090a5e-9ec5-458b-a0e0-b19cb42ecf81_3',
            title: 'Verbal study',
            estimatePomodoros: 9,
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
          currentLevel: 1,
          currentExp: 24,
          expToNextLevel: 750
        },

        progressHistory: [
          {
            date: '2026-01-26',
            completions: 0,
            expEarned: 0,
            timeSpentMin: 0,
            isMilestone: true,
            sessionsCompleted: 0
          }
        ],

        tracking: {
          totalTrackedTime: 13,
          velocity: 0,
          averageSessionQuality: 0,
          lastSessionAt: '2026-01-26T03:17:27.576Z'
        },

        registeredAt: null,
        createdAt: '2026-01-25T09:46:12.326Z',
        updatedAt: '2026-01-26T03:20:01.341Z',
        validationStatus: 'validated'
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
      // 7 days ago - 2 sessions (Network Automation & Security)
      { daysAgo: 7, count: 2, questId: quests[0].questId, xp: 150 },
      // 6 days ago - 1 session (GRE study)
      { daysAgo: 6, count: 1, questId: quests[1].questId, xp: 80 },
      // 5 days ago - 3 sessions (Network Automation & Security)
      { daysAgo: 5, count: 3, questId: quests[0].questId, xp: 150 },
      // 4 days ago - 2 sessions (GRE study)
      { daysAgo: 4, count: 2, questId: quests[1].questId, xp: 80 },
      // 3 days ago - 1 session (Network Automation & Security)
      { daysAgo: 3, count: 1, questId: quests[0].questId, xp: 150 },
      // 2 days ago - 4 sessions (GRE study - high activity)
      { daysAgo: 2, count: 4, questId: quests[1].questId, xp: 80 },
      // 1 day ago - 2 sessions (Network Automation & Security)
      { daysAgo: 1, count: 2, questId: quests[0].questId, xp: 150 },
      // Today - 1 session (GRE study)
      { daysAgo: 0, count: 1, questId: quests[1].questId, xp: 80 }
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