// FILE: src/worker/tests/gm.service.test.ts

// REMOVED: import { jest } from '@jest/globals'; // This caused the "Cannot use import statement outside a module" error.

import { GMService } from '../services/gm/gm.service';
import { RemoteAPI } from '../api/remote-client';
import { AnalyticsService } from '../services/analytics.service';
import { QuestService } from '../services/quest.service';
import { IndexedDb } from '../db/indexed-db';
import { Quest } from '../models/Quest';
import { SyncOperation } from '../models/SyncOperation';

// --- MOCK SETUP ---

const MOCK_USER_ID = "test_user_123";
const MOCK_QUEST_ID = "test_quest_456";

// Mock Quest data structure
// FIX: Removed the explicit type annotation on the const declaration and type casting,
// as they caused previous syntax errors. The object literal is now complete.
const MOCK_QUEST = {
    questId: MOCK_QUEST_ID,
    ownerId: MOCK_USER_ID,
    title: "Write GM Integration Test",
    description: "Ensure the worker pipeline is robust.",
    type: "Quest",
    isDungeon: false,
    isPublic: false,
    tags: ["test", "gm"],
    color: "#F32114",
    hidden: false,
    priority: "A",
    watchers: [],
    members: [],
    isTrackAligned: false,
    isCompleted: false,
    completedAt: null,
    activeBuffs: [],
    progressHistory: [],
    gamification: { currentLevel: 1, currentExp: 0, expToNextLevel: 500 },
    tracking: { totalTrackedTime: 0, velocity: 0, averageSessionQuality: 0, lastSessionAt: null },
    registeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    timeEstimateHours: 1,
    validationStatus: 'queued',
    gmFeedback: undefined,
    schedule: { 
        frequency: "Daily", 
        pomodoroDurationMin: 25, 
        breakDurationMin: 5, 
        targetCompletionsPerCycle: 1,
        preferredTimeSlots: ["09:00"] 
    },
    subtasks: [],
    difficulty: {
        userAssigned: 'Medium',
        gmValidated: null,
        isLocked: false,
        xpPerPomodoro: 10,
        confidence: 0.0,
        validatedAt: null,
    },
};

// Mock Sync Operation
const MOCK_GM_OP = { // : SyncOperation = {
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
};


// Mock dependencies
// Note: We cast to `unknown as RemoteAPI` to satisfy TypeScript while using jest.fn()
const mockRemoteAPI = {
    validateQuest: jest.fn(),
    isOnline: jest.fn(),
}; // as unknown as RemoteAPI;

const mockAnalyticsService = {
    generateAgentState: jest.fn(),
}; // as unknown as AnalyticsService;

const mockQuestService = {
    getQuest: jest.fn(),
    saveQuest: jest.fn(),
}; // as unknown as QuestService;

const mockDb = {
    getPendingSyncOps: jest.fn(),
    removeSyncOp: jest.fn(),
}; // as unknown as IndexedDb;

// Spy on GMService local methods
// let gmService: GMService;
// let spyRunLocal: jest.SpyInstance;


// --- TEST SUITE ---
describe('GMService Integration Test: Queue Processor', () => {

    beforeEach(() => {
        let gmService = new GMService(mockRemoteAPI, mockAnalyticsService, mockQuestService, mockDb);
        let spyRunLocal = jest.spyOn(gmService, 'runValidationPipelineLocal');

        jest.clearAllMocks();
        
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
        
        const savedQuestCall = mockQuestService.saveQuest.mock.calls[0][0];
        expect(savedQuestCall.difficulty.gmValidated).toBe('Hard');
        expect(savedQuestCall.difficulty.isLocked).toBe(true);
        expect(savedQuestCall.gmFeedback.reasoning).toBe('Remote check passed.');
    });


    // --- TEST CASE 2: OFFLINE PATH (Remote Failure/Fallback) ---
    it('should fall back to local validation when remote API fails or is offline', async () => {
        // Arrange
        mockRemoteAPI.isOnline.mockReturnValue(true); 
        // Force remote failure (triggers catch block and local fallback)
        mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Network error')); 
        
        // Local pipeline mock success
        spyRunLocal.mockImplementation(async () => {
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
        expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
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
        // Simulate remote failure
        mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Server communication error')); 

        // Simulate local failure
        spyRunLocal.mockRejectedValue(new Error('Local logic failed')); 

        // Act
        await gmService.processPendingQueue();

        // Assert
        expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
        expect(spyRunLocal).toHaveBeenCalledTimes(1);
        expect(mockDb.removeSyncOp).not.toHaveBeenCalled(); 
    });
});



// // FILE: src/worker/tests/gm.service.test.ts

// import { jest } from '@jest/globals';
// import { GMService } from '../services/gm/gm.service';
// import { RemoteAPI } from '../api/remote-client';
// import { AnalyticsService } from '../services/analytics.service';
// import { QuestService } from '../services/quest.service';
// import { IndexedDb } from '../db/indexed-db';
// import { SyncOperation } from '../models/SyncOperation';
// import { Quest } from '../models/Quest';

// // --- MOCK SETUP ---

// // Mock data
// const MOCK_USER_ID = "test_user_123";
// const MOCK_QUEST_ID = "test_quest_456";

// // Mock Quest data structure
// // const MOCK_QUEST: Quest = {
// //     questId: MOCK_QUEST_ID,
// //     ownerId: MOCK_USER_ID,
// //     color: "#F32114",
// //     title: "Write GM Integration Test",
// //     description: "Ensure the worker pipeline is robust.",
// //     type: 'Quest',
// //         isDungeon: false,
// //         isPublic: true,
// //         tags: ['react', 'frontend', 'learning'],
// //         hidden: false,
// //         priority: 'A',
        
// //     difficulty: {
// //         userAssigned: 'Medium',
// //         gmValidated: null,
// //         isLocked: false,
// //         xpPerPomodoro: 10,
// //         confidence: 0.0,
// //         validatedAt: null,
// //     },
    
// //         schedule: {
// //           frequency: 'Daily',
// //           targetCompletionsPerCycle: 2,
// //           pomodoroDurationMin: 25,
// //           breakDurationMin: 5,
// //           preferredTimeSlots: ['09:00', '14:00']
// //         },
        
// //         subtasks: [
// //           {
// //             id: 'subtask-001',
// //             title: 'Study useReducer patterns',
// //             estimatePomodoros: 3,
// //             isComplete: true,
// //             completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
// //             revisionCount: 0
// //           },
// //           {
// //             id: 'subtask-002',
// //             title: 'Build custom hook for API calls',
// //             estimatePomodoros: 4,
// //             isComplete: false,
// //             completedAt: null,
// //             revisionCount: 1
// //           },
// //           {
// //             id: 'subtask-003',
// //             title: 'Implement useContext optimization',
// //             estimatePomodoros: 3,
// //             isComplete: false,
// //             completedAt: null,
// //             revisionCount: 0
// //           }
// //         ],
        
// //         watchers: [],
// //         members: [],
// //         isTrackAligned: true,
// //         dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
// //         isCompleted: false,
// //         completedAt: null,
        
// //         activeBuffs: [],
        
// //         gamification: {
// //           currentLevel: 5,
// //           currentExp: 1200,
// //           expToNextLevel: 1875
// //         },
        
// //         progressHistory: [
// //           {
// //             date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
// //             completions: 2,
// //             expEarned: 400,
// //             timeSpentMin: 50,
// //             isMilestone: false,
// //             sessionsCompleted: 2
// //           },
// //           {
// //             date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
// //             completions: 1,
// //             expEarned: 200,
// //             timeSpentMin: 25,
// //             isMilestone: false,
// //             sessionsCompleted: 1
// //           }
// //         ],
        
// //         tracking: {
// //           totalTrackedTime: 300, // 5 hours
// //           velocity: 240, // 1200 XP / 5 hours
// //           averageSessionQuality: 82,
// //           lastSessionAt: new Date(Date.now() - 86400000).toISOString()
// //         },
        
// //         registeredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
// //         createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
// //         updatedAt: new Date(Date.now() - 86400000).toISOString(),
// //         validationStatus: 'validated'
// // } as Quest;


// // Mock Quest data structure
// const MOCK_QUEST = {
//     questId: MOCK_QUEST_ID,
//     ownerId: MOCK_USER_ID,
//     title: "Write GM Integration Test",
//     description: "Ensure the worker pipeline is robust.",
//     type: "Quest", // Added missing required property
//     isDungeon: false, // Added missing required property
//     isPublic: false, // Added missing required property
//     tags: ["test", "gm"], // Added missing required property
//     color: "#F32114",
//     hidden: false, // Added missing required property
//     priority: "A", // Added missing required property
//     watchers: [], // Added missing required property
//     members: [], // Added missing required property
//     isTrackAligned: false, // Added missing required property
//     isCompleted: false, // Added missing required property
//     completedAt: null,
//     activeBuffs: [], // Added missing required property
//     progressHistory: [], // Added missing required property
//     gamification: { currentLevel: 1, currentExp: 0, expToNextLevel: 500 }, // Added missing required property
//     tracking: { totalTrackedTime: 0, velocity: 0, averageSessionQuality: 0, lastSessionAt: null }, // Added missing required property
//     registeredAt: null, // Added missing required property
//     createdAt: new Date().toISOString(), // Added missing required property
//     updatedAt: new Date().toISOString(), // Added missing required property
//     dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
//     timeEstimateHours: 1, // Added missing property
//     validationStatus: 'queued', // Added missing property
//     gmFeedback: undefined, // Use undefined to match GMFeedback | undefined
//     schedule: { 
//         frequency: "Daily", 
//         pomodoroDurationMin: 25, 
//         breakDurationMin: 5, 
//         targetCompletionsPerCycle: 1,
//         preferredTimeSlots: ["09:00"] 
//     }, // Added missing required property
//     subtasks: [], // Added missing required property
    
//     // The difficulty field that caused the initial error:
//     difficulty: {
//         userAssigned: 'Medium',
//         gmValidated: null,
//         isLocked: false,
//         xpPerPomodoro: 10,
//         confidence: 0.0,
//         validatedAt: null,
//     },
// };// as Quest // Casting is fine, but the structure must be complete


// // Mock Sync Operation
// const MOCK_GM_OP = { // : SyncOperation = {
//     id: 'sync_op_1',
//     collection: 'gm_validation',
//     documentId: MOCK_QUEST_ID,
//     userId: MOCK_USER_ID,
//     operation: 'validate',
//     data: {},
//     timestamp: Date.now(),
//     priority: 2,
//     retries: 0,
//     error: null,
// }; // as SyncOperation;


// // Mock dependencies
// const mockRemoteAPI = {
//     validateQuest: jest.fn(),
//     isOnline: jest.fn(),
// }; //  as unknown as RemoteAPI;

// const mockAnalyticsService = {
//     generateAgentState: jest.fn(),
// }; // as unknown as AnalyticsService;

// const mockQuestService = {
//     getQuest: jest.fn(),
//     saveQuest: jest.fn(), // Key function to assert quest update
// }; // as unknown as QuestService;

// const mockDb = {
//     getPendingSyncOps: jest.fn(),
//     removeSyncOp: jest.fn(),
// }; // as unknown as IndexedDb;

// // Spy on GMService local methods
// // let gmService: GMService;
// // let spyRunLocal: jest.SpyInstance;


// // --- TEST SUITE ---
// describe('GMService Integration Test: Queue Processor', () => {

//     beforeEach(() => {
//         // Instantiate GMService with mocks
//         let gmService = new GMService(mockRemoteAPI, mockAnalyticsService, mockQuestService, mockDb);
        
//         // Spy on the local method to verify its execution
//         let spyRunLocal = jest.spyOn(gmService, 'runValidationPipelineLocal'); // as any);

//         // Reset all mocks
//         jest.clearAllMocks();
        
//         // Default mock behaviors
//         mockQuestService.getQuest.mockResolvedValue(MOCK_QUEST);
//         mockDb.getPendingSyncOps.mockResolvedValue([MOCK_GM_OP]);
//         mockAnalyticsService.generateAgentState.mockResolvedValue({
//             weeklyVelocity: 3.2,
//             monthlyConsistency: 0.85,
//             burnoutRisk: 'Low' 
//         });
//     });

//     // --- TEST CASE 1: ONLINE PATH (Remote Success) ---
//     it('should successfully run remote validation and remove op when online', async () => {
//         // Arrange
//         mockRemoteAPI.isOnline.mockReturnValue(true);
//         mockRemoteAPI.validateQuest.mockResolvedValue({
//             status: 'validated',
//             suggestedDifficulty: 'Hard',
//             confidence: 0.98,
//             reasoning: 'Remote check passed.',
//             recommendations: ['Remote Rec. 1'],
//         });

//         // Act
//         await gmService.processPendingQueue();

//         // Assert
//         expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
//         expect(spyRunLocal).not.toHaveBeenCalled();
//         expect(mockDb.removeSyncOp).toHaveBeenCalledWith(MOCK_GM_OP.id);
        
//         // Check if quest was saved with updated status/difficulty
//         const savedQuestCall = mockQuestService.saveQuest.mock.calls[0][0];
//         expect(savedQuestCall.difficulty.gmValidated).toBe('Hard');
//         expect(savedQuestCall.difficulty.isLocked).toBe(true);
//         expect(savedQuestCall.gmFeedback.reasoning).toBe('Remote check passed.');
//     });


//     // --- TEST CASE 2: OFFLINE PATH (Remote Failure/Fallback) ---
//     it('should fall back to local validation when remote API fails or is offline', async () => {
//         // Arrange
//         mockRemoteAPI.isOnline.mockReturnValue(false); // Simulate being offline
        
//         // To cover the catch block when isOnline() returns true but fetch fails:
//         // mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Network error')); 

//         // Local pipeline mock success
//         spyRunLocal.mockImplementation(async () => {
//              // Simulate local validation updating the quest via saveQuest
//              await mockQuestService.saveQuest({ 
//                 ...MOCK_QUEST, 
//                 validationStatus: 'validated',
//                 difficulty: { ...MOCK_QUEST.difficulty, gmValidated: 'Easy', isLocked: true },
//                 gmFeedback: { reasoning: 'Local check passed.', recommendations: [] } 
//              });
//         });

//         // Act
//         await gmService.processPendingQueue();

//         // Assert
//         // We assume RemoteAPI.validateQuest is only called if isOnline() is true.
//         // The processPendingQueue handles the remote call throwing an error,
//         // so we check if the local spy was called.
//         expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1); // It is called, but should immediately throw the offline error internally
//         expect(spyRunLocal).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_QUEST_ID);
//         expect(mockDb.removeSyncOp).toHaveBeenCalledWith(MOCK_GM_OP.id);

//         // Check if quest was saved with local data
//         const savedQuestCall = mockQuestService.saveQuest.mock.calls.find(call => 
//             call[0].gmFeedback && call[0].gmFeedback.reasoning === 'Local check passed.'
//         )[0];
        
//         expect(savedQuestCall.difficulty.gmValidated).toBe('Easy');
//     });

//     // --- TEST CASE 3: LOCAL FAILURE (Leave in queue) ---
//     it('should NOT remove the op from queue if both remote fails and local pipeline fails', async () => {
//         // Arrange
//         mockRemoteAPI.isOnline.mockReturnValue(true);
//         // Simulate remote failure (triggers local fallback)
//         mockRemoteAPI.validateQuest.mockRejectedValue(new Error('Server communication error')); 

//         // Simulate local failure (triggers catch block in GMService)
//         spyRunLocal.mockRejectedValue(new Error('Local logic failed')); 

//         // Act
//         await gmService.processPendingQueue();

//         // Assert
//         expect(mockRemoteAPI.validateQuest).toHaveBeenCalledTimes(1);
//         expect(spyRunLocal).toHaveBeenCalledTimes(1);
//         expect(mockDb.removeSyncOp).not.toHaveBeenCalled(); // Op must stay in queue for next retry
//     });
// });