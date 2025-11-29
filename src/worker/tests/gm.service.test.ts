// FILE: src/worker/tests/gm.service.test.ts

import { jest } from '@jest/globals';
import { GMService } from '../services/gm/gm.service';
import { RemoteAPI } from '../api/remote-client';
import { AnalyticsService } from '../services/analytics.service';
import { QuestService } from '../services/quest.service';
import { IndexedDb } from '../db/indexed-db';
import { SyncOperation } from '../models/SyncOperation';
import { Quest } from '../models/Quest';

// --- MOCK SETUP ---

// Mock data
const MOCK_USER_ID = "test_user_123";
const MOCK_QUEST_ID = "test_quest_456";

// Mock Quest data structure
const MOCK_QUEST: Quest = {
    questId: MOCK_QUEST_ID,
    ownerId: MOCK_USER_ID,
    color: "#F32114",
    title: "Write GM Integration Test",
    description: "Ensure the worker pipeline is robust.",
    type: 'Quest',
        isDungeon: false,
        isPublic: true,
        tags: ['react', 'frontend', 'learning'],
        hidden: false,
        priority: 'A',
        
    difficulty: {
        userAssigned: 'Medium',
        gmValidated: null,
        isLocked: false,
        xpPerPomodoro: 10,
        confidence: 0.0,
        validatedAt: null,
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
} as Quest;

// Mock Sync Operation
const MOCK_GM_OP: SyncOperation = {
    id: 'sync_op_1',
    collection: 'gm_validation',
    documentId: MOCK_QUEST_ID,
    userId: MOCK_USER_ID,
    operation: 'validate',
    data: {},
    timestamp: Date.now(),
    priority: 2,
    retries: 0,
    error: null,
} as SyncOperation;


// Mock dependencies
const mockRemoteAPI = {
    validateQuest: jest.fn(),
    isOnline: jest.fn(),
} as unknown as RemoteAPI;

const mockAnalyticsService = {
    generateAgentState: jest.fn(),
} as unknown as AnalyticsService;

const mockQuestService = {
    getQuest: jest.fn(),
    saveQuest: jest.fn(), // Key function to assert quest update
} as unknown as QuestService;

const mockDb = {
    getPendingSyncOps: jest.fn(),
    removeSyncOp: jest.fn(),
} as unknown as IndexedDb;

// Spy on GMService local methods
let gmService: GMService;
let spyRunLocal: jest.SpyInstance;


// --- TEST SUITE ---
describe('GMService Integration Test: Queue Processor', () => {

    beforeEach(() => {
        // Instantiate GMService with mocks
        gmService = new GMService(mockRemoteAPI, mockAnalyticsService, mockQuestService, mockDb);
        
        // Spy on the local method to verify its execution
        spyRunLocal = jest.spyOn(gmService, 'runValidationPipelineLocal' as any);

        // Reset all mocks
        jest.clearAllMocks();
        
        // Default mock behaviors
        mockQuestService.getQuest.mockResolvedValue(MOCK_QUEST);
        mockDb.getPendingSyncOps.mockResolvedValue([MOCK_GM_OP]);
        mockAnalyticsService.generateAgentState.mockResolvedValue({
            weeklyVelocity: 3.2,
            monthlyConsistency: 0.85,
            burnoutRisk: 'Low' 
        });
    });

    // --- TEST CASE 1: ONLINE PATH (Remote Success) ---
    it('should successfully run remote validation and remove op when online', async () => {
        // Arrange
        mockRemoteAPI.isOnline.mockReturnValue(true);
        mockRemoteAPI.validateQuest.mockResolvedValue({
            status: 'validated',
            suggestedDifficulty: 'Hard',
            confidence: 0.98,
            reasoning: 'Remote check passed.',
            recommendations: ['Remote Rec. 1'],
        });

        // Act
        await gmService.processPendingQueue();

        // Assert
        expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
        expect(spyRunLocal).not.toHaveBeenCalled();
        expect(mockDb.removeSyncOp).toHaveBeenCalledWith(MOCK_GM_OP.id);
        
        // Check if quest was saved with updated status/difficulty
        const savedQuestCall = mockQuestService.saveQuest.mock.calls[0][0];
        expect(savedQuestCall.difficulty.gmValidated).toBe('Hard');
        expect(savedQuestCall.difficulty.isLocked).toBe(true);
        expect(savedQuestCall.gmFeedback.reasoning).toBe('Remote check passed.');
    });


    // --- TEST CASE 2: OFFLINE PATH (Remote Failure/Fallback) ---
    it('should fall back to local validation when remote API fails or is offline', async () => {
        // Arrange
        mockRemoteAPI.isOnline.mockReturnValue(false); // Simulate being offline
        
        // To cover the catch block when isOnline() returns true but fetch fails:
        // mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Network error')); 

        // Local pipeline mock success
        spyRunLocal.mockImplementation(async () => {
             // Simulate local validation updating the quest via saveQuest
             await mockQuestService.saveQuest({ 
                ...MOCK_QUEST, 
                validationStatus: 'validated',
                difficulty: { ...MOCK_QUEST.difficulty, gmValidated: 'Easy', isLocked: true },
                gmFeedback: { reasoning: 'Local check passed.', recommendations: [] } 
             });
        });

        // Act
        await gmService.processPendingQueue();

        // Assert
        // We assume RemoteAPI.validateQuest is only called if isOnline() is true.
        // The processPendingQueue handles the remote call throwing an error,
        // so we check if the local spy was called.
        expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1); // It is called, but should immediately throw the offline error internally
        expect(spyRunLocal).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_QUEST_ID);
        expect(mockDb.removeSyncOp).toHaveBeenCalledWith(MOCK_GM_OP.id);

        // Check if quest was saved with local data
        const savedQuestCall = mockQuestService.saveQuest.mock.calls.find(call => 
            call[0].gmFeedback && call[0].gmFeedback.reasoning === 'Local check passed.'
        )[0];
        
        expect(savedQuestCall.difficulty.gmValidated).toBe('Easy');
    });

    // --- TEST CASE 3: LOCAL FAILURE (Leave in queue) ---
    it('should NOT remove the op from queue if both remote fails and local pipeline fails', async () => {
        // Arrange
        mockRemoteAPI.isOnline.mockReturnValue(true);
        // Simulate remote failure (triggers local fallback)
        mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Server communication error')); 

        // Simulate local failure (triggers catch block in GMService)
        spyRunLocal.mockRejectedValue(new Error('Local logic failed')); 

        // Act
        await gmService.processPendingQueue();

        // Assert
        expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
        expect(spyRunLocal).toHaveBeenCalledTimes(1);
        expect(mockDb.removeSyncOp).not.toHaveBeenCalled(); // Op must stay in queue for next retry
    });
});